/**
 * RateCardsTable Stub (Community Edition)
 */

import React from 'react';
import { loadPremiumComponent } from '../../../config/premiumLoader';

interface RateCardsTableProps {
  budgetId: number;
}

const RateCardsTable: React.FC<RateCardsTableProps> = (props) => {
  const [Component, setComponent] = React.useState<React.ComponentType<RateCardsTableProps> | null>(null);

  React.useEffect(() => {
    loadPremiumComponent('components/premium/budgets/RateCardsTable')
      .then(comp => {
        if (comp) {
          setComponent(comp as React.ComponentType<RateCardsTableProps>);
        }
      })
      .catch(() => {});
  }, []);

  if (!Component) {
    return null;
  }

  return <Component {...props} />;
};

export default RateCardsTable;
