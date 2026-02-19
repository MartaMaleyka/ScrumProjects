import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isFeatureEnabled } from '../../../config/features';
import BudgetService, { type Budget } from '../../../services/premium/budgetService';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import LoadingSpinner from '../../scrum/common/LoadingSpinner';
import BudgetViewModal from './BudgetViewModal';

interface BudgetWidgetProps {
  projectId: number;
}

const BudgetWidget: React.FC<BudgetWidgetProps> = ({ projectId }) => {
  const { t } = useTranslation();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  useEffect(() => {
    if (isFeatureEnabled('budgets')) {
      loadBudgets();
    }
  }, [projectId]);

  const loadBudgets = async () => {
    try {
      const response = await BudgetService.getBudgets({ projectId, limit: 3 });
      setBudgets(response.budgets || []);
    } catch (err) {
      console.error('Error loading budgets:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isFeatureEnabled('budgets')) {
    return null;
  }

  const formatCurrency = (cents: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(cents / 100);
  };

  if (loading) {
    return (
      <Card className="p-4">
        <LoadingSpinner size="sm" />
      </Card>
    );
  }

  const totalPlanned = budgets.reduce((sum, budget) => {
    const planned = budget.lines?.reduce((lineSum, line) => lineSum + line.plannedCents, 0) || 0;
    return sum + planned;
  }, 0);

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-base font-semibold text-gray-900">
          {t('budgets.widget.title', 'Presupuestos')}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.href = `/premium/budgets?projectId=${projectId}`;
            }
          }}
        >
          {t('common.viewAll', 'Ver todos')}
        </Button>
      </div>

      {budgets.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-gray-600 mb-3">
            {t('budgets.widget.empty', 'No hay presupuestos para este proyecto')}
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = `/premium/budgets?projectId=${projectId}`;
              }
            }}
          >
            {t('budgets.widget.create', 'Crear Presupuesto')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((budget) => {
            const planned = budget.lines?.reduce((sum, line) => sum + line.plannedCents, 0) || 0;
            return (
              <div
                key={budget.id}
                className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => {
                  setSelectedBudgetId(budget.id);
                  setShowViewModal(true);
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{budget.name}</p>
                    <p className="text-xs text-gray-600 mt-1">{budget.scope}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(planned, budget.currency)}
                  </p>
                </div>
              </div>
            );
          })}
          <div className="pt-2 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {t('budgets.widget.total', 'Total Planificado')}:
              </span>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(totalPlanned)}
              </span>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedBudgetId && (
        <BudgetViewModal
          budgetId={selectedBudgetId}
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedBudgetId(null);
          }}
          onDelete={() => {
            setShowViewModal(false);
            setSelectedBudgetId(null);
            loadBudgets();
          }}
        />
      )}
    </Card>
  );
};

export default BudgetWidget;

