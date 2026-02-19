const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const BudgetController = require('../../controllers/premium/budgetController');
const BudgetLineController = require('../../controllers/premium/budgetLineController');
const BudgetMetricsController = require('../../controllers/premium/budgetMetricsController');
const { authenticateToken } = require('../../middleware/auth');
const { requireFeature } = require('../../middleware/featureGate');
const { requireSameOrganizationForProject } = require('../../middleware/tenant');
const ResponseHelper = require('../../utils/responseHelper');

// Middleware de validación
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ResponseHelper.error(res, errors.array()[0].msg, 400);
  }
  next();
};

const router = express.Router();

// Todas las rutas requieren autenticación y feature flag
router.use(authenticateToken);
router.use(requireFeature('budgets'));

// Validaciones
const budgetValidation = [
  body('projectId').isInt().withMessage('projectId debe ser un número entero'),
  body('scope').isIn(['PROJECT', 'SPRINT', 'RELEASE']).withMessage('scope debe ser PROJECT, SPRINT o RELEASE'),
  body('name').notEmpty().withMessage('name es requerido'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('currency debe ser código de 3 letras'),
  body('sprintId').optional().isInt().withMessage('sprintId debe ser un número entero'),
  body('releaseId').optional().isInt().withMessage('releaseId debe ser un número entero'),
  body('startsAt').optional().isISO8601().withMessage('startsAt debe ser una fecha válida'),
  body('endsAt').optional().isISO8601().withMessage('endsAt debe ser una fecha válida'),
  body('lines').optional().isArray().withMessage('lines debe ser un array'),
  body('lines.*.category').optional().notEmpty().withMessage('category es requerido en cada línea'),
  body('lines.*.plannedCents').optional().isInt({ min: 0 }).withMessage('plannedCents debe ser un entero positivo'),
];

const budgetLineValidation = [
  body('category').notEmpty().withMessage('category es requerido'),
  body('categoryType').optional().isIn(['LABOR', 'SOFTWARE', 'SERVICES', 'HARDWARE', 'TRAVEL', 'OTHER']),
  body('plannedCents').isInt({ min: 1 }).withMessage('plannedCents debe ser un entero positivo'),
];

// Rutas de budgets
router.get(
  '/',
  [
    query('projectId').optional().isInt(),
    query('scope').optional().isIn(['PROJECT', 'SPRINT', 'RELEASE']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  BudgetController.getBudgets
);

router.get(
  '/:id',
  [param('id').isInt().withMessage('id debe ser un número entero')],
  validate,
  BudgetController.getBudgetById
);

router.post(
  '/',
  budgetValidation,
  validate,
  requireSameOrganizationForProject('projectId'),
  BudgetController.createBudget
);

router.patch(
  '/:id',
  [
    param('id').isInt().withMessage('id debe ser un número entero'),
    body('name').optional().notEmpty(),
    body('currency').optional().isLength({ min: 3, max: 3 }),
    body('startsAt').optional().isISO8601(),
    body('endsAt').optional().isISO8601(),
  ],
  validate,
  BudgetController.updateBudget
);

router.delete(
  '/:id',
  [param('id').isInt().withMessage('id debe ser un número entero')],
  validate,
  BudgetController.deleteBudget
);

// Rutas de budget lines
router.post(
  '/:budgetId/lines',
  [
    param('budgetId').isInt().withMessage('budgetId debe ser un número entero'),
    ...budgetLineValidation,
  ],
  validate,
  BudgetLineController.createBudgetLine
);

router.patch(
  '/budget-lines/:lineId',
  [
    param('lineId').isInt().withMessage('lineId debe ser un número entero'),
    body('category').optional().notEmpty(),
    body('categoryType').optional().isIn(['LABOR', 'SOFTWARE', 'SERVICES', 'HARDWARE', 'TRAVEL', 'OTHER']),
    body('plannedCents').optional().isInt({ min: 1 }),
  ],
  validate,
  BudgetLineController.updateBudgetLine
);

router.delete(
  '/budget-lines/:lineId',
  [param('lineId').isInt().withMessage('lineId debe ser un número entero')],
  validate,
  BudgetLineController.deleteBudgetLine
);

// Ruta de métricas
router.get(
  '/:id/metrics',
  [param('id').isInt().withMessage('id debe ser un número entero')],
  validate,
  BudgetMetricsController.getBudgetMetrics
);

module.exports = router;

