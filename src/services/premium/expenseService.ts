/**
 * Expense Service Stub (Community Edition)
 */

const stubError = () => {
  throw new Error('PREMIUM_REQUIRED: This feature requires Sprintiva Premium.');
};

export default {
  getExpenses: stubError,
  createExpense: stubError,
  updateExpense: stubError,
  deleteExpense: stubError,
};

export type Expense = any;
export type CreateExpenseData = any;
