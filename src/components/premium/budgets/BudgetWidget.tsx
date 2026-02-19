/**
 * BudgetWidget Stub (Community Edition)
 * 
 * Este componente carga dinámicamente desde premium si está disponible.
 * El componente real está en premium/src/components/premium/budgets/BudgetWidget.tsx
 */

import React from 'react';
import { loadPremiumComponent } from '../../../config/premiumLoader';

interface BudgetWidgetProps {
  projectId: number;
}

const BudgetWidget: React.FC<BudgetWidgetProps> = (props) => {
  const [Component, setComponent] = React.useState<React.ComponentType<BudgetWidgetProps> | null>(null);

  React.useEffect(() => {
    loadPremiumComponent('components/premium/budgets/BudgetWidget')
      .then(comp => {
        if (comp) {
          setComponent(comp as React.ComponentType<BudgetWidgetProps>);
        }
      })
      .catch(() => {
        // Premium no disponible, no mostrar nada
      });
  }, []);

  if (!Component) {
    return null; // No mostrar widget si premium no está disponible
  }

  return <Component {...props} />;
};

export default BudgetWidget;
