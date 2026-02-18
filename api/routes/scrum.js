const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const ScrumController = require('../controllers/scrumController');
const { authenticateToken } = require('../middleware/auth');
const { 
  requireGlobalRole, 
  requireProjectAccess, 
  requireProjectRole,
  requireTaskEditAccess,
  requireProjectMemberManagement
} = require('../middleware/authz');
const {
  requireSameOrganizationForProject,
  requireSameOrganizationForUser,
  requireNotSuperAdminForProjectMutations
} = require('../middleware/tenant');
const { validateRequest } = require('../middleware/validationSchemas');
const ScrumValidation = require('../middleware/scrumValidation');
const ScrumMiddleware = require('../middleware/scrumMiddleware');
const { prisma } = require('../config/database');
const { ResponseHelper } = require('../utils/responseHelper');

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Middleware para deshabilitar caché en todas las respuestas de scrum
router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// ===== VALIDACIONES =====

// Validaciones para proyectos
const projectValidation = [
  body('name')
    .notEmpty()
    .withMessage('El nombre del proyecto es requerido')
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre debe tener entre 3 y 100 caracteres'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres'),
  body('status')
    .optional()
    .isIn(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
    .withMessage('Estado inválido'),
  body('startDate')
    .notEmpty()
    .withMessage('La fecha de inicio es obligatoria')
    .isISO8601()
    .withMessage('Fecha de inicio inválida'),
  body('endDate')
    .customSanitizer(value => {
      // Convertir string vacío en null
      if (value === '' || value === null || value === undefined) {
        return null;
      }
      return value;
    })
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('Fecha de fin inválida')
];

// Validaciones para actualizar proyectos (campos opcionales)
const projectUpdateValidation = [
  body('name')
    .optional()
    .notEmpty()
    .withMessage('El nombre del proyecto no puede estar vacío')
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre debe tener entre 3 y 100 caracteres'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres'),
  body('status')
    .optional()
    .isIn(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
    .withMessage('Estado inválido'),
  body('startDate')
    .customSanitizer(value => {
      // Convertir string vacío en null
      if (value === '' || value === null || value === undefined) {
        return null;
      }
      return value;
    })
    .optional({ nullable: true })
    .custom((value) => {
      // Si es null, es válido (opcional)
      if (value === null || value === undefined) {
        return true;
      }
      // Si tiene valor, debe ser una fecha ISO8601 válida
      const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (typeof value === 'string' && (dateRegex.test(value) || dateOnlyRegex.test(value))) {
        const date = new Date(value);
        return !isNaN(date.getTime());
      }
      return false;
    })
    .withMessage('Fecha de inicio inválida'),
  body('endDate')
    .customSanitizer(value => {
      // Convertir string vacío en null
      if (value === '' || value === null || value === undefined) {
        return null;
      }
      return value;
    })
    .optional({ nullable: true })
    .custom((value) => {
      // Si es null, es válido (opcional)
      if (value === null || value === undefined) {
        return true;
      }
      // Si tiene valor, debe ser una fecha ISO8601 válida
      const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (typeof value === 'string' && (dateRegex.test(value) || dateOnlyRegex.test(value))) {
        const date = new Date(value);
        return !isNaN(date.getTime());
      }
      return false;
    })
    .withMessage('Fecha de fin inválida')
];

const projectIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de proyecto inválido')
];

// Validaciones para sprints
const sprintValidation = [
  body('name')
    .notEmpty()
    .withMessage('El nombre del sprint es requerido')
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre debe tener entre 3 y 100 caracteres'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres'),
  body('projectId')
    .isInt({ min: 1 })
    .withMessage('ID de proyecto inválido'),
  body('startDate')
    .customSanitizer(value => {
      if (value === '' || value === null || value === undefined) {
        return null;
      }
      return value;
    })
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('Fecha de inicio inválida'),
  body('endDate')
    .customSanitizer(value => {
      if (value === '' || value === null || value === undefined) {
        return null;
      }
      return value;
    })
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('Fecha de fin inválida'),
  body('status')
    .optional()
    .isIn(['PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED'])
    .withMessage('Estado inválido')
];

const sprintIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de sprint inválido')
];

// Validaciones para épicas
const epicValidation = [
  body('title')
    .notEmpty()
    .withMessage('El título de la épica es requerido')
    .isLength({ min: 5, max: 200 })
    .withMessage('El título debe tener entre 5 y 200 caracteres'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('La descripción no puede exceder 1000 caracteres'),
  body('projectId')
    .isInt({ min: 1 })
    .withMessage('ID de proyecto inválido'),
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .withMessage('Prioridad inválida'),
  body('status')
    .optional()
    .isIn(['DRAFT', 'READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
    .withMessage('Estado inválido')
];

const epicIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de épica inválido')
];

// Validaciones para historias de usuario
const userStoryValidation = [
  body('title')
    .notEmpty()
    .withMessage('El título de la historia es requerido')
    .isLength({ min: 5, max: 200 })
    .withMessage('El título debe tener entre 5 y 200 caracteres'),
  body('description')
    .optional({ nullable: true, checkFalsy: false })
    .isLength({ max: 1000 })
    .withMessage('La descripción no puede exceder 1000 caracteres'),
  body('epicId')
    .isInt({ min: 1 })
    .withMessage('ID de épica inválido'),
  body('sprintId')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('ID de sprint inválido'),
  body('storyPoints')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1, max: 100 })
    .withMessage('Story points debe ser entre 1 y 100'),
  body('priority')
    .optional({ nullable: true })
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .withMessage('Prioridad inválida'),
  body('status')
    .optional({ nullable: true })
    .isIn(['DRAFT', 'READY', 'IN_PROGRESS', 'TESTING', 'COMPLETED', 'CANCELLED'])
    .withMessage('Estado inválido'),
  body('acceptanceCriteria')
    .optional({ nullable: true, checkFalsy: false })
    .isLength({ max: 2000 })
    .withMessage('Los criterios de aceptación no pueden exceder 2000 caracteres')
];

const userStoryIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de historia inválido')
];

// Validaciones para crear tareas
const taskCreateValidation = [
  body('title')
    .notEmpty()
    .withMessage('El título de la tarea es requerido')
    .isLength({ min: 3, max: 200 })
    .withMessage('El título debe tener entre 3 y 200 caracteres'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('La descripción no puede exceder 1000 caracteres'),
  body('userStoryId')
    .isInt({ min: 1 })
    .withMessage('ID de historia inválido'),
  body('assigneeId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de asignado inválido'),
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .withMessage('Prioridad inválida'),
  body('type')
    .optional()
    .isIn(['DEVELOPMENT', 'TESTING', 'DESIGN', 'DOCUMENTATION', 'BUG_FIX', 'RESEARCH', 'REFACTORING'])
    .withMessage('Tipo inválido'),
  body('status')
    .optional()
    .isIn(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'TESTING', 'COMPLETED', 'CANCELLED'])
    .withMessage('Estado inválido'),
  body('estimatedHours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Horas estimadas debe ser un número positivo')
];

// Validaciones para actualizar tareas
const taskUpdateValidation = [
  body('title')
    .optional()
    .isLength({ min: 3, max: 200 })
    .withMessage('El título debe tener entre 3 y 200 caracteres'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('La descripción no puede exceder 1000 caracteres'),
  body('userStoryId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de historia inválido'),
  body('assigneeId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de asignado inválido'),
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .withMessage('Prioridad inválida'),
  body('type')
    .optional()
    .isIn(['DEVELOPMENT', 'TESTING', 'DESIGN', 'DOCUMENTATION', 'BUG_FIX', 'RESEARCH', 'REFACTORING'])
    .withMessage('Tipo inválido'),
  body('status')
    .optional()
    .isIn(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'TESTING', 'COMPLETED', 'CANCELLED'])
    .withMessage('Estado inválido'),
  body('estimatedHours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Horas estimadas debe ser un número positivo')
];

const taskIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de tarea inválido')
];

// ===== RUTAS DE USUARIOS =====

/**
 * @route GET /api/scrum/users
 * @desc Obtener todos los usuarios activos
 * @access Private
 */
