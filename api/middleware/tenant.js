/**
 * Middleware de Tenant Isolation (Multi-tenant)
 * 
 * Asegura que los usuarios solo puedan acceder a datos de su organización
 * excepto SUPER_ADMIN que puede ver todo (pero no modificar proyectos)
 */

const { prisma } = require('../config/database');
const { error: errorResponse } = require('../utils/responseHelper');

/**
 * Helper para obtener projectId desde diferentes fuentes
 */
function getProjectIdFromRequest(req, projectIdParam = 'projectId') {
  // Intentar desde params, body o query
  let projectId = parseInt(
    req.params[projectIdParam] || 
    req.params.id || 
    req.body.projectId || 
    req.query.projectId
  );

  // Si no se encuentra directamente, intentar desde epicId o userStoryId
  if (!projectId || isNaN(projectId)) {
    const epicId = parseInt(req.params.epicId || req.body.epicId || req.query.epicId);
    const userStoryId = parseInt(req.params.userStoryId || req.body.userStoryId || req.query.userStoryId);
    const taskId = parseInt(req.params.taskId || req.body.taskId || req.query.taskId);

    if (epicId && !isNaN(epicId)) {
      // Se resolverá en el middleware
      return { source: 'epicId', value: epicId };
    } else if (userStoryId && !isNaN(userStoryId)) {
      return { source: 'userStoryId', value: userStoryId };
    } else if (taskId && !isNaN(taskId)) {
      return { source: 'taskId', value: taskId };
    }
  }

  return { source: 'direct', value: projectId };
}

/**
 * Helper para asegurar que un proyecto pertenece al tenant del usuario
 * @param {number} projectId - ID del proyecto
 * @param {number} userOrganizationId - ID de la organización del usuario
 * @param {string} userGlobalRole - Rol global del usuario
 * @returns {Promise<object>} - Proyecto si es válido
 */
async function ensureProjectInTenant(projectId, userOrganizationId, userGlobalRole) {
  // SUPER_ADMIN puede ver proyectos de todas las organizaciones
  if (userGlobalRole === 'SUPER_ADMIN') {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        organizationId: true,
        deletedAt: true
      }
    });

    if (!project) {
      throw new Error('Proyecto no encontrado');
    }

    return project;
  }

  // Otros usuarios solo pueden ver proyectos de su organización
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId: userOrganizationId,
      deletedAt: null
    },
    select: {
      id: true,
      name: true,
      organizationId: true,
      deletedAt: true
    }
  });

  if (!project) {
    throw new Error('Proyecto no encontrado o no pertenece a tu organización');
  }

  return project;
}

/**
 * Middleware para verificar que un proyecto pertenece al tenant del usuario
 * @param {string} projectIdParam - Nombre del parámetro que contiene el projectId (default: 'projectId')
 */
const requireSameOrganizationForProject = (projectIdParam = 'projectId') => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.organizationId) {
        return errorResponse(res, 'No autenticado', 401);
      }

      // Si el parámetro es 'userStoryId', 'epicId' o 'taskId', buscar directamente en params
      let projectIdInfo;
      if (projectIdParam === 'userStoryId') {
        const userStoryId = parseInt(req.params.userStoryId);
        if (userStoryId && !isNaN(userStoryId)) {
          projectIdInfo = { source: 'userStoryId', value: userStoryId };
        } else {
          projectIdInfo = getProjectIdFromRequest(req, projectIdParam);
        }
      } else if (projectIdParam === 'epicId') {
        const epicId = parseInt(req.params.epicId);
        if (epicId && !isNaN(epicId)) {
          projectIdInfo = { source: 'epicId', value: epicId };
        } else {
          projectIdInfo = getProjectIdFromRequest(req, projectIdParam);
        }
      } else if (projectIdParam === 'taskId') {
        // taskId puede venir como req.params.taskId o req.params.id (dependiendo de la ruta)
        const taskId = parseInt(req.params.taskId || req.params.id);
        if (taskId && !isNaN(taskId)) {
          projectIdInfo = { source: 'taskId', value: taskId };
        } else {
          projectIdInfo = getProjectIdFromRequest(req, projectIdParam);
        }
      } else {
        projectIdInfo = getProjectIdFromRequest(req, projectIdParam);
      }
      
      let projectId = projectIdInfo.value;

      // Resolver projectId desde epicId, userStoryId o taskId si es necesario
      if (projectIdInfo.source === 'epicId') {
        const epic = await prisma.epic.findUnique({
          where: { id: projectIdInfo.value },
          select: { 
            projectId: true,
            project: {
              select: {
                id: true,
                organizationId: true,
                deletedAt: true
              }
            }
          }
        });
        if (!epic) {
          return errorResponse(res, 'Épica no encontrada', 404);
        }
        if (!epic.project) {
          return errorResponse(res, 'Proyecto de la épica no encontrado', 404);
        }
        projectId = epic.projectId;
        
        // Verificar que el proyecto no esté eliminado
        if (epic.project.deletedAt) {
          return errorResponse(res, 'El proyecto de esta épica ha sido eliminado', 404);
        }
      } else if (projectIdInfo.source === 'userStoryId') {
        const userStory = await prisma.userStory.findUnique({
          where: { id: projectIdInfo.value },
          include: {
            epic: {
              select: { projectId: true }
            }
          }
        });
        if (!userStory || !userStory.epic) {
          return errorResponse(res, 'Historia de usuario no encontrada', 404);
        }
        projectId = userStory.epic.projectId;
      } else if (projectIdInfo.source === 'taskId') {
        const task = await prisma.task.findUnique({
          where: { id: projectIdInfo.value },
          include: {
            userStory: {
              include: {
                epic: {
                  select: { projectId: true }
                }
              }
            }
          }
        });
        if (!task || !task.userStory || !task.userStory.epic) {
          return errorResponse(res, 'Tarea no encontrada', 404);
        }
        projectId = task.userStory.epic.projectId;
      }

      if (!projectId || isNaN(projectId)) {
        return errorResponse(res, 'ID de proyecto inválido', 400);
      }

      // Verificar tenant
      try {
        const project = await ensureProjectInTenant(
          projectId,
          req.user.organizationId,
          req.user.globalRole
        );

        // Adjuntar proyecto al request
        req.tenantProject = project;
        req.projectId = projectId;

        next();
      } catch (error) {
        if (error.message.includes('no encontrado')) {
          return errorResponse(res, error.message, 404);
        }
        return errorResponse(
          res,
          'Acceso denegado',
          403,
          'No tienes acceso a este proyecto o el proyecto no pertenece a tu organización'
        );
      }
    } catch (error) {
      console.error('❌ Error en requireSameOrganizationForProject:', error);
      return errorResponse(res, 'Error al verificar acceso al proyecto', 500);
    }
  };
};

