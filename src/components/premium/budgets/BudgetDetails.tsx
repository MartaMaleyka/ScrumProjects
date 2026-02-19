/**
 * BudgetDetails Stub (Community Edition)
 */

import React from 'react';
import { loadPremiumComponent } from '../../../config/premiumLoader';
import UpgradeRequired from '../../common/UpgradeRequired';

interface BudgetDetailsProps {
  budgetId: string;
}

const BudgetDetails: React.FC<BudgetDetailsProps> = (props) => {
  const [Component, setComponent] = React.useState<React.ComponentType<BudgetDetailsProps> | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadPremiumComponent('components/premium/budgets/BudgetDetails')
      .then(comp => {
        if (comp) {
          setComponent(comp as React.ComponentType<BudgetDetailsProps>);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (Component) {
    return <Component {...props} />;
  }

  return <UpgradeRequired featureName="Presupuestos" />;
};

export default BudgetDetails;
