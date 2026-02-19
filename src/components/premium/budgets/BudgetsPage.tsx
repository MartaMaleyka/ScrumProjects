import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isFeatureEnabled } from '../../../config/features';
import UpgradeRequired from '../../common/UpgradeRequired';
import BudgetService, { type Budget, type BudgetFilters } from '../../../services/premium/budgetService';
import BudgetCreateModal from './BudgetCreateModal';
import BudgetCard from './BudgetCard';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import LoadingSpinner from '../../scrum/common/LoadingSpinner';
import { Button } from '../../ui/Button';

interface BudgetsPageProps {
  projectId?: number;
}

const BudgetsPage: React.FC<BudgetsPageProps> = ({ projectId: propProjectId }) => {
  const { t } = useTranslation();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Obtener projectId de props o de query string
  const projectId = propProjectId || (typeof window !== 'undefined' ? parseInt(new URLSearchParams(window.location.search).get('projectId') || '0') || undefined : undefined);
  
  const [filters, setFilters] = useState<BudgetFilters>({
    projectId,
    page: 1,
    limit: 20,
  });

  // Verificar feature flag
  if (!isFeatureEnabled('budgets')) {
    return <UpgradeRequired featureName="Presupuestos" />;
  }

  useEffect(() => {
    loadBudgets();
  }, [filters]);

  const loadBudgets = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await BudgetService.getBudgets(filters);
      setBudgets(response.budgets);
    } catch (err: any) {
      setError(err.message || 'Error al cargar presupuestos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    loadBudgets();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este presupuesto?')) {
      return;
    }

    try {
      await BudgetService.deleteBudget(id);
      loadBudgets();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar presupuesto');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadBudgets} />;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('budgets.title', 'Presupuestos')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('budgets.subtitle', 'Gestiona los presupuestos de tus proyectos')}
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          variant="primary"
        >
          {t('budgets.create', 'Nuevo Presupuesto')}
        </Button>
      </div>

      {budgets.length === 0 ? (
        <EmptyState
          title={t('budgets.empty.title', 'No hay presupuestos')}
          description={t('budgets.empty.message', 'Crea tu primer presupuesto para comenzar a gestionar los costos de tu proyecto')}
          action={
            <Button
              onClick={() => setShowCreateModal(true)}
              variant="primary"
            >
              {t('budgets.empty.action', 'Crear Presupuesto')}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <BudgetCreateModal
          projectId={projectId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
};

export default BudgetsPage;

