/**
 * RoadmapView Stub (Community Edition)
 * 
 * Este componente carga dinámicamente desde premium si está disponible.
 * El componente real está en premium/src/components/scrum/roadmap/RoadmapView.tsx
 */

import React from 'react';
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
  const projectId = props != null && typeof (props as any).projectId === 'number' ? (props as any).projectId : undefined;

  React.useEffect(() => {
    import('../../../../premium/src/components/scrum/roadmap/RoadmapView')
      .then(mod => {
        if (mod?.default) setComponent(() => mod.default);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (Component && projectId !== undefined) {
    return (
      <Component
        projectId={projectId}
        startDate={props?.startDate}
        endDate={props?.endDate}
        viewMode={props?.viewMode}
      />
    );
  }

  if (Component) {
    return null;
  }

  return <UpgradeRequired featureName="Roadmap" />;
};

export default RoadmapView;
