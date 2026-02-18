/**
 * Rutas para SUPER_ADMIN - Gestión de Organizaciones
 * 
 * Solo SUPER_ADMIN puede acceder a estas rutas
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { requireGlobalRole } = require('../middleware/authz');
const { requireSameOrganizationForUser } = require('../middleware/tenant');
const { prisma } = require('../config/database');
const { success: successResponse, error: errorResponse } = require('../utils/responseHelper');
const { validateRequest } = require('../middleware/validationSchemas');
const { requireFeatureAndEdition } = require('../middleware/featureGate');

const router = express.Router();

// Middleware de autenticación y autorización para todas las rutas
router.use(authenticateToken);
// Gating: SUPER_ADMIN UI requiere edición premium + feature 'super_admin'
router.use(requireFeatureAndEdition('super_admin', 'premium'));
router.use(requireGlobalRole('SUPER_ADMIN'));

/**
 * @route GET /api/superadmin/organizations
 * @desc Obtener todas las organizaciones con conteos
 * @access Private - SUPER_ADMIN only
 */
router.get('/organizations', [
  query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser un número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe ser entre 1 y 100'),
  query('search').optional().isLength({ max: 100 }).withMessage('Búsqueda no puede exceder 100 caracteres'),
  query('isActive').optional().isBoolean().withMessage('isActive debe ser un booleano')
], validateRequest, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } }
      ];
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
              projects: {
                where: {
                  deletedAt: null
                }
              }
            }
          }
        }
      }),
      prisma.organization.count({ where })
    ]);

    const organizationsWithCounts = organizations.map(org => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      isActive: org.isActive,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
      usersCount: org._count.users,
      projectsCount: org._count.projects
    }));

    return successResponse(res, {
      organizations: organizationsWithCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, 'Organizaciones obtenidas exitosamente');
  } catch (error) {
    console.error('Error al obtener organizaciones:', error);
    return errorResponse(res, 'Error al obtener organizaciones', 500);
  }
});

/**
 * @route GET /api/superadmin/organizations/:orgId
 * @desc Obtener detalle de una organización
 * @access Private - SUPER_ADMIN only
 */
router.get('/organizations/:orgId', [
  param('orgId').isInt({ min: 1 }).withMessage('ID de organización inválido')
], validateRequest, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);

    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: {
            users: true,
            projects: {
              where: {
                deletedAt: null
              }
            }
          }
        }
      }
    });

    if (!organization) {
      return errorResponse(res, 'Organización no encontrada', 404);
    }

    return successResponse(res, {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      isActive: organization.isActive,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
      usersCount: organization._count.users,
      projectsCount: organization._count.projects
    }, 'Organización obtenida exitosamente');
  } catch (error) {
    console.error('Error al obtener organización:', error);
    return errorResponse(res, 'Error al obtener organización', 500);
  }
});

/**
 * @route POST /api/superadmin/organizations
 * @desc Crear una nueva organización
 * @access Private - SUPER_ADMIN only
 */
router.post('/organizations', [
  body('name').notEmpty().trim().isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres'),
  body('slug').notEmpty().trim().matches(/^[a-z0-9-]+$/).withMessage('El slug solo puede contener letras minúsculas, números y guiones'),
  body('isActive').optional().isBoolean().withMessage('isActive debe ser un booleano')
], validateRequest, async (req, res) => {
  try {
    const { name, slug, isActive = true } = req.body;

    // Verificar si el slug ya existe
    const existingOrg = await prisma.organization.findUnique({
      where: { slug }
    });

    if (existingOrg) {
      return errorResponse(res, 'El slug ya está en uso', 400);
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        isActive
      }
    });

    return successResponse(res, organization, 'Organización creada exitosamente', 201);
  } catch (error) {
    console.error('Error al crear organización:', error);
    if (error.code === 'P2002') {
      return errorResponse(res, 'El slug ya está en uso', 400);
    }
    return errorResponse(res, 'Error al crear organización', 500);
  }
});

/**
 * @route PATCH /api/superadmin/organizations/:orgId
 * @desc Actualizar una organización
 * @access Private - SUPER_ADMIN only
 */
