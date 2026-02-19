/**
 * ReleasePlanner Stub (Community Edition)
 * 
 * Este componente carga dinámicamente desde premium si está disponible.
 * El componente real está en premium/src/components/scrum/roadmap/ReleasePlanner.tsx
 */

import React from 'react';
import { loadPremiumComponent } from '../../../config/premiumLoader';
import UpgradeRequired from '../../common/UpgradeRequired';
import LoadingSpinner from '../common/LoadingSpinner';

interface ReleasePlannerProps {
  projectId: number;
}

const ReleasePlanner: React.FC<ReleasePlannerProps> = (props) => {
  const [Component, setComponent] = React.useState<React.ComponentType<ReleasePlannerProps> | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadPremiumComponent('components/scrum/roadmap/ReleasePlanner')
      .then(comp => {
        if (comp) {
          setComponent(comp as React.ComponentType<ReleasePlannerProps>);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (Component) {
    return <Component {...props} />;
  }

  return <UpgradeRequired featureName="Releases" />;
};

export default ReleasePlanner;
