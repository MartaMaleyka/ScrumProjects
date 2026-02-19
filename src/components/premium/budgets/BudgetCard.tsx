import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Budget } from '../../../services/premium/budgetService';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import BudgetViewModal from './BudgetViewModal';

interface BudgetCardProps {
  budget: Budget;
  onDelete: (id: number) => void;
}

const BudgetCard: React.FC<BudgetCardProps> = ({ budget, onDelete }) => {
  const [showViewModal, setShowViewModal] = useState(false);
  const { t } = useTranslation();

  const formatCurrency = (cents: number, currency: string = 'USD') => {
    if (!cents || cents === 0) return `0.00 ${currency}`;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  };

  const getScopeLabel = (scope: string) => {
    const labels: Record<string, string> = {
      PROJECT: t('budgets.scope.project', 'Proyecto'),
      SPRINT: t('budgets.scope.sprint', 'Sprint'),
      RELEASE: t('budgets.scope.release', 'Release'),
    };
    return labels[scope] || scope;
  };

  const plannedTotal = budget.lines?.reduce((sum, line) => sum + line.plannedCents, 0) || 0;
  const expensesCount = budget._count?.expenses || 0;
  const linesCount = budget._count?.lines || 0;

  return (
    <>
      <div
        className="cursor-pointer"
        onClick={() => setShowViewModal(true)}
      >
        <Card className="hover:shadow-lg transition-shadow">
          <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {budget.name}
            </h3>
            <p className="text-sm text-gray-600">
              {budget.project?.name}
            </p>
          </div>
          <Badge variant="info">
            {getScopeLabel(budget.scope)}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{t('budgets.planned', 'Planificado')}:</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(plannedTotal, budget.currency)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{t('budgets.linesLabel', 'Lines')}:</span>
            <span className="text-gray-900">{linesCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{t('budgets.expenses', 'Gastos')}:</span>
            <span className="text-gray-900">{expensesCount}</span>
          </div>
        </div>

        <div className="flex gap-2 pt-3 border-t border-gray-200">
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowViewModal(true);
            }}
          >
            {t('common.view', 'Ver')}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(budget.id);
            }}
          >
            {t('common.delete', 'Eliminar')}
          </Button>
        </div>
      </div>

      {showViewModal && (
        <BudgetViewModal
          budgetId={budget.id}
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          onDelete={() => {
            onDelete(budget.id);
            setShowViewModal(false);
          }}
        />
      )}
      </Card>
      </div>
    </>
  );
};

export default BudgetCard;