router.patch('/organizations/:orgId', [
  param('orgId').isInt({ min: 1 }).withMessage('ID de organización inválido'),
  body('name').optional().trim().isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres'),
  body('slug').optional().trim().matches(/^[a-z0-9-]+$/).withMessage('El slug solo puede contener letras minúsculas, números y guiones'),
  body('isActive').optional().isBoolean().withMessage('isActive debe ser un booleano')
], validateRequest, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const { name, slug, isActive } = req.body;

    // Verificar si la organización existe
    const existingOrg = await prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!existingOrg) {
      return errorResponse(res, 'Organización no encontrada', 404);
    }

    // Si se actualiza el slug, verificar que no esté en uso
    if (slug && slug !== existingOrg.slug) {
      const slugExists = await prisma.organization.findUnique({
        where: { slug }
      });

      if (slugExists) {
        return errorResponse(res, 'El slug ya está en uso', 400);
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (isActive !== undefined) updateData.isActive = isActive;

    const organization = await prisma.organization.update({
      where: { id: orgId },
      data: updateData
    });

    return successResponse(res, organization, 'Organización actualizada exitosamente');
  } catch (error) {
    console.error('Error al actualizar organización:', error);
    if (error.code === 'P2002') {
      return errorResponse(res, 'El slug ya está en uso', 400);
    }
    return errorResponse(res, 'Error al actualizar organización', 500);
  }
});

/**
 * @route GET /api/superadmin/organizations/:orgId/users
 * @desc Obtener usuarios de una organización
 * @access Private - SUPER_ADMIN only
 */
router.get('/organizations/:orgId/users', [
  param('orgId').isInt({ min: 1 }).withMessage('ID de organización inválido'),
  query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser un número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe ser entre 1 y 100'),
  query('search').optional().isLength({ max: 100 }).withMessage('Búsqueda no puede exceder 100 caracteres'),
  query('globalRole').optional().isIn(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER']).withMessage('Rol global inválido'),
  query('isActive').optional().isBoolean().withMessage('isActive debe ser un booleano')
], validateRequest, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const globalRole = req.query.globalRole;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

    // Verificar que la organización existe
    const organization = await prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!organization) {
      return errorResponse(res, 'Organización no encontrada', 404);
    }

    const where = { organizationId: orgId };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { username: { contains: search } }
      ];
    }
    if (globalRole) {
      where.globalRole = globalRole;
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          globalRole: true,
          isActive: true,
          avatar: true,
          lastLogin: true,
          createdAt: true
        }
      }),
      prisma.user.count({ where })
    ]);

    return successResponse(res, {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, 'Usuarios obtenidos exitosamente');
  } catch (error) {
    console.error('Error al obtener usuarios de la organización:', error);
    return errorResponse(res, 'Error al obtener usuarios', 500);
  }
});

/**
 * @route GET /api/superadmin/organizations/:orgId/projects
 * @desc Obtener proyectos de una organización (solo lectura)
 * @access Private - SUPER_ADMIN only
 */
router.get('/organizations/:orgId/projects', [
  param('orgId').isInt({ min: 1 }).withMessage('ID de organización inválido'),
  query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser un número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe ser entre 1 y 100'),
  query('search').optional().isLength({ max: 100 }).withMessage('Búsqueda no puede exceder 100 caracteres'),
  query('status').optional().isIn(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).withMessage('Estado inválido')
], validateRequest, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status;

    // Verificar que la organización existe
    const organization = await prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!organization) {
      return errorResponse(res, 'Organización no encontrada', 404);
    }

    const where = {
      organizationId: orgId,
      deletedAt: null
    };
    if (search) {
      where.name = { contains: search };
    }
    if (status) {
      where.status = status;
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.project.count({ where })
    ]);

    return successResponse(res, {
      projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, 'Proyectos obtenidos exitosamente');
  } catch (error) {
    console.error('Error al obtener proyectos de la organización:', error);
    return errorResponse(res, 'Error al obtener proyectos', 500);
  }
});

/**
 * @route POST /api/superadmin/organizations/:orgId/assign-admin
 * @desc Asignar un usuario como ADMIN de la organización
 * @access Private - SUPER_ADMIN only
 */
