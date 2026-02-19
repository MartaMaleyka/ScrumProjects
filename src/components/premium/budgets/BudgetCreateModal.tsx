/**
 * BudgetCreateModal Stub (Community Edition)
 */

import React from 'react';
import { loadPremiumComponent } from '../../../config/premiumLoader';

interface BudgetCreateModalProps {
  projectId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

const BudgetCreateModal: React.FC<BudgetCreateModalProps> = (props) => {
  const [Component, setComponent] = React.useState<React.ComponentType<BudgetCreateModalProps> | null>(null);

  React.useEffect(() => {
    loadPremiumComponent('components/premium/budgets/BudgetCreateModal')
      .then(comp => {
        if (comp) {
          setComponent(comp as React.ComponentType<BudgetCreateModalProps>);
        }
      })
      .catch(() => {});
  }, []);

  if (!Component) {
    return null;
  }

  return <Component {...props} />;
};

export default BudgetCreateModal;
