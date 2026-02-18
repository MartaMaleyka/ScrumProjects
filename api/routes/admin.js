const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { requireGlobalRole } = require('../middleware/authz');
const { success: successResponse, error: errorResponse } = require('../utils/responseHelper');
const { validateRequest } = require('../middleware/validationSchemas');

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

/**
 * @route GET /api/admin/users
 * @desc Obtener usuarios
 * @access Private - SUPER_ADMIN (ve todos), ADMIN (solo su org), MANAGER (solo su org)
 */
router.get('/users', [
  query('search').optional().isLength({ max: 100 }).withMessage('Búsqueda no puede exceder 100 caracteres'),
  query('role').optional().isIn(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER']).withMessage('Rol inválido'),
  query('status').optional().isIn(['active', 'inactive']).withMessage('Estado inválido'),
  query('organizationId').optional().isInt({ min: 1 }).withMessage('ID de organización inválido'),
], validateRequest, requireGlobalRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
  try {
    console.log('📥 [admin] GET /users - Usuario:', req.user?.email, 'Rol:', req.user?.globalRole);
    const { search, role, status, organizationId } = req.query;

    const where = {};

    // SUPER_ADMIN puede ver todos los usuarios, otros solo de su organización
    if (req.user.globalRole !== 'SUPER_ADMIN') {
      where.organizationId = req.user.organizationId;
    } else if (organizationId) {
      // SUPER_ADMIN puede filtrar por organización si lo desea
      where.organizationId = parseInt(organizationId);
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { username: { contains: search } },
      ];
    }

    if (role) {
      where.globalRole = role;
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    console.log('🔍 [admin] Consulta Prisma con where:', JSON.stringify(where, null, 2));

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        globalRole: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('✅ [admin] Usuarios encontrados:', users.length);
    return successResponse(res, { users }, 'Usuarios obtenidos exitosamente');
  } catch (error) {
    console.error('❌ [admin] Error en GET /admin/users:', error);
    console.error('Stack:', error.stack);
    return errorResponse(res, error.message || 'Error interno del servidor', 500);
  }
});

/**
 * @route PATCH /api/admin/users/:id/role
 * @desc Cambiar rol de un usuario (solo ADMIN)
 * @access Private - ADMIN
 */
router.patch('/users/:id/role', [
  param('id').isInt({ min: 1 }).withMessage('ID de usuario inválido'),
  body('globalRole').isIn(['ADMIN', 'MANAGER', 'USER']).withMessage('Rol inválido'),
], validateRequest, requireGlobalRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { globalRole } = req.body;
    const userId = parseInt(id);

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    // Actualizar rol
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { globalRole },
      select: {
        id: true,
        email: true,
        name: true,
        globalRole: true,
      },
    });

    return successResponse(res, { user: updatedUser }, 'Rol actualizado exitosamente');
  } catch (error) {
    console.error('Error en PATCH /admin/users/:id/role:', error);
    return errorResponse(res, 'Error interno del servidor', 500);
  }
});

/**
 * @route PATCH /api/admin/users/:id/status
 * @desc Cambiar estado de un usuario (ADMIN/MANAGER)
 * @access Private - ADMIN, MANAGER
 */
router.patch('/users/:id/status', [
  param('id').isInt({ min: 1 }).withMessage('ID de usuario inválido'),
  body('isActive').isBoolean().withMessage('isActive debe ser un booleano'),
], validateRequest, requireGlobalRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const userId = parseInt(id);

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    // Actualizar estado
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });

    return successResponse(res, { user: updatedUser }, 'Estado actualizado exitosamente');
  } catch (error) {
    console.error('Error en PATCH /admin/users/:id/status:', error);
    return errorResponse(res, 'Error interno del servidor', 500);
  }
});

/**
 * @route GET /api/admin/roles
 * @desc Obtener información de roles y permisos
 * @access Private - ADMIN, MANAGER
 */
