/**
 * BudgetMetricsCards Stub (Community Edition)
 */

import React from 'react';
import { loadPremiumComponent } from '../../../config/premiumLoader';

interface BudgetMetricsCardsProps {
  metrics: any;
}

const BudgetMetricsCards: React.FC<BudgetMetricsCardsProps> = (props) => {
  const [Component, setComponent] = React.useState<React.ComponentType<BudgetMetricsCardsProps> | null>(null);

  React.useEffect(() => {
    loadPremiumComponent('components/premium/budgets/BudgetMetricsCards')
      .then(comp => {
        if (comp) {
          setComponent(comp as React.ComponentType<BudgetMetricsCardsProps>);
        }
      })
      .catch(() => {});
  }, []);

  if (!Component) {
    return null;
  }

  return <Component {...props} />;
};

export default BudgetMetricsCards;