router.get('/users', [
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Límite debe ser entre 1 y 1000'),
  query('isActive').optional().isBoolean().withMessage('isActive debe ser un booleano'),
  query('search').optional().isLength({ max: 100 }).withMessage('Búsqueda no puede exceder 100 caracteres')
], validateRequest, ScrumController.getUsers);

// ===== RUTAS DE PROYECTOS =====

/**
 * @route GET /api/scrum/projects
 * @desc Obtener todos los proyectos con filtros y paginación
 * @access Private
 */
router.get('/projects', [
  query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser un número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe ser entre 1 y 100'),
  query('search').optional().isLength({ max: 100 }).withMessage('Búsqueda no puede exceder 100 caracteres'),
  query('status').optional().isIn(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).withMessage('Estado inválido'),
  query('sortBy').optional().isIn(['name', 'status', 'createdAt', 'startDate', 'endDate']).withMessage('Campo de ordenamiento inválido'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Orden inválido')
], validateRequest, ScrumController.getProjects);

/**
 * @route GET /api/scrum/projects/all
 * @desc Obtener todos los proyectos sin filtros (incluyendo eliminados)
 * @access Private
 */
router.get('/projects/all', validateRequest, ScrumController.getAllProjects);

/**
 * @route GET /api/scrum/projects/:id
 * @desc Obtener un proyecto por ID con todos sus detalles
 * @access Private - ADMIN/MANAGER o miembro del proyecto
 */
router.get('/projects/:id', 
  projectIdValidation, 
  validateRequest,
  requireSameOrganizationForProject('id'),
  requireProjectAccess('id'),
  ScrumController.getProjectById
);

/**
 * @route POST /api/scrum/projects
 * @desc Crear un nuevo proyecto
 * @access Private - ADMIN, MANAGER (SUPER_ADMIN no puede crear)
 */
router.post('/projects', 
  requireGlobalRole('ADMIN', 'MANAGER'),
  requireNotSuperAdminForProjectMutations(),
  projectValidation, 
  validateRequest, 
  ScrumController.createProject
);

/**
 * @route PUT /api/scrum/projects/:id
 * @desc Actualizar un proyecto
 * @access Private - ADMIN/MANAGER o PRODUCT_OWNER/SCRUM_MASTER del proyecto
 */
router.put('/projects/:id', 
  [...projectIdValidation, ...projectUpdateValidation], 
  validateRequest,
  requireSameOrganizationForProject('id'),
  requireNotSuperAdminForProjectMutations(),
  requireProjectAccess('id'),
  requireProjectRole('PRODUCT_OWNER', 'SCRUM_MASTER'),
  ScrumController.updateProject
);

/**
 * @route DELETE /api/scrum/projects/:id
 * @desc Eliminar un proyecto
 * @access Private - ADMIN, MANAGER (SUPER_ADMIN no puede eliminar)
 */
router.delete('/projects/:id', 
  projectIdValidation, 
  validateRequest,
  requireSameOrganizationForProject('id'),
  requireNotSuperAdminForProjectMutations(),
  ScrumController.deleteProject
);

/**
 * @route GET /api/scrum/projects/:projectId/metrics
 * @desc Obtener métricas de un proyecto
 * @access Private
 */
router.get('/projects/:projectId/metrics', [
  param('projectId').isInt({ min: 1 }).withMessage('ID de proyecto inválido'),
  query('startDate').optional().isISO8601().withMessage('Fecha de inicio inválida'),
  query('endDate').optional().isISO8601().withMessage('Fecha de fin inválida')
], validateRequest, requireSameOrganizationForProject('projectId'), ScrumController.getProjectMetrics);

/**
 * @route GET /api/scrum/projects/:projectId/tasks
 * @desc Obtener todas las tareas de un proyecto
 * @access Private
 */
router.get('/projects/:projectId/tasks', [
  param('projectId').isInt({ min: 1 }).withMessage('ID de proyecto inválido'),
  query('status').optional().isIn(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'TESTING', 'COMPLETED', 'CANCELLED']).withMessage('Estado inválido'),
  query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).withMessage('Prioridad inválida'),
  query('type').optional().isIn(['DEVELOPMENT', 'TESTING', 'DESIGN', 'DOCUMENTATION', 'BUG_FIX', 'RESEARCH', 'REFACTORING']).withMessage('Tipo inválido')
], validateRequest, requireSameOrganizationForProject('projectId'), ScrumController.getProjectTasks);

