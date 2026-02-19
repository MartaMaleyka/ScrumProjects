import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ExpenseService from '../../../services/premium/expenseService';
import type { Expense } from '../../../services/premium/budgetService';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell } from '../../ui/Table';
import { Button } from '../../ui/Button';
import LoadingSpinner from '../../scrum/common/LoadingSpinner';
import { ErrorState } from '../../ui/ErrorState';
import ExpenseCreateModal from './ExpenseCreateModal';
import BudgetService from '../../../services/premium/budgetService';

interface ExpensesTableProps {
  budgetId: number;
}

const ExpensesTable: React.FC<ExpensesTableProps> = ({ budgetId }) => {
  const { t } = useTranslation();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [budget, setBudget] = useState<any>(null);
  const [filters, setFilters] = useState({
    from: '',
    to: '',
  });

  useEffect(() => {
    loadExpenses();
    loadBudget();
  }, [budgetId, filters]);

  const loadBudget = async () => {
    try {
      const data = await BudgetService.getBudgetById(budgetId);
      setBudget(data);
    } catch (err) {
      console.error('Error loading budget:', err);
    }
  };

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const response = await ExpenseService.getExpenses({
        budgetId,
        from: filters.from || undefined,
        to: filters.to || undefined,
      });
      setExpenses(response.expenses || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar gastos');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number, currency: string = 'USD') => {
    if (!cents || cents === 0) return `0.00 ${currency}`;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={loadExpenses} />;

  const total = expenses.reduce((sum, expense) => sum + expense.amountCents, 0);

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <div className="flex gap-4">
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
            placeholder={t('budgets.expenses.from', 'From')}
          />
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
            placeholder={t('budgets.expenses.to', 'To')}
          />
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowCreateModal(true)}
        >
          {t('budgets.expenses.add', 'Add Expense')}
        </Button>
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHeaderCell>{t('budgets.expenses.date', 'Fecha')}</TableHeaderCell>
            <TableHeaderCell>{t('budgets.expenses.category', 'Categoría')}</TableHeaderCell>
            <TableHeaderCell>{t('budgets.expenses.amount', 'Monto')}</TableHeaderCell>
            <TableHeaderCell>{t('budgets.expenses.vendor', 'Proveedor')}</TableHeaderCell>
            <TableHeaderCell>{t('budgets.expenses.createdBy', 'Creado por')}</TableHeaderCell>
            <TableHeaderCell>{t('common.actions', 'Acciones')}</TableHeaderCell>
          </tr>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow key={expense.id}>
              <TableCell>{new Date(expense.incurredAt).toLocaleDateString()}</TableCell>
              <TableCell>{expense.category}</TableCell>
              <TableCell>{formatCurrency(expense.amountCents, expense.currency)}</TableCell>
              <TableCell>{expense.vendor || '-'}</TableCell>
              <TableCell>{expense.createdBy?.name || '-'}</TableCell>
              <TableCell>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    if (confirm('¿Eliminar este gasto?')) {
                      try {
                        await ExpenseService.deleteExpense(expense.id);
                        loadExpenses();
                      } catch (err: any) {
                        alert(err.message);
                      }
                    }
                  }}
                >
                  {t('common.delete', 'Eliminar')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-semibold">{t('budgets.expenses.total', 'Total Expenses')}:</span>
          <span className="text-xl font-bold">{formatCurrency(total, expenses[0]?.currency || 'USD')}</span>
        </div>
      </div>

      {showCreateModal && budget && (
        <ExpenseCreateModal
          budgetId={budgetId}
          projectId={budget.projectId}
          currency={budget.currency}
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadExpenses();
          }}
        />
      )}
    </div>
  );
};

export default ExpensesTable;

