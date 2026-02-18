const express = require('express');
const { param, body, query } = require('express-validator');
const RoadmapController = require('../controllers/roadmapController');
const ReleaseController = require('../controllers/releaseController');
const { authenticateToken } = require('../middleware/auth');
const { requireProjectAccess, requireProjectRole } = require('../middleware/authz');
const { validateRequest } = require('../middleware/validationSchemas');
const { requireFeature } = require('../middleware/featureGate');

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Gating: Todas las rutas de roadmap requieren feature 'roadmap'
router.use(requireFeature('roadmap'));

// ==========================================
// RUTAS DE ROADMAP
// ==========================================

/**
 * @route GET /api/scrum/projects/:projectId/roadmap
 * @desc Obtener datos del roadmap
 * @access Private - Miembros del proyecto
 */
router.get(
  '/projects/:projectId/roadmap',
  [param('projectId').isInt().withMessage('ID de proyecto inválido')],
  validateRequest,
  requireProjectAccess('projectId'),
  RoadmapController.getRoadmap
);

/**
 * @route GET /api/scrum/projects/:projectId/gantt
 * @desc Obtener datos para diagrama de Gantt
 * @access Private - Miembros del proyecto - Premium Feature
 */
router.get(
  '/projects/:projectId/gantt',
  requireFeature('gantt'), // Requiere feature 'gantt' además de 'roadmap'
  [
    param('projectId').isInt().withMessage('ID de proyecto inválido'),
    query('sprintId').optional().isInt().withMessage('ID de sprint inválido'),
  ],
  validateRequest,
  requireProjectAccess('projectId'),
  RoadmapController.getGanttData
);

/**
 * @route GET /api/scrum/sprints/:id/gantt
 * @desc Obtener datos de Gantt para un sprint específico
 * @access Private - Miembros del proyecto - Premium Feature
 */
router.get(
  '/sprints/:id/gantt',
  requireFeature('gantt'), // Requiere feature 'gantt' además de 'roadmap'
  [param('id').isInt().withMessage('ID de sprint inválido')],
  validateRequest,
  RoadmapController.getGanttData
);

/**
 * @route GET /api/scrum/projects/:projectId/critical-path
 * @desc Calcular critical path del proyecto
 * @access Private - Miembros del proyecto
 */
router.get(
  '/projects/:projectId/critical-path',
  [param('projectId').isInt().withMessage('ID de proyecto inválido')],
  validateRequest,
  requireProjectAccess('projectId'),
  RoadmapController.getCriticalPath
);

/**
 * @route GET /api/scrum/tasks/:id/dependencies
 * @desc Obtener dependencias de una tarea
 * @access Private - Miembros del proyecto
 */
router.get(
  '/tasks/:id/dependencies',
  [param('id').isInt().withMessage('ID de tarea inválido')],
  validateRequest,
  RoadmapController.getTaskDependencies
);

/**
 * @route POST /api/scrum/tasks/:id/dependencies
 * @desc Crear dependencia entre tareas
 * @access Private - PO/SM/ADMIN
 */
router.post(
  '/tasks/:id/dependencies',
  [
    param('id').isInt().withMessage('ID de tarea inválido'),
    body('dependsOnId').isInt().withMessage('ID de tarea dependiente inválido'),
    body('type').optional().isIn(['FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH']),
    body('lagDays').optional().isInt().withMessage('Días de retraso inválidos'),
  ],
  validateRequest,
  requireProjectRole('PRODUCT_OWNER', 'SCRUM_MASTER'),
  RoadmapController.createDependency
);

/**
 * @route DELETE /api/scrum/tasks/:id/dependencies/:depId
 * @desc Eliminar dependencia
 * @access Private - PO/SM/ADMIN
 */
router.delete(
  '/tasks/:id/dependencies/:depId',
  [
    param('id').isInt().withMessage('ID de tarea inválido'),
    param('depId').isInt().withMessage('ID de dependencia inválido'),
  ],
  validateRequest,
  requireProjectRole('PRODUCT_OWNER', 'SCRUM_MASTER'),
  RoadmapController.deleteDependency
);

// ==========================================
// RUTAS DE RELEASES
// ==========================================