// ===== RUTAS DE MIEMBROS DE PROYECTO =====

/**
 * @route GET /api/scrum/projects/:projectId/members
 * @desc Obtener miembros de un proyecto
 * @access Private - ADMIN/MANAGER o miembro del proyecto
 */
router.get('/projects/:projectId/members', [
  param('projectId').isInt({ min: 1 }).withMessage('ID de proyecto inválido')
], validateRequest, requireSameOrganizationForProject('projectId'), requireProjectAccess('projectId'), ScrumController.getProjectMembers);

/**
 * @route POST /api/scrum/projects/:projectId/members
 * @desc Agregar un miembro a un proyecto
 * @access Private - ADMIN/MANAGER o PRODUCT_OWNER/SCRUM_MASTER del proyecto
 */
router.post('/projects/:projectId/members', [
  param('projectId').isInt({ min: 1 }).withMessage('ID de proyecto inválido'),
  body('userId').isInt({ min: 1 }).withMessage('ID de usuario inválido'),
  body('role').optional().isIn(['PRODUCT_OWNER', 'SCRUM_MASTER', 'DEVELOPER', 'TESTER', 'DESIGNER', 'STAKEHOLDER', 'INFRAESTRUCTURA', 'REDES', 'SEGURIDAD']).withMessage('Rol inválido'),
  body('teamId').optional().isInt({ min: 1 }).withMessage('ID de equipo inválido')
], validateRequest, requireSameOrganizationForProject('projectId'), requireSameOrganizationForUser('userId'), requireProjectMemberManagement('projectId'), ScrumController.addProjectMember);

/**
 * @route PUT /api/scrum/projects/:projectId/members/:memberId
 * @desc Actualizar rol de un miembro del proyecto
 * @access Private - ADMIN/MANAGER o PRODUCT_OWNER/SCRUM_MASTER del proyecto
 */
router.put('/projects/:projectId/members/:memberId', [
  param('projectId').isInt({ min: 1 }).withMessage('ID de proyecto inválido'),
  param('memberId').isInt({ min: 1 }).withMessage('ID de miembro inválido'),
  body('role').isIn(['PRODUCT_OWNER', 'SCRUM_MASTER', 'DEVELOPER', 'TESTER', 'DESIGNER', 'STAKEHOLDER', 'INFRAESTRUCTURA', 'REDES', 'SEGURIDAD']).withMessage('Rol inválido')
], validateRequest, requireProjectMemberManagement('projectId'), ScrumController.updateProjectMember);

/**
 * @route DELETE /api/scrum/projects/:projectId/members/:memberId
 * @desc Eliminar un miembro del proyecto
 * @access Private - ADMIN/MANAGER o PRODUCT_OWNER/SCRUM_MASTER del proyecto
 */
router.delete('/projects/:projectId/members/:memberId', [
  param('projectId').isInt({ min: 1 }).withMessage('ID de proyecto inválido'),
  param('memberId').isInt({ min: 1 }).withMessage('ID de miembro inválido')
], validateRequest, requireProjectMemberManagement('projectId'), ScrumController.removeProjectMember);

// ===== RUTAS DE SPRINTS =====

/**
 * @route GET /api/scrum/sprints
 * @desc Obtener todos los sprints
 * @access Private
 */
router.get('/sprints', [
  query('status').optional().isIn(['PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED']).withMessage('Estado inválido'),
  query('includeCompleted').optional().isBoolean().withMessage('includeCompleted debe ser booleano'),
  query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser un número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe ser entre 1 y 100')
], validateRequest, ScrumController.getSprints);

/**
 * @route GET /api/scrum/sprints/:id
 * @desc Obtener un sprint por ID
 * @access Private
 */
