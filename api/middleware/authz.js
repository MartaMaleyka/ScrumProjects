const { prisma } = require('../config/database');
const { success: successResponse, error: errorResponse } = require('../utils/responseHelper');

/**
 * Middleware para verificar roles globales
 * @param {...string} allowedRoles - Roles permitidos (ADMIN, MANAGER, USER)
 */
const requireGlobalRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.globalRole) {
        return errorResponse(res, 'No autenticado', 401);
      }

      if (!allowedRoles.includes(req.user.globalRole)) {
        return errorResponse(
          res,
          'Permiso denegado',
          403,
          `Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`
        );
      }

      next();
    } catch (error) {
      console.error('Error en requireGlobalRole:', error);
      return errorResponse(res, 'Error al verificar rol', 500);
    }
  };
};

/**
 * Middleware para verificar acceso a un proyecto
 * Permite si:
 * - Es ADMIN o MANAGER (acceso total)
 * - Es miembro del proyecto (ProjectMember con leftAt = null)
 * @param {string} projectIdParam - Nombre del parámetro que contiene el projectId (default: 'id')
 */
const requireProjectAccess = (projectIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.userId) {
        return errorResponse(res, 'No autenticado', 401);
      }

      // Intentar obtener projectId desde diferentes fuentes
      let projectId = parseInt(req.params[projectIdParam] || req.body.projectId || req.query.projectId);

      // Si no se encuentra directamente, intentar desde epicId o userStoryId
      if (!projectId || isNaN(projectId)) {
        const epicId = parseInt(req.params.epicId || req.body.epicId || req.query.epicId);
        const userStoryId = parseInt(req.params.userStoryId || req.body.userStoryId || req.query.userStoryId);

        if (epicId && !isNaN(epicId)) {
          const epic = await prisma.epic.findUnique({
            where: { id: epicId },
            select: { projectId: true }
          });
          if (epic) {
            projectId = epic.projectId;
          }
        } else if (userStoryId && !isNaN(userStoryId)) {
          const userStory = await prisma.userStory.findUnique({
            where: { id: userStoryId },
            include: {
              epic: {
                select: { projectId: true }
              }
            }
          });
          if (userStory && userStory.epic) {
            projectId = userStory.epic.projectId;
          }
        }
      }

      if (!projectId || isNaN(projectId)) {
        return errorResponse(res, 'ID de proyecto inválido', 400);
      }

      // SUPER_ADMIN, ADMIN y MANAGER tienen acceso total (pero con tenant guard)
      if (req.user.globalRole === 'SUPER_ADMIN' || req.user.globalRole === 'ADMIN' || req.user.globalRole === 'MANAGER') {
        // Verificar que el proyecto existe y no está eliminado
        // SUPER_ADMIN puede ver proyectos de todas las orgs, otros solo de su org
        const whereClause = req.user.globalRole === 'SUPER_ADMIN'
          ? { id: projectId, deletedAt: null }
          : { id: projectId, organizationId: req.user.organizationId, deletedAt: null };

        const project = await prisma.project.findFirst({
          where: whereClause
        });

        if (!project) {
          return errorResponse(res, 'Proyecto no encontrado', 404);
        }

        req.project = project;
        return next();
      }

      // Para USER, verificar que es miembro del proyecto
      const membership = await prisma.projectMember.findFirst({
        where: {
          userId: req.userId,
          projectId: projectId,
          leftAt: null, // Solo miembros activos
          project: {
            deletedAt: null // Proyecto no eliminado
          }
        },
        include: {
          project: true
        }
      });

      if (!membership || !membership.project) {
        return errorResponse(
          res,
          'Acceso denegado',
          403,
          'No tienes acceso a este proyecto o el proyecto no existe'
        );
      }

      // Agregar información del proyecto y membership al request
      req.project = membership.project;
      req.projectMembership = membership;

      next();
    } catch (error) {
      console.error('❌ Error en requireProjectAccess:', error);
      console.error('Stack:', error.stack);
      console.error('Request params:', req.params);
      console.error('Request body:', req.body);
      console.error('Request query:', req.query);
      console.error('User:', req.user);
      return errorResponse(res, 'Error al verificar acceso al proyecto', 500);
    }
  };
};

/**
 * Middleware para verificar rol específico en un proyecto
 * Permite si:
 * - Es ADMIN (bypass)
 * - Tiene uno de los roles de proyecto especificados
 * @param {...string} allowedProjectRoles - Roles de proyecto permitidos (PRODUCT_OWNER, SCRUM_MASTER, etc.)
 * @param {string} projectIdParam - Nombre del parámetro que contiene el projectId (default: 'id')
 */
const requireProjectRole = (...allowedProjectRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.userId) {
        return errorResponse(res, 'No autenticado', 401);
      }

      // SUPER_ADMIN y ADMIN tienen acceso total
      if (req.user.globalRole === 'SUPER_ADMIN' || req.user.globalRole === 'ADMIN') {
        return next();
      }

      // Si ya tenemos projectMembership del middleware anterior, usarlo
      let membership = req.projectMembership;

      if (!membership) {
        const projectId = parseInt(req.params.id || req.params.projectId || req.body.projectId || req.query.projectId);

        if (!projectId || isNaN(projectId)) {
          return errorResponse(res, 'ID de proyecto inválido', 400);
        }

        membership = await prisma.projectMember.findFirst({
          where: {
            userId: req.userId,
            projectId: projectId,
            leftAt: null
          }
        });
      }

      if (!membership) {
        return errorResponse(
          res,
          'Acceso denegado',
          403,
          'No eres miembro de este proyecto'
        );
      }

      if (!allowedProjectRoles.includes(membership.role)) {
        return errorResponse(
          res,
          'Permiso denegado',
          403,
          `Se requiere uno de los siguientes roles en el proyecto: ${allowedProjectRoles.join(', ')}`
        );
      }

      req.projectMembership = membership;
      next();
    } catch (error) {
      console.error('Error en requireProjectRole:', error);
      return errorResponse(res, 'Error al verificar rol del proyecto', 500);
    }
  };
};

