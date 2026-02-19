/**
 * Budget Service Stub (Community Edition)
 * 
 * Este servicio retorna errores cuando se intenta usar sin premium.
 * El servicio real está en premium/src/services/premium/budgetService.ts
 */

const stubError = () => {
  throw new Error('PREMIUM_REQUIRED: This feature requires Sprintiva Premium.');
};

export default {
  getBudgets: stubError,
  getBudgetById: stubError,
  createBudget: stubError,
  updateBudget: stubError,
  deleteBudget: stubError,
  createBudgetLine: stubError,
  updateBudgetLine: stubError,
  deleteBudgetLine: stubError,
  getBudgetMetrics: stubError,
};

export type Budget = any;
export type BudgetFilters = any;
export type BudgetMetrics = any;
export type BudgetLine = any;
export type CreateBudgetData = any;