router.get('/sprints/:id', [
  param('id').isInt({ min: 1 }).withMessage('ID de sprint inválido')
], validateRequest, requireSameOrganizationForProject('sprintId'), ScrumController.getSprintById);

/**
 * @route GET /api/scrum/sprints/:id/tasks
 * @desc Obtener tareas de un sprint
 * @access Private
 */
router.get('/sprints/:id/tasks', [
  param('id').isInt({ min: 1 }).withMessage('ID de sprint inválido'),
  query('status').optional().isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).withMessage('Estado inválido'),
  query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).withMessage('Prioridad inválida'),
  query('assigneeId').optional().isInt({ min: 1 }).withMessage('ID de asignado inválido')
], validateRequest, ScrumController.getSprintTasks);

/**
 * @route GET /api/scrum/sprints/:id/burndown
 * @desc Obtener datos del burndown chart de un sprint
 * @access Private
 */
router.get('/sprints/:id/burndown', [
  param('id').isInt({ min: 1 }).withMessage('ID de sprint inválido')
], validateRequest, ScrumController.getSprintBurndown);

/**
 * @route GET /api/scrum/projects/:projectId/sprints
 * @desc Obtener sprints de un proyecto
 * @access Private
 */
router.get('/projects/:projectId/sprints', [
  param('projectId').isInt({ min: 1 }).withMessage('ID de proyecto inválido'),
  query('status').optional().isIn(['PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED']).withMessage('Estado inválido'),
  query('includeCompleted').optional().isBoolean().withMessage('includeCompleted debe ser booleano')
], validateRequest, requireSameOrganizationForProject('projectId'), ScrumController.getProjectSprints);

/**
 * @route POST /api/scrum/sprints
 * @desc Crear un nuevo sprint
 * @access Private - ADMIN o PRODUCT_OWNER/SCRUM_MASTER del proyecto
 */
router.post('/sprints', 
  sprintValidation, 
  validateRequest,
  requireSameOrganizationForProject('projectId'), // projectId viene en body
  requireProjectAccess('projectId'),
  requireProjectRole('PRODUCT_OWNER', 'SCRUM_MASTER'),
  ScrumController.createSprint
);

/**
 * @route PUT /api/scrum/sprints/:id
 * @desc Actualizar un sprint
 * @access Private
 */
router.put('/sprints/:id', [...sprintIdValidation, ...sprintValidation], validateRequest, requireSameOrganizationForProject('sprintId'), ScrumController.updateSprint);

// ===== RUTAS DE ÉPICAS =====

/**
 * @route GET /api/scrum/projects/:projectId/epics
 * @desc Obtener épicas de un proyecto
 * @access Private - ADMIN/MANAGER o miembro del proyecto
 */
router.get('/projects/:projectId/epics', [
  param('projectId').isInt({ min: 1 }).withMessage('ID de proyecto inválido'),
  query('status').optional().isIn(['DRAFT', 'READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).withMessage('Estado inválido'),
  query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).withMessage('Prioridad inválida')
], validateRequest, requireSameOrganizationForProject('projectId'), requireProjectAccess('projectId'), ScrumController.getProjectEpics);

/**
 * @route GET /api/scrum/epics/:id
 * @desc Obtener una épica por ID
 * @access Private
 */
router.get('/epics/:id', [
  param('id').isInt({ min: 1 }).withMessage('ID de épica inválido')
], validateRequest, requireSameOrganizationForProject('epicId'), ScrumController.getEpicById);

/**
 * @route POST /api/scrum/epics
 * @desc Crear una nueva épica
 * @access Private - ADMIN o PRODUCT_OWNER/SCRUM_MASTER del proyecto
 */
router.post('/epics', 
  epicValidation, 
  validateRequest,
  requireSameOrganizationForProject('projectId'), // projectId viene en body
  requireProjectAccess('projectId'),
  requireProjectRole('PRODUCT_OWNER', 'SCRUM_MASTER'),
  ScrumController.createEpic
);

/**
 * @route PUT /api/scrum/epics/:id
 * @desc Actualizar una épica
 * @access Private
 */
router.put('/epics/:id', [...epicIdValidation, ...epicValidation], validateRequest, requireSameOrganizationForProject('epicId'), ScrumController.updateEpic);

/**
 * @route DELETE /api/scrum/epics/:id
 * @desc Eliminar una épica
 * @access Private
 */
router.delete('/epics/:id', epicIdValidation, validateRequest, requireSameOrganizationForProject('epicId'), ScrumController.deleteEpic);

// ===== RUTAS DE HISTORIAS DE USUARIO =====

/**
 * @route GET /api/scrum/epics/:epicId/user-stories
 * @desc Obtener historias de usuario de una épica
 * @access Private
 */
router.get('/epics/:epicId/user-stories', [
  param('epicId').isInt({ min: 1 }).withMessage('ID de épica inválido'),
  query('status').optional().isIn(['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']).withMessage('Estado inválido'),
  query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).withMessage('Prioridad inválida')
], validateRequest, requireSameOrganizationForProject('epicId'), ScrumController.getEpicUserStories);