/**
 * Middleware para verificar acceso a editar una tarea
 * Permite si:
 * - Es ADMIN
 * - Es PRODUCT_OWNER o SCRUM_MASTER del proyecto
 * - Es el asignado de la tarea (assigneeId == req.userId) Y es miembro del proyecto
 * @param {string} taskIdParam - Nombre del parámetro que contiene el taskId (default: 'id')
 */
const requireTaskEditAccess = (taskIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.userId) {
        return errorResponse(res, 'No autenticado', 401);
      }

      // SUPER_ADMIN y ADMIN tienen acceso total
      if (req.user.globalRole === 'SUPER_ADMIN' || req.user.globalRole === 'ADMIN') {
        return next();
      }

      const taskId = parseInt(req.params[taskIdParam] || req.body.taskId || req.query.taskId);

      if (!taskId || isNaN(taskId)) {
        return errorResponse(res, 'ID de tarea inválido', 400);
      }

      // Obtener la tarea con su userStory y epic para acceder al projectId
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          userStory: {
            include: {
              epic: {
                include: {
                  project: true
                }
              }
            }
          },
          assignee: true
        }
      });

      if (!task) {
        return errorResponse(res, 'Tarea no encontrada', 404);
      }

      const projectId = task.userStory.epic.project.id;

      // Verificar si es PRODUCT_OWNER o SCRUM_MASTER
      const membership = await prisma.projectMember.findFirst({
        where: {
          userId: req.userId,
          projectId: projectId,
          leftAt: null,
          role: {
            in: ['PRODUCT_OWNER', 'SCRUM_MASTER']
          }
        }
      });

      if (membership) {
        req.task = task;
        req.projectMembership = membership;
        return next();
      }

      // Verificar si es el asignado de la tarea Y es miembro del proyecto
      if (task.assigneeId === req.userId) {
        const devMembership = await prisma.projectMember.findFirst({
          where: {
            userId: req.userId,
            projectId: projectId,
            leftAt: null
          }
        });

        if (devMembership) {
          req.task = task;
          req.projectMembership = devMembership;
          return next();
        }
      }

      return errorResponse(
        res,
        'Permiso denegado',
        403,
        'Solo puedes editar tareas asignadas a ti, o necesitas ser PRODUCT_OWNER/SCRUM_MASTER del proyecto'
      );
    } catch (error) {
      console.error('Error en requireTaskEditAccess:', error);
      return errorResponse(res, 'Error al verificar acceso a la tarea', 500);
    }
  };
};

/**
 * Helper para verificar si un usuario puede gestionar miembros de un proyecto
 * Permite si:
 * - Es ADMIN o MANAGER
 * - Es PRODUCT_OWNER o SCRUM_MASTER del proyecto
 */
const canManageProjectMembers = async (userId, projectId, userGlobalRole) => {
  // SUPER_ADMIN no puede gestionar miembros (solo lectura)
  if (userGlobalRole === 'SUPER_ADMIN') {
    return false;
  }
  
  if (userGlobalRole === 'ADMIN' || userGlobalRole === 'MANAGER') {
    return true;
  }

  const membership = await prisma.projectMember.findFirst({
    where: {
      userId: userId,
      projectId: projectId,
      leftAt: null,
      role: {
        in: ['PRODUCT_OWNER', 'SCRUM_MASTER']
      }
    }
  });

  return !!membership;
};

/**
 * Middleware para verificar si el usuario puede gestionar miembros del proyecto
 * Permite si:
 * - Es ADMIN o MANAGER
 * - Es PRODUCT_OWNER o SCRUM_MASTER del proyecto
 * @param {string} projectIdParam - Nombre del parámetro que contiene el projectId (default: 'projectId')
 */
const requireProjectMemberManagement = (projectIdParam = 'projectId') => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.userId) {
        return errorResponse(res, 'No autenticado', 401);
      }

      const projectId = parseInt(req.params[projectIdParam] || req.body.projectId || req.query.projectId);

      if (!projectId || isNaN(projectId)) {
        return errorResponse(res, 'ID de proyecto inválido', 400);
      }

      // SUPER_ADMIN no puede gestionar miembros
      if (req.user.globalRole === 'SUPER_ADMIN') {
        return errorResponse(
          res,
          'Permiso denegado',
          403,
          'SUPER_ADMIN no puede gestionar miembros de proyectos. Solo puede verlos.'
        );
      }

      const canManage = await canManageProjectMembers(req.userId, projectId, req.user.globalRole);

      if (!canManage) {
        return errorResponse(
          res,
          'Permiso denegado',
          403,
          'Solo ADMIN, MANAGER, PRODUCT_OWNER o SCRUM_MASTER pueden gestionar miembros del proyecto'
        );
      }

      next();
    } catch (error) {
      console.error('Error en requireProjectMemberManagement:', error);
      return errorResponse(res, 'Error al verificar permisos', 500);
    }
  };
};

module.exports = {
  requireGlobalRole,
  requireProjectAccess,
  requireProjectRole,
  requireTaskEditAccess,
  requireProjectMemberManagement,
  canManageProjectMembers
};

