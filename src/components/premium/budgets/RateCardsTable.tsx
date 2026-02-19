import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import RateCardService from '../../../services/premium/rateCardService';
import type { RateCard } from '../../../services/premium/budgetService';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell } from '../../ui/Table';
import { Button } from '../../ui/Button';
import LoadingSpinner from '../../scrum/common/LoadingSpinner';
import { ErrorState } from '../../ui/ErrorState';
import RateCardCreateModal from './RateCardCreateModal';
import BudgetService from '../../../services/premium/budgetService';

interface RateCardsTableProps {
  budgetId: number;
}

const RateCardsTable: React.FC<RateCardsTableProps> = ({ budgetId }) => {
  const { t } = useTranslation();
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [budget, setBudget] = useState<any>(null);

  useEffect(() => {
    loadRateCards();
    loadBudget();
  }, [budgetId]);

  const loadBudget = async () => {
    try {
      const data = await BudgetService.getBudgetById(budgetId);
      setBudget(data);
    } catch (err) {
      console.error('Error loading budget:', err);
    }
  };

  const loadRateCards = async () => {
    try {
      setLoading(true);
      const response = await RateCardService.getRateCards({ budgetId });
      setRateCards(response.rateCards || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar tarifas');
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
  if (error) return <ErrorState message={error} onRetry={loadRateCards} />;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowCreateModal(true)}
        >
          {t('budgets.rates.add', 'Add Rate Card')}
        </Button>
      </div>
      <Table>
      <TableHeader>
        <tr>
          <TableHeaderCell>{t('budgets.rates.user', 'Usuario')}</TableHeaderCell>
          <TableHeaderCell>{t('budgets.rates.role', 'Rol')}</TableHeaderCell>
          <TableHeaderCell>{t('budgets.rates.rate', 'Tarifa/Hora')}</TableHeaderCell>
          <TableHeaderCell>{t('budgets.rates.from', 'Desde')}</TableHeaderCell>
          <TableHeaderCell>{t('budgets.rates.to', 'Hasta')}</TableHeaderCell>
          <TableHeaderCell>{t('common.actions', 'Acciones')}</TableHeaderCell>
        </tr>
      </TableHeader>
      <TableBody>
        {rateCards.map((rateCard) => (
          <TableRow key={rateCard.id}>
            <TableCell>{rateCard.user?.name || '-'}</TableCell>
            <TableCell>{rateCard.projectRole || '-'}</TableCell>
            <TableCell>{formatCurrency(rateCard.hourlyCents, rateCard.currency) + '/hora'}</TableCell>
            <TableCell>
              {rateCard.effectiveFrom ? new Date(rateCard.effectiveFrom).toLocaleDateString() : '-'}
            </TableCell>
            <TableCell>
              {rateCard.effectiveTo ? new Date(rateCard.effectiveTo).toLocaleDateString() : '-'}
            </TableCell>
            <TableCell>
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  if (confirm('¿Eliminar esta tarifa?')) {
                    try {
                      await RateCardService.deleteRateCard(rateCard.id);
                      loadRateCards();
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

      {showCreateModal && budget && (
        <RateCardCreateModal
          budgetId={budgetId}
          projectId={budget.projectId}
          currency={budget.currency}
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadRateCards();
          }}
        />
      )}
    </div>
  );
};

export default RateCardsTable;