/**
 * @route GET /api/scrum/user-stories
 * @desc Obtener todas las historias de usuario con filtros
 * @access Private
 */
router.get('/user-stories', [
  query('status').optional().isIn(['DRAFT', 'READY', 'IN_PROGRESS', 'TESTING', 'COMPLETED', 'CANCELLED']).withMessage('Estado inválido'),
  query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).withMessage('Prioridad inválida'),
  query('epicId').optional().isInt({ min: 1 }).withMessage('ID de épica inválido'),
  query('sprintId').optional().isInt({ min: 1 }).withMessage('ID de sprint inválido')
], validateRequest, ScrumController.getAllUserStories);

/**
 * @route GET /api/scrum/user-stories/:id
 * @desc Obtener una historia de usuario por ID
 * @access Private
 */
router.get('/user-stories/:id', 
  userStoryIdValidation, 
  validateRequest,
  requireSameOrganizationForProject('userStoryId'),
  ScrumController.getUserStoryById
);

/**
 * @route POST /api/scrum/user-stories
 * @desc Crear una nueva historia de usuario
 * @access Private - ADMIN o PRODUCT_OWNER/SCRUM_MASTER del proyecto
 */
router.post('/user-stories', 
  userStoryValidation, 
  validateRequest,
  requireSameOrganizationForProject('epicId'), // projectId viene del epicId en body
  requireProjectAccess('projectId'),
  requireProjectRole('PRODUCT_OWNER', 'SCRUM_MASTER'),
  ScrumController.createUserStory
);

/**
 * @route PUT /api/scrum/user-stories/:id
 * @desc Actualizar una historia de usuario
 * @access Private
 */
router.put('/user-stories/:id',
  userStoryIdValidation,
  userStoryValidation,
  validateRequest,
  requireSameOrganizationForProject('userStoryId'),
  ScrumController.updateUserStory
);

/**
 * @route DELETE /api/scrum/user-stories/:id
 * @desc Eliminar una historia de usuario
 * @access Private
 */
router.delete('/user-stories/:id',
  userStoryIdValidation,
  validateRequest,
  requireSameOrganizationForProject('userStoryId'),
  ScrumController.deleteUserStory
);

// ===== RUTAS DE TAREAS =====

/**
 * @route GET /api/scrum/projects/:projectId/user-stories
 * @desc Obtener todas las historias de usuario de un proyecto
 * @access Private
 */
router.get('/projects/:projectId/user-stories', [
  param('projectId').isInt({ min: 1 }).withMessage('ID de proyecto inválido'),
  query('status').optional().isIn(['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']).withMessage('Estado inválido'),
  query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).withMessage('Prioridad inválida'),
  query('epicId').optional().isInt({ min: 1 }).withMessage('ID de épica inválido'),
  query('sprintId').optional().isInt({ min: 1 }).withMessage('ID de sprint inválido')
], validateRequest, requireSameOrganizationForProject('projectId'), requireProjectAccess('projectId'), ScrumController.getProjectUserStories);

