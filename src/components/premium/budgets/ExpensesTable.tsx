/**
 * ExpensesTable Stub (Community Edition)
 */

import React from 'react';
import { loadPremiumComponent } from '../../../config/premiumLoader';

interface ExpensesTableProps {
  budgetId: number;
}

const ExpensesTable: React.FC<ExpensesTableProps> = (props) => {
  const [Component, setComponent] = React.useState<React.ComponentType<ExpensesTableProps> | null>(null);

  React.useEffect(() => {
    loadPremiumComponent('components/premium/budgets/ExpensesTable')
      .then(comp => {
        if (comp) {
          setComponent(comp as React.ComponentType<ExpensesTableProps>);
        }
      })
      .catch(() => {});
  }, []);

  if (!Component) {
    return null;
  }

  return <Component {...props} />;
};

export default ExpensesTable;
