const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const ExpenseController = require('../../controllers/premium/expenseController');
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
router.use(requireFeature('budgets')); // Expenses usa el mismo flag que budgets

// Validaciones
const expenseValidation = [
  body('budgetId').isInt().withMessage('budgetId debe ser un número entero'),
  body('projectId').isInt().withMessage('projectId debe ser un número entero'),
  body('category').notEmpty().withMessage('category es requerido'),
  body('amountCents').isInt({ min: 1 }).withMessage('amountCents debe ser un entero positivo'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('currency debe ser código de 3 letras'),
  body('incurredAt').optional().isISO8601().withMessage('incurredAt debe ser una fecha válida'),
  body('sprintId').optional().isInt().withMessage('sprintId debe ser un número entero'),
  body('taskId').optional().isInt().withMessage('taskId debe ser un número entero'),
  body('vendor').optional().isString(),
  body('description').optional().isString(),
  body('attachmentUrl').optional().isURL().withMessage('attachmentUrl debe ser una URL válida'),
];

// Rutas de expenses
router.get(
  '/',
  [
    query('budgetId').optional().isInt(),
    query('projectId').optional().isInt(),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  ExpenseController.getExpenses
);

router.post(
  '/',
  expenseValidation,
  validate,
  requireSameOrganizationForProject('projectId'),
  ExpenseController.createExpense
);

router.patch(
  '/:id',
  [
    param('id').isInt().withMessage('id debe ser un número entero'),
    body('category').optional().notEmpty(),
    body('amountCents').optional().isInt({ min: 1 }),
    body('currency').optional().isLength({ min: 3, max: 3 }),
    body('incurredAt').optional().isISO8601(),
    body('vendor').optional().isString(),
    body('description').optional().isString(),
    body('attachmentUrl').optional().isURL(),
  ],
  validate,
  ExpenseController.updateExpense
);

router.delete(
  '/:id',
  [param('id').isInt().withMessage('id debe ser un número entero')],
  validate,
  ExpenseController.deleteExpense
);

module.exports = router;

