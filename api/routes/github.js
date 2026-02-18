const express = require('express');
const GitHubController = require('../controllers/githubController');
const { authenticateToken } = require('../middleware/auth');
const { 
  requireProjectAccess, 
  requireProjectRole 
} = require('../middleware/authz');
const { body, param, query } = require('express-validator');
const { requireFeature } = require('../middleware/featureGate');

const router = express.Router();

// Gating: Todas las rutas de GitHub requieren feature 'github'
router.use(requireFeature('github'));

// ==========================================
// RUTAS OAUTH (sin autenticación en callback, pero sí en start)
// ==========================================

// Iniciar OAuth - requiere autenticación
router.get(
  '/oauth/start',
  authenticateToken,
  GitHubController.startOAuth
);

// Callback OAuth - NO requiere autenticación JWT porque GitHub redirige sin token
// El userId se obtiene de la cookie establecida en startOAuth
router.get(
  '/oauth/callback',
  GitHubController.oauthCallback
);

// ==========================================
// RUTAS DE USUARIO (requieren autenticación)
// ==========================================

// Endpoint de prueba para verificar conexión
router.get(
  '/test',
  authenticateToken,
  GitHubController.testConnection
);

// Listar repositorios del usuario
router.get(
  '/repos',
  authenticateToken,
  GitHubController.listRepositories
);

// ==========================================
// RUTAS DE PROYECTO (requieren acceso al proyecto)
// ==========================================

// Obtener estado de integración
router.get(
  '/projects/:projectId/status',
  authenticateToken,
  requireProjectAccess('projectId'),
  GitHubController.getStatus
);

// Vincular repositorio (requiere ADMIN/MANAGER/PO/SM)
router.post(
  '/projects/:projectId/repos',
  authenticateToken,
  requireProjectAccess('projectId'),
  requireProjectRole('PRODUCT_OWNER', 'SCRUM_MASTER'),
  [
    body('owner')
      .notEmpty()
      .withMessage('Owner es requerido')
      .trim(),
    body('repo')
      .notEmpty()
      .withMessage('Repo es requerido')
      .trim()
  ],
  GitHubController.linkRepository
);

// Desvincular repositorio (requiere ADMIN/MANAGER/PO/SM)
router.delete(
  '/projects/:projectId/repos/:repoLinkId',
  authenticateToken,
  requireProjectAccess('projectId'),
  requireProjectRole('PRODUCT_OWNER', 'SCRUM_MASTER'),
  [
    param('repoLinkId')
      .isInt()
      .withMessage('ID de repositorio inválido')
  ],
  GitHubController.unlinkRepository
);

// Obtener actividad (cualquier miembro del proyecto puede ver)
router.get(
  '/projects/:projectId/activity',
  authenticateToken,
  requireProjectAccess('projectId'),
  [
    query('owner')
      .notEmpty()
      .withMessage('Owner es requerido'),
    query('repo')
      .notEmpty()
      .withMessage('Repo es requerido')
  ],
  GitHubController.getActivity
);

// ==========================================
// RUTAS DE TAREAS (vincular commits)
// ==========================================

// Vincular commit a tarea manualmente
router.post(
  '/tasks/:taskId/commits',
  authenticateToken,
  [
    param('taskId')
      .isInt()
      .withMessage('ID de tarea inválido'),
    body('commitSha')
      .notEmpty()
      .withMessage('commitSha es requerido')
      .trim(),
    body('owner')
      .notEmpty()
      .withMessage('Owner es requerido')
      .trim(),
    body('repo')
      .notEmpty()
      .withMessage('Repo es requerido')
      .trim()
  ],
  GitHubController.linkCommitToTask
);

module.exports = router;

