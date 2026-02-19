/**
 * ExpenseCreateModal Stub (Community Edition)
 */

import React from 'react';
import { loadPremiumComponent } from '../../../config/premiumLoader';

interface ExpenseCreateModalProps {
  budgetId: number;
  projectId: number;
  currency?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ExpenseCreateModal: React.FC<ExpenseCreateModalProps> = (props) => {
  const [Component, setComponent] = React.useState<React.ComponentType<ExpenseCreateModalProps> | null>(null);

  React.useEffect(() => {
    loadPremiumComponent('components/premium/budgets/ExpenseCreateModal')
      .then(comp => {
        if (comp) {
          setComponent(comp as React.ComponentType<ExpenseCreateModalProps>);
        }
      })
      .catch(() => {});
  }, []);

  if (!Component) {
    return null;
  }

  return <Component {...props} />;
};

export default ExpenseCreateModal;