router.get('/roles', requireGlobalRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const rolesInfo = {
      globalRoles: [
        {
          value: 'ADMIN',
          label: 'Administrador',
          description: 'Acceso total al sistema. Puede gestionar usuarios, proyectos y todas las funcionalidades.',
        },
        {
          value: 'MANAGER',
          label: 'Gerente',
          description: 'Puede crear proyectos y gestionar miembros en cualquier proyecto.',
        },
        {
          value: 'USER',
          label: 'Usuario',
          description: 'Solo puede ver proyectos donde es miembro.',
        },
      ],
      projectRoles: [
        {
          value: 'PRODUCT_OWNER',
          label: 'Product Owner',
          description: 'Responsable del producto. Puede crear y editar épicas, sprints, historias y tareas.',
        },
        {
          value: 'SCRUM_MASTER',
          label: 'Scrum Master',
          description: 'Facilita el proceso Scrum. Puede crear y editar épicas, sprints, historias y tareas.',
        },
        {
          value: 'DEVELOPER',
          label: 'Desarrollador',
          description: 'Puede leer todo y crear/editar tareas asignadas a sí mismo.',
        },
        {
          value: 'TESTER',
          label: 'Tester',
          description: 'Puede leer todo y crear/editar tareas asignadas a sí mismo.',
        },
        {
          value: 'DESIGNER',
          label: 'Diseñador',
          description: 'Puede leer todo y crear/editar tareas asignadas a sí mismo.',
        },
        {
          value: 'INFRAESTRUCTURA',
          label: 'Infraestructura',
          description: 'Puede leer todo y crear/editar tareas asignadas a sí mismo.',
        },
        {
          value: 'REDES',
          label: 'Redes',
          description: 'Puede leer todo y crear/editar tareas asignadas a sí mismo.',
        },
        {
          value: 'SEGURIDAD',
          label: 'Seguridad',
          description: 'Puede leer todo y crear/editar tareas asignadas a sí mismo.',
        },
        {
          value: 'STAKEHOLDER',
          label: 'Stakeholder',
          description: 'Solo lectura dentro del proyecto.',
        },
        {
          value: 'OBSERVER',
          label: 'Observador',
          description: 'Solo lectura dentro del proyecto.',
        },
      ],
      permissions: generatePermissionsMatrix(),
    };

    return successResponse(res, rolesInfo, 'Información de roles obtenida exitosamente');
  } catch (error) {
    console.error('Error en GET /admin/roles:', error);
    return errorResponse(res, 'Error interno del servidor', 500);
  }
});

// Función helper para generar matriz de permisos
function generatePermissionsMatrix() {
  const modules = ['Proyectos', 'Miembros', 'Épicas', 'Sprints', 'Historias', 'Tareas', 'Reportes'];
  const roles = [
    { name: 'ADMIN', read: true, write: true, manage: true },
    { name: 'MANAGER', read: true, write: false, manage: true },
    { name: 'USER', read: false, write: false, manage: false },
    { name: 'PRODUCT_OWNER', read: true, write: true, manage: true },
    { name: 'SCRUM_MASTER', read: true, write: true, manage: true },
    { name: 'DEVELOPER', read: true, write: true, manage: false },
    { name: 'TESTER', read: true, write: true, manage: false },
    { name: 'DESIGNER', read: true, write: true, manage: false },
    { name: 'STAKEHOLDER', read: true, write: false, manage: false },
    { name: 'OBSERVER', read: true, write: false, manage: false },
  ];

  const permissions = [];

  for (const role of roles) {
    for (const module of modules) {
      permissions.push({
        role: role.name,
        module,
        read: role.read,
        write: role.write && (module !== 'Reportes' || role.name === 'ADMIN'),
        manage: role.manage && (module === 'Miembros' || module === 'Proyectos' || role.name === 'ADMIN'),
      });
    }
  }

  return permissions;
}

module.exports = router;