router.post('/organizations/:orgId/assign-admin', [
  param('orgId').isInt({ min: 1 }).withMessage('ID de organización inválido'),
  body('userId').isInt({ min: 1 }).withMessage('ID de usuario inválido')
], validateRequest, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const userId = parseInt(req.body.userId);

    // Verificar que la organización existe
    const organization = await prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!organization) {
      return errorResponse(res, 'Organización no encontrada', 404);
    }

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    // Actualizar usuario: asignar como ADMIN y mover a la organización
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        globalRole: 'ADMIN',
        organizationId: orgId
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        globalRole: true,
        organizationId: true
      }
    });

    return successResponse(res, updatedUser, 'Usuario asignado como ADMIN de la organización exitosamente');
  } catch (error) {
    console.error('Error al asignar ADMIN:', error);
    return errorResponse(res, 'Error al asignar ADMIN', 500);
  }
});

/**
 * @route POST /api/superadmin/users
 * @desc Crear un nuevo usuario (SUPER_ADMIN)
 * @access Private - SUPER_ADMIN only
 */
router.post('/users', [
  body('email').isEmail().withMessage('Email inválido'),
  body('name').notEmpty().trim().isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('username').optional().trim().isLength({ min: 3, max: 50 }).withMessage('El username debe tener entre 3 y 50 caracteres'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('globalRole').isIn(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER']).withMessage('Rol global inválido'),
  body('organizationId').isInt({ min: 1 }).withMessage('ID de organización inválido'),
  body('isActive').optional().isBoolean().withMessage('isActive debe ser un booleano')
], validateRequest, async (req, res) => {
  try {
    const { email, name, username, password, globalRole, organizationId, isActive = true } = req.body;

    // Verificar que la organización existe
    const organization = await prisma.organization.findUnique({
      where: { id: parseInt(organizationId) }
    });

    if (!organization) {
      return errorResponse(res, 'Organización no encontrada', 404);
    }

    // Verificar que el email no esté en uso
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return errorResponse(res, 'El email ya está en uso', 400);
    }

    // Verificar que el username no esté en uso (si se proporciona)
    if (username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username }
      });

      if (existingUsername) {
        return errorResponse(res, 'El username ya está en uso', 400);
      }
    }

    // Hash de la contraseña
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        email,
        name,
        username: username || null,
        password: hashedPassword,
        globalRole,
        organizationId: parseInt(organizationId),
        isActive
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        globalRole: true,
        isActive: true,
        organizationId: true,
        createdAt: true
      }
    });

    return successResponse(res, { user }, 'Usuario creado exitosamente', 201);
  } catch (error) {
    console.error('Error al crear usuario:', error);
    if (error.code === 'P2002') {
      return errorResponse(res, 'El email o username ya está en uso', 400);
    }
    return errorResponse(res, 'Error al crear usuario', 500);
  }
});

/**
 * @route POST /api/superadmin/users/:userId/move-org
 * @desc Mover un usuario a otra organización
 * @access Private - SUPER_ADMIN only
 */
router.post('/users/:userId/move-org', [
  param('userId').isInt({ min: 1 }).withMessage('ID de usuario inválido'),
  body('organizationId').isInt({ min: 1 }).withMessage('ID de organización inválido')
], validateRequest, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const organizationId = parseInt(req.body.organizationId);

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        projectMemberships: {
          where: {
            leftAt: null
          },
          include: {
            project: {
              select: {
                id: true,
                name: true,
                organizationId: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    // Verificar que la organización destino existe
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) {
      return errorResponse(res, 'Organización no encontrada', 404);
    }

    // Verificar si el usuario tiene memberships en proyectos de otras organizaciones
    const conflictingMemberships = user.projectMemberships.filter(
      membership => membership.project.organizationId !== organizationId
    );

    if (conflictingMemberships.length > 0) {
      return errorResponse(
        res,
        'No se puede mover el usuario',
        400,
        {
          message: 'El usuario es miembro de proyectos de otras organizaciones',
          conflicts: conflictingMemberships.map(m => ({
            projectId: m.project.id,
            projectName: m.project.name,
            organizationId: m.project.organizationId
          }))
        }
      );
    }

    // Mover usuario a la nueva organización
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        organizationId: organizationId
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        globalRole: true,
        organizationId: true
      }
    });

    return successResponse(res, updatedUser, 'Usuario movido a la organización exitosamente');
  } catch (error) {
    console.error('Error al mover usuario:', error);
    return errorResponse(res, 'Error al mover usuario', 500);
  }
});

module.exports = router;

