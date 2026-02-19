/**
 * Premium Routes Stub (Community Edition)
 * 
 * Este archivo es un stub que se usa cuando el módulo premium no está disponible.
 * Las rutas reales están en premium/api/routes/ y se cargan dinámicamente.
 */

const express = require('express');
const router = express.Router();
const { premiumStub403 } = require('../../stubs/premiumStubs');

// Stubs para todas las rutas premium
router.use('/budgets', premiumStub403);
router.use('/expenses', premiumStub403);
router.use('/rate-cards', premiumStub403);

module.exports = router;
