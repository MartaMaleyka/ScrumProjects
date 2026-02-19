/**
 * RateCardCreateModal Stub (Community Edition)
 */

import React from 'react';
import { loadPremiumComponent } from '../../../config/premiumLoader';

interface RateCardCreateModalProps {
  budgetId: number;
  projectId: number;
  currency?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const RateCardCreateModal: React.FC<RateCardCreateModalProps> = (props) => {
  const [Component, setComponent] = React.useState<React.ComponentType<RateCardCreateModalProps> | null>(null);

  React.useEffect(() => {
    loadPremiumComponent('components/premium/budgets/RateCardCreateModal')
      .then(comp => {
        if (comp) {
          setComponent(comp as React.ComponentType<RateCardCreateModalProps>);
        }
      })
      .catch(() => {});
  }, []);

  if (!Component) {
    return null;
  }

  return <Component {...props} />;
};

export default RateCardCreateModal;
