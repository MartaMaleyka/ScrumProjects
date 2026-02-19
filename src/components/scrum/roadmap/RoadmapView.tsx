/**
 * RoadmapView Stub (Community Edition)
 * 
 * Este componente carga dinámicamente desde premium si está disponible.
 * El componente real está en premium/src/components/scrum/roadmap/RoadmapView.tsx
 */

import React from 'react';
import { loadPremiumComponent } from '../../../config/premiumLoader';
import UpgradeRequired from '../../common/UpgradeRequired';
import LoadingSpinner from '../common/LoadingSpinner';

interface RoadmapViewProps {
  projectId: number;
  startDate?: Date;
  endDate?: Date;
  viewMode?: 'month' | 'quarter' | 'year';
}

const RoadmapView: React.FC<RoadmapViewProps> = (props) => {
  const [Component, setComponent] = React.useState<React.ComponentType<RoadmapViewProps> | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadPremiumComponent('components/scrum/roadmap/RoadmapView')
      .then(comp => {
        if (comp) {
          setComponent(comp as React.ComponentType<RoadmapViewProps>);
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

  return <UpgradeRequired featureName="Roadmap" />;
};

export default RoadmapView;