/**
 * @route GET /api/scrum/user-stories/:userStoryId/tasks
 * @desc Obtener tareas de una historia de usuario
 * @access Private
 */
router.get('/user-stories/:userStoryId/tasks', [
  param('userStoryId').isInt({ min: 1 }).withMessage('ID de historia inválido'),
  query('status').optional().isIn(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'TESTING', 'COMPLETED', 'CANCELLED']).withMessage('Estado inválido'),
  query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).withMessage('Prioridad inválida'),
  query('type').optional().isIn(['DEVELOPMENT', 'TESTING', 'DESIGN', 'DOCUMENTATION', 'BUG_FIX', 'RESEARCH', 'REFACTORING']).withMessage('Tipo inválido')
], validateRequest, requireSameOrganizationForProject('userStoryId'), ScrumController.getUserStoryTasks);

/**
 * @route GET /api/scrum/tasks/:id
 * @desc Obtener una tarea por ID
 * @access Private
 */
router.get('/tasks/:id', 
  taskIdValidation, 
  validateRequest,
  requireSameOrganizationForProject('taskId'),
  ScrumController.getTaskById
);

/**
 * @route POST /api/scrum/tasks
 * @desc Crear una nueva tarea
 * @access Private - ADMIN o PRODUCT_OWNER/SCRUM_MASTER/DEVELOPER/TESTER/DESIGNER/INFRA/REDES/SEGURIDAD del proyecto
 */
router.post('/tasks', 
  taskCreateValidation, 
  validateRequest,
  requireProjectAccess('projectId'), // projectId viene del userStoryId en body
  requireProjectRole('PRODUCT_OWNER', 'SCRUM_MASTER', 'DEVELOPER', 'TESTER', 'DESIGNER', 'INFRAESTRUCTURA', 'REDES', 'SEGURIDAD'),
  ScrumController.createTask
);

/**
 * @route PUT /api/scrum/tasks/:id
 * @desc Actualizar una tarea
 * @access Private - ADMIN/PO/SM o asignado de la tarea
 */
router.put('/tasks/:id', 
  [...taskIdValidation, ...taskUpdateValidation], 
  validateRequest,
  requireSameOrganizationForProject('taskId'),
  requireTaskEditAccess('id'),
  ScrumController.updateTask
);

/**
 * @route DELETE /api/scrum/tasks/:id
 * @desc Eliminar una tarea
 * @access Private
 */
router.delete('/tasks/:id', 
  taskIdValidation, 
  validateRequest,
  requireSameOrganizationForProject('taskId'),
  ScrumController.deleteTask
);

// ===== RUTAS DE TEMPLATES =====

/**
 * @route GET /api/scrum/templates
 * @desc Obtener templates de proyectos
 * @access Private
 */
router.get('/templates', (req, res) => {
  return ResponseHelper.success(res, { 
    templates: [
      { id: 1, name: 'Proyecto Web Básico', description: 'Template para proyectos web estándar' },
      { id: 2, name: 'Proyecto Móvil', description: 'Template para aplicaciones móviles' },
      { id: 3, name: 'Proyecto API', description: 'Template para APIs REST' }
    ] 
  }, 'Templates obtenidos exitosamente');
});

// ===== RUTAS DEL DASHBOARD Y MÉTRICAS EXISTENTES =====

/**
 * @route GET /api/scrum/dashboard
 * @desc Dashboard general con estadísticas consolidadas
 * @access Private
 */
router.get('/dashboard', [
  query('projectId').optional().isInt({ min: 1 }).withMessage('ID de proyecto inválido'),
  query('sprintId').optional().isInt({ min: 1 }).withMessage('ID de sprint inválido'),
  query('teamId').optional().isInt({ min: 1 }).withMessage('ID de equipo inválido'),
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']).withMessage('Período inválido')
], validateRequest, ScrumController.getDashboard);

/**
 * @route GET /api/scrum/projects/:projectId/team-metrics
 * @desc Obtener métricas del equipo por proyecto
 * @access Private
 */
