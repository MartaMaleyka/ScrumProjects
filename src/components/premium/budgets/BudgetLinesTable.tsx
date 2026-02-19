import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import BudgetService, { type BudgetLine } from '../../../services/premium/budgetService';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell } from '../../ui/Table';
import { Button } from '../../ui/Button';
import LoadingSpinner from '../../scrum/common/LoadingSpinner';
import { ErrorState } from '../../ui/ErrorState';

interface BudgetLinesTableProps {
  budgetId: number;
}

const BudgetLinesTable: React.FC<BudgetLinesTableProps> = ({ budgetId }) => {
  const { t } = useTranslation();
  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLines();
  }, [budgetId]);

  const loadLines = async () => {
    try {
      setLoading(true);
      const budget = await BudgetService.getBudgetById(budgetId);
      setLines(budget.lines || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar líneas');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(cents / 100);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={loadLines} />;

  const total = lines.reduce((sum, line) => sum + line.plannedCents, 0);

  return (
    <div>
      <Table>
        <TableHeader>
          <tr>
            <TableHeaderCell>{t('budgets.lines.category', 'Categoría')}</TableHeaderCell>
            <TableHeaderCell>{t('budgets.lines.type', 'Tipo')}</TableHeaderCell>
            <TableHeaderCell>{t('budgets.lines.planned', 'Planificado')}</TableHeaderCell>
            <TableHeaderCell>{t('common.actions', 'Acciones')}</TableHeaderCell>
          </tr>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell>{line.category}</TableCell>
              <TableCell>{line.categoryType}</TableCell>
              <TableCell>{formatCurrency(line.plannedCents)}</TableCell>
              <TableCell>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    if (confirm('¿Eliminar esta línea?')) {
                      try {
                        await BudgetService.deleteBudgetLine(line.id);
                        loadLines();
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
          <span className="font-semibold">{t('budgets.lines.total', 'Total Planificado')}:</span>
          <span className="text-xl font-bold">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
};

export default BudgetLinesTable;

