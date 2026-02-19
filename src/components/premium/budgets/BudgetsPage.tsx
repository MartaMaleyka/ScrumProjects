/**
 * BudgetsPage Stub (Community Edition)
 * 
 * Este componente muestra UpgradeRequired cuando premium no está disponible.
 * El componente real está en premium/src/components/premium/budgets/BudgetsPage.tsx
 */

import React from 'react';
import { loadPremiumComponent } from '../../../config/premiumLoader';
import UpgradeRequired from '../../common/UpgradeRequired';
import LoadingSpinner from '../../scrum/common/LoadingSpinner';

interface BudgetsPageProps {
  projectId?: number;
}

const BudgetsPage: React.FC<BudgetsPageProps> = (props) => {
  const [Component, setComponent] = React.useState<React.ComponentType<BudgetsPageProps> | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadPremiumComponent('components/premium/budgets/BudgetsPage')
      .then(comp => {
        if (comp) {
          setComponent(comp as React.ComponentType<BudgetsPageProps>);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <LoadingSpinner key="budgets-loading" />;
  }

  if (Component) {
    return <Component key="budgets-premium" {...props} />;
  }

  return <UpgradeRequired key="budgets-upgrade" featureName="Presupuestos" />;
};

export default BudgetsPage;
