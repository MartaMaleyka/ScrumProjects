import React from 'react';
import { useTranslation } from 'react-i18next';
import type { BudgetMetrics } from '../../../services/premium/budgetService';
import { Card } from '../../ui/Card';

interface BudgetMetricsCardsProps {
  metrics: BudgetMetrics;
}

const BudgetMetricsCards: React.FC<BudgetMetricsCardsProps> = ({ metrics }) => {
  const { t } = useTranslation();

  const formatCurrency = (cents: number) => {
    // Siempre formatear desde centavos, no usar valores formateados pre-calculados
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: metrics.currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  };

  const cards = [
    {
      title: t('budgets.metrics.planned', 'Planificado'),
      value: formatCurrency(metrics.plannedTotalCents),
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: t('budgets.metrics.actual', 'Actual'),
      value: formatCurrency(metrics.actualTotalCents),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: t('budgets.metrics.remaining', 'Restante'),
      value: formatCurrency(metrics.remainingCents),
      color: metrics.remainingCents >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: metrics.remainingCents >= 0 ? 'bg-green-50' : 'bg-red-50',
    },
    {
      title: t('budgets.metrics.burnRate', 'Burn Rate'),
      value: formatCurrency(metrics.burnRateCentsPerDay) + '/día',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: t('budgets.metrics.forecast', 'Forecast'),
      value: formatCurrency(metrics.forecastAtCompletionCents),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: t('budgets.metrics.variance', 'Varianza'),
      value: formatCurrency(metrics.forecastVarianceCents),
      color: metrics.forecastVarianceCents >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: metrics.forecastVarianceCents >= 0 ? 'bg-green-50' : 'bg-red-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, index) => (
        <Card key={index} className={`${card.bgColor} border-0`}>
          <div className="p-4">
            <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default BudgetMetricsCards;

