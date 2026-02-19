const express = require('express');
const router = express.Router();

// Importar sub-routers
const budgetsRouter = require('./budgets');
const expensesRouter = require('./expenses');
const rateCardsRouter = require('./rateCards');

// Montar sub-routers
router.use('/budgets', budgetsRouter);
router.use('/expenses', expensesRouter);
router.use('/rate-cards', rateCardsRouter);

module.exports = router;

