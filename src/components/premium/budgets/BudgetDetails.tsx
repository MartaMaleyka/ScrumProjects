import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import BudgetService, { type Budget, type BudgetMetrics } from '../../../services/premium/budgetService';
import BudgetMetricsCards from './BudgetMetricsCards';
import BudgetLinesTable from './BudgetLinesTable';
import ExpensesTable from './ExpensesTable';
import RateCardsTable from './RateCardsTable';
import LoadingSpinner from '../../scrum/common/LoadingSpinner';
import { ErrorState } from '../../ui/ErrorState';
import { Tabs } from '../../ui/Tabs';
import { Button } from '../../ui/Button';

interface BudgetDetailsProps {
  budgetId?: string;
}

const BudgetDetails: React.FC<BudgetDetailsProps> = ({ budgetId }) => {
  const { t } = useTranslation();
  // Obtener ID de la URL si no viene como prop
  const id = budgetId || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') || window.location.pathname.split('/').pop() : null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [metrics, setMetrics] = useState<BudgetMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id) {
      loadBudget();
      loadMetrics();
    }
  }, [id]);

  const loadBudget = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await BudgetService.getBudgetById(parseInt(id!));
      setBudget(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar presupuesto');
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const data = await BudgetService.getBudgetMetrics(parseInt(id!));
      setMetrics(data);
    } catch (err: any) {
      console.error('Error loading metrics:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar este presupuesto?')) {
      return;
    }

    try {
      await BudgetService.deleteBudget(parseInt(id!));
      if (typeof window !== 'undefined') {
        window.location.href = '/premium/budgets';
      }
    } catch (err: any) {
      alert(err.message || 'Error al eliminar presupuesto');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !budget) {
    return <ErrorState message={error || 'Presupuesto no encontrado'} onRetry={loadBudget} />;
  }

  const tabs = [
    { id: 'overview', label: t('budgets.tabs.overview', 'Resumen') },
    { id: 'lines', label: t('budgets.tabs.lines', 'Líneas Planificadas') },
    { id: 'expenses', label: t('budgets.tabs.expenses', 'Gastos') },
    { id: 'rates', label: t('budgets.tabs.rates', 'Tarifas') },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/premium/budgets';
              }
            }}
            className="text-indigo-600 hover:text-indigo-800 mb-2 flex items-center"
          >
            ← {t('common.back', 'Volver')}
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{budget.name}</h1>
          <p className="text-gray-600 mt-1">
            {budget.project?.name} • {budget.scope}
          </p>
        </div>
        <Button variant="danger" onClick={handleDelete}>
          {t('common.delete', 'Eliminar')}
        </Button>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {metrics && <BudgetMetricsCards metrics={metrics} />}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">{t('budgets.details.info', 'Información')}</h2>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-600">{t('budgets.details.currency', 'Moneda')}</dt>
                  <dd className="text-lg font-semibold">{budget.currency}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">{t('budgets.details.scope', 'Alcance')}</dt>
                  <dd className="text-lg font-semibold">{budget.scope}</dd>
                </div>
                {budget.startsAt && (
                  <div>
                    <dt className="text-sm text-gray-600">{t('budgets.details.startsAt', 'Fecha Inicio')}</dt>
                    <dd className="text-lg font-semibold">{new Date(budget.startsAt).toLocaleDateString()}</dd>
                  </div>
                )}
                {budget.endsAt && (
                  <div>
                    <dt className="text-sm text-gray-600">{t('budgets.details.endsAt', 'Fecha Fin')}</dt>
                    <dd className="text-lg font-semibold">{new Date(budget.endsAt).toLocaleDateString()}</dd>
                  </div>
                )}
              </dl>
              {budget.notes && (
                <div className="mt-4">
                  <dt className="text-sm text-gray-600 mb-2">{t('budgets.details.notes', 'Notas')}</dt>
                  <dd className="text-gray-900">{budget.notes}</dd>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'lines' && <BudgetLinesTable budgetId={budget.id} />}
        {activeTab === 'expenses' && <ExpensesTable budgetId={budget.id} />}
        {activeTab === 'rates' && <RateCardsTable budgetId={budget.id} />}
      </div>
    </div>
  );
};

export default BudgetDetails;

