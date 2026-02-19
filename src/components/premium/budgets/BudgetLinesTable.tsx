/**
 * BudgetLinesTable Stub (Community Edition)
 */

import React from 'react';
import { loadPremiumComponent } from '../../../config/premiumLoader';

interface BudgetLinesTableProps {
  budgetId: number;
}

const BudgetLinesTable: React.FC<BudgetLinesTableProps> = (props) => {
  const [Component, setComponent] = React.useState<React.ComponentType<BudgetLinesTableProps> | null>(null);

  React.useEffect(() => {
    loadPremiumComponent('components/premium/budgets/BudgetLinesTable')
      .then(comp => {
        if (comp) {
          setComponent(comp as React.ComponentType<BudgetLinesTableProps>);
        }
      })
      .catch(() => {});
  }, []);

  if (!Component) {
    return null;
  }

  return <Component {...props} />;
};

export default BudgetLinesTable;