/**
 * @route GET /api/scrum/projects/:projectId/releases
 * @desc Listar releases de un proyecto
 * @access Private - Miembros del proyecto - Premium Feature
 */
router.get(
  '/projects/:projectId/releases',
  requireFeature('releases'), // Requiere feature 'releases'
  [param('projectId').isInt().withMessage('ID de proyecto inválido')],
  validateRequest,
  requireProjectAccess('projectId'),
  ReleaseController.getReleases
);

/**
 * @route POST /api/scrum/projects/:projectId/releases
 * @desc Crear release
 * @access Private - PO/SM/ADMIN - Premium Feature
 */
router.post(
  '/projects/:projectId/releases',
  requireFeature('releases'), // Requiere feature 'releases'
  [
    param('projectId').isInt().withMessage('ID de proyecto inválido'),
    body('version').notEmpty().withMessage('La versión es requerida'),
    body('name').optional().isString(),
    body('description').optional().isString(),
    body('plannedDate').optional().isISO8601().withMessage('Fecha planificada inválida'),
    body('epicIds').optional().isArray().withMessage('epicIds debe ser un array'),
  ],
  validateRequest,
  requireProjectAccess('projectId'),
  requireProjectRole('PRODUCT_OWNER', 'SCRUM_MASTER'),
  ReleaseController.createRelease
);

/**
 * @route GET /api/scrum/releases/:id
 * @desc Obtener release
 * @access Private - Miembros del proyecto - Premium Feature
 */
router.get(
  '/releases/:id',
  requireFeature('releases'), // Requiere feature 'releases'
  [param('id').isInt().withMessage('ID de release inválido')],
  validateRequest,
  ReleaseController.getRelease
);

/**
 * @route PUT /api/scrum/releases/:id
 * @desc Actualizar release
 * @access Private - PO/SM/ADMIN - Premium Feature
 */
router.put(
  '/releases/:id',
  requireFeature('releases'), // Requiere feature 'releases'
  [
    param('id').isInt().withMessage('ID de release inválido'),
    body('version').optional().isString(),
    body('name').optional().isString(),
    body('description').optional().isString(),
    body('status').optional().isIn(['PLANNING', 'IN_PROGRESS', 'RELEASED', 'CANCELLED']),
    body('releaseDate').optional().isISO8601().withMessage('Fecha de lanzamiento inválida'),
    body('plannedDate').optional().isISO8601().withMessage('Fecha planificada inválida'),
    body('epicIds').optional().isArray().withMessage('epicIds debe ser un array'),
  ],
  validateRequest,
  requireProjectRole('PRODUCT_OWNER', 'SCRUM_MASTER'),
  ReleaseController.updateRelease
);

/**
 * @route DELETE /api/scrum/releases/:id
 * @desc Eliminar release
 * @access Private - PO/SM/ADMIN - Premium Feature
 */
router.delete(
  '/releases/:id',
  requireFeature('releases'), // Requiere feature 'releases'
  [param('id').isInt().withMessage('ID de release inválido')],
  validateRequest,
  requireProjectRole('PRODUCT_OWNER', 'SCRUM_MASTER'),
  ReleaseController.deleteRelease
);

/**
 * @route POST /api/scrum/releases/:id/generate-notes
 * @desc Generar release notes automáticamente
 * @access Private - PO/SM/ADMIN - Premium Feature
 */
router.post(
  '/releases/:id/generate-notes',
  requireFeature('releases'), // Requiere feature 'releases'
  [param('id').isInt().withMessage('ID de release inválido')],
  validateRequest,
  requireProjectRole('PRODUCT_OWNER', 'SCRUM_MASTER'),
  ReleaseController.generateReleaseNotes
);

/**
 * @route GET /api/scrum/releases/:id/changelog
 * @desc Obtener changelog de un release
 * @access Private - Miembros del proyecto - Premium Feature
 */
router.get(
  '/releases/:id/changelog',
  requireFeature('releases'), // Requiere feature 'releases'
  [
    param('id').isInt().withMessage('ID de release inválido'),
    query('format').optional().isIn(['json', 'markdown']),
  ],
  validateRequest,
  ReleaseController.getChangelog
);

module.exports = router;

