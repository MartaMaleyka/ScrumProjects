/**
 * BudgetViewModal Stub (Community Edition)
 */

import React from 'react';
import { loadPremiumComponent } from '../../../config/premiumLoader';

interface BudgetViewModalProps {
  budgetId: number;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: () => void;
}

const BudgetViewModal: React.FC<BudgetViewModalProps> = (props) => {
  const [Component, setComponent] = React.useState<React.ComponentType<BudgetViewModalProps> | null>(null);

  React.useEffect(() => {
    loadPremiumComponent('components/premium/budgets/BudgetViewModal')
      .then(comp => {
        if (comp) {
          setComponent(comp as React.ComponentType<BudgetViewModalProps>);
        }
      })
      .catch(() => {});
  }, []);

  if (!Component) {
    return null;
  }

  return <Component {...props} />;
};

export default BudgetViewModal;
