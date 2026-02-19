const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const RateCardController = require('../../controllers/premium/rateCardController');
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
router.use(requireFeature('rate_cards'));

// Validaciones
const rateCardValidation = [
  body('budgetId').isInt().withMessage('budgetId debe ser un número entero'),
  body('projectId').isInt().withMessage('projectId debe ser un número entero'),
  body('hourlyCents').isInt({ min: 1 }).withMessage('hourlyCents debe ser un entero positivo'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('currency debe ser código de 3 letras'),
  body('userId').optional().isInt().withMessage('userId debe ser un número entero'),
  body('projectRole').optional().isIn(['PRODUCT_OWNER', 'SCRUM_MASTER', 'DEVELOPER', 'TESTER', 'DESIGNER', 'STAKEHOLDER', 'OBSERVER', 'INFRAESTRUCTURA', 'REDES', 'SEGURIDAD']),
  body('effectiveFrom').optional().isISO8601().withMessage('effectiveFrom debe ser una fecha válida'),
  body('effectiveTo').optional().isISO8601().withMessage('effectiveTo debe ser una fecha válida'),
];

// Rutas de rate cards
router.get(
  '/',
  [
    query('budgetId').optional().isInt(),
    query('projectId').optional().isInt(),
  ],
  validate,
  RateCardController.getRateCards
);

router.post(
  '/',
  rateCardValidation,
  validate,
  requireSameOrganizationForProject('projectId'),
  RateCardController.createRateCard
);

router.patch(
  '/:id',
  [
    param('id').isInt().withMessage('id debe ser un número entero'),
    body('hourlyCents').optional().isInt({ min: 1 }),
    body('currency').optional().isLength({ min: 3, max: 3 }),
    body('effectiveFrom').optional().isISO8601(),
    body('effectiveTo').optional().isISO8601(),
  ],
  validate,
  RateCardController.updateRateCard
);

router.delete(
  '/:id',
  [param('id').isInt().withMessage('id debe ser un número entero')],
  validate,
  RateCardController.deleteRateCard
);

module.exports = router;

