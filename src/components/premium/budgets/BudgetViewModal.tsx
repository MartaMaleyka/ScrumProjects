import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import BudgetService, { type Budget, type BudgetMetrics } from '../../../services/premium/budgetService';
import BudgetMetricsCards from './BudgetMetricsCards';
import BudgetLinesTable from './BudgetLinesTable';
import ExpensesTable from './ExpensesTable';
import RateCardsTable from './RateCardsTable';
import LoadingSpinner from '../../scrum/common/LoadingSpinner';
import { ErrorState } from '../../ui/ErrorState';
import { Tabs } from '../../ui/Tabs';

interface BudgetViewModalProps {
  budgetId: number;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: () => void;
}

const BudgetViewModal: React.FC<BudgetViewModalProps> = ({ budgetId, isOpen, onClose, onDelete }) => {
  const { t } = useTranslation();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [metrics, setMetrics] = useState<BudgetMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isOpen && budgetId) {
      loadBudget();
      loadMetrics();
      setActiveTab('overview'); // Reset tab when modal opens
    }
  }, [isOpen, budgetId]);

  const loadBudget = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await BudgetService.getBudgetById(budgetId);
      setBudget(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar presupuesto');
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const data = await BudgetService.getBudgetMetrics(budgetId);
      setMetrics(data);
    } catch (err: any) {
      console.error('Error loading metrics:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('budgets.deleteConfirm', '¿Estás seguro de que quieres eliminar este presupuesto?'))) {
      return;
    }

    try {
      await BudgetService.deleteBudget(budgetId);
      if (onDelete) {
        onDelete();
      }
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar presupuesto');
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('common.notDefined', 'Not defined');
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getScopeLabel = (scope: string) => {
    const labels: Record<string, string> = {
      PROJECT: t('budgets.scope.project', 'Project'),
      SPRINT: t('budgets.scope.sprint', 'Sprint'),
      RELEASE: t('budgets.scope.release', 'Release'),
    };
    return labels[scope] || scope;
  };

  const tabs = [
    { id: 'overview', label: t('budgets.tabs.overview', 'Overview') },
    { id: 'lines', label: t('budgets.tabs.lines', 'Planned Lines') },
    { id: 'expenses', label: t('budgets.tabs.expenses', 'Expenses') },
    { id: 'rates', label: t('budgets.tabs.rates', 'Rates') },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={budget ? budget.name : t('budgets.title', 'Budget')}
      size="xl"
      footer={
        <>
          {onDelete && (
            <Button variant="danger" onClick={handleDelete}>
              {t('common.delete', 'Delete')}
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            {t('common.close', 'Close')}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : error || !budget ? (
        <ErrorState message={error || 'Presupuesto no encontrado'} onRetry={loadBudget} />
      ) : (
        <div className="space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-600">{t('budgets.details.currency', 'Currency')}</dt>
              <dd className="text-base font-medium text-gray-900">{budget.currency}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">{t('budgets.details.scope', 'Scope')}</dt>
              <dd className="text-base font-medium text-gray-900">{getScopeLabel(budget.scope)}</dd>
            </div>
            {budget.startsAt && (
              <div>
                <dt className="text-sm text-gray-600">{t('budgets.details.startsAt', 'Start Date')}</dt>
                <dd className="text-base font-medium text-gray-900">{formatDate(budget.startsAt)}</dd>
              </div>
            )}
            {budget.endsAt && (
              <div>
                <dt className="text-sm text-gray-600">{t('budgets.details.endsAt', 'End Date')}</dt>
                <dd className="text-base font-medium text-gray-900">{formatDate(budget.endsAt)}</dd>
              </div>
            )}
          </div>

          {budget.notes && (
            <div>
              <dt className="text-sm text-gray-600 mb-2">{t('budgets.details.notes', 'Notes')}</dt>
              <dd className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{budget.notes}</dd>
            </div>
          )}

          {/* Tabs */}
          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Contenido de tabs */}
          <div className="mt-4">
            {activeTab === 'overview' && metrics && (
              <div className="space-y-4">
                <BudgetMetricsCards metrics={metrics} />
              </div>
            )}

            {activeTab === 'lines' && (
              <BudgetLinesTable budgetId={budget.id} />
            )}

            {activeTab === 'expenses' && (
              <ExpensesTable budgetId={budget.id} />
            )}

            {activeTab === 'rates' && (
              <RateCardsTable budgetId={budget.id} />
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default BudgetViewModal;