/**
 * Middleware para verificar que un usuario pertenece al tenant
 * Solo SUPER_ADMIN puede ver/editar usuarios de otras organizaciones
 * @param {string} userIdParam - Nombre del parámetro que contiene el userId (default: 'userId')
 */
const requireSameOrganizationForUser = (userIdParam = 'userId') => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.organizationId) {
        return errorResponse(res, 'No autenticado', 401);
      }

      // SUPER_ADMIN puede ver/editar usuarios de cualquier organización
      if (req.user.globalRole === 'SUPER_ADMIN') {
        return next();
      }

      const userId = parseInt(
        req.params[userIdParam] || 
        req.params.id || 
        req.body.userId || 
        req.query.userId
      );

      if (!userId || isNaN(userId)) {
        return errorResponse(res, 'ID de usuario inválido', 400);
      }

      // ADMIN puede ver/editar usuarios de su organización
      if (req.user.globalRole === 'ADMIN') {
        const targetUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { organizationId: true }
        });

        if (!targetUser) {
          return errorResponse(res, 'Usuario no encontrado', 404);
        }

        if (targetUser.organizationId !== req.user.organizationId) {
          return errorResponse(
            res,
            'Acceso denegado',
            403,
            'Solo puedes gestionar usuarios de tu organización'
          );
        }
      } else {
        // MANAGER y USER no pueden gestionar usuarios
        return errorResponse(
          res,
          'Permiso denegado',
          403,
          'Solo ADMIN puede gestionar usuarios'
        );
      }

      next();
    } catch (error) {
      console.error('❌ Error en requireSameOrganizationForUser:', error);
      return errorResponse(res, 'Error al verificar acceso al usuario', 500);
    }
  };
};

/**
 * Middleware para prevenir que SUPER_ADMIN modifique proyectos
 * SUPER_ADMIN solo puede leer proyectos, no crearlos, editarlos ni eliminarlos
 */
const requireNotSuperAdminForProjectMutations = () => {
  return (req, res, next) => {
    if (req.user && req.user.globalRole === 'SUPER_ADMIN') {
      return errorResponse(
        res,
        'Operación no permitida',
        403,
        'SUPER_ADMIN no puede crear, editar ni eliminar proyectos. Solo puede verlos.'
      );
    }
    next();
  };
};

/**
 * Helper para aplicar filtro de organización en queries
 * @param {number} userOrganizationId - ID de la organización del usuario
 * @param {string} userGlobalRole - Rol global del usuario
 * @returns {object} - Filtro where para Prisma
 */
function getOrganizationFilter(userOrganizationId, userGlobalRole) {
  // SUPER_ADMIN no tiene filtro (puede ver todo)
  if (userGlobalRole === 'SUPER_ADMIN') {
    return {};
  }

  // Otros usuarios solo ven su organización
  return {
    organizationId: userOrganizationId
  };
}

module.exports = {
  requireSameOrganizationForProject,
  requireSameOrganizationForUser,
  requireNotSuperAdminForProjectMutations,
  ensureProjectInTenant,
  getOrganizationFilter,
  getProjectIdFromRequest
};

