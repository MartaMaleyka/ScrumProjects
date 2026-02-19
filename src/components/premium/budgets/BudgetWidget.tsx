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
  const projectId = props != null && typeof (props as any).projectId === 'number' ? (props as any).projectId : undefined;

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

  if (!Component || projectId === undefined) {
    return null;
  }

  return <Component projectId={projectId} />;
};

export default BudgetWidget;
