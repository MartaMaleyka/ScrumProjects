/**
 * BudgetCard Stub (Community Edition)
 * 
 * Este componente carga dinámicamente desde premium si está disponible.
 * El componente real está en premium/src/components/premium/budgets/BudgetCard.tsx
 * 
 * Si premium no está disponible, retorna null (no se muestra nada).
 * Este componente se usa internamente por BudgetsPage, que ya maneja el caso
 * de premium no disponible mostrando UpgradeRequired.
 */

import React from 'react';
import { loadPremiumComponent } from '../../../config/premiumLoader';

interface BudgetCardProps {
  budget: any;
  onDelete: (id: number) => void;
}

const BudgetCard: React.FC<BudgetCardProps> = (props) => {
  const [Component, setComponent] = React.useState<React.ComponentType<BudgetCardProps> | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadPremiumComponent('components/premium/budgets/BudgetCard')
      .then(comp => {
        if (comp) {
          setComponent(comp as React.ComponentType<BudgetCardProps>);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  // Si está cargando o no hay componente, retornar null
  // BudgetsPage ya maneja el caso de premium no disponible
  if (loading || !Component) {
    return null;
  }

  return <Component {...props} />;
};

export default BudgetCard;