router.get('/projects/:projectId/team-metrics', [
  param('projectId').isInt({ min: 1 }).withMessage('ID de proyecto inválido'),
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']).withMessage('Período inválido')
], validateRequest, requireSameOrganizationForProject('projectId'), ScrumController.getTeamMetrics);

/**
 * @route GET /api/scrum/projects/:projectId/velocity
 * @desc Obtener velocidad del equipo por proyecto
 * @access Private
 */
router.get('/projects/:projectId/velocity', [
  param('projectId').isInt({ min: 1 }).withMessage('ID de proyecto inválido'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Límite inválido')
], validateRequest, requireSameOrganizationForProject('projectId'), ScrumController.getTeamVelocity);

// ===== RUTAS PARA PANEL DE CONTROL GENERAL (RF025-RF028) =====

/**
 * @route GET /api/scrum/dashboard/consolidated
 * @desc Vista consolidada de proyectos por dirección/equipo (RF025)
 * @access Private
 */
router.get('/dashboard/consolidated', [
  query('teamId').optional().isInt({ min: 1 }).withMessage('ID de equipo inválido'),
  query('directionId').optional().isInt({ min: 1 }).withMessage('ID de dirección inválido'),
  query('status').optional().isIn(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).withMessage('Estado inválido')
], validateRequest, ScrumController.getDashboardConsolidated);

/**
 * @route GET /api/scrum/dashboard/productivity
 * @desc Métricas de productividad por responsable (RF027)
 * @access Private
 */
router.get('/dashboard/productivity', [
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']).withMessage('Período inválido'),
  query('assigneeId').optional().isInt({ min: 1 }).withMessage('ID de responsable inválido')
], validateRequest, ScrumController.getProductivityMetrics);

/**
 * @route GET /api/scrum/dashboard/deadlines
 * @desc Proyectos próximos a vencer o con retrasos (RF028)
 * @access Private
 */
router.get('/dashboard/deadlines', [
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Número de días inválido')
], validateRequest, ScrumController.getDeadlineAlerts);

// ===== RUTAS PARA MÉTRICAS Y KPI (RF029-RF032) =====

/**
 * @route GET /api/scrum/metrics/completion-by-assignee
 * @desc Número de proyectos completados por responsable (RF029)
 * @access Private
 */
router.get('/metrics/completion-by-assignee', [
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']).withMessage('Período inválido'),
  query('assigneeId').optional().isInt({ min: 1 }).withMessage('ID de responsable inválido')
], validateRequest, ScrumController.getCompletionByAssignee);

/**
 * @route GET /api/scrum/metrics/completion-time
 * @desc Tiempo promedio de completación de proyectos (RF030)
 * @access Private
 */
router.get('/metrics/completion-time', [
  query('projectId').optional().isInt({ min: 1 }).withMessage('ID de proyecto inválido'),
  query('period').optional().isIn(['month', 'quarter', 'year']).withMessage('Período inválido')
], validateRequest, ScrumController.getCompletionTimeMetrics);

/**
 * @route GET /api/scrum/metrics/workload-distribution
 * @desc Distribución de carga de trabajo por equipo (RF031)
 * @access Private
 */
router.get('/metrics/workload-distribution', [
  query('teamId').optional().isInt({ min: 1 }).withMessage('ID de equipo inválido'),
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']).withMessage('Período inválido')
], validateRequest, ScrumController.getWorkloadDistribution);

/**
 * @route GET /api/scrum/metrics/performance-history
 * @desc Historial de rendimiento por períodos (RF032)
 * @access Private
 */
router.get('/metrics/performance-history', [
  query('assigneeId').optional().isInt({ min: 1 }).withMessage('ID de responsable inválido'),
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']).withMessage('Período inválido'),
  query('intervals').optional().isInt({ min: 1, max: 24 }).withMessage('Número de intervalos inválido')
], validateRequest, ScrumController.getPerformanceHistory);

/**
 * @route GET /api/scrum/reports/weekly-pdf
 * @desc Generar informe semanal en PDF con proyectos, sprints y tareas de los últimos 7 días
 * @access Private
 */
router.get('/reports/weekly-pdf', ScrumController.generateWeeklyReport);

module.exports = router;