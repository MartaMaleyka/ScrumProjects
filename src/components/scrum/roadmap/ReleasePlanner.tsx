/**
 * ReleasePlanner Stub (Community Edition)
 * 
 * Este componente carga dinámicamente desde premium si está disponible.
 * El componente real está en premium/src/components/scrum/roadmap/ReleasePlanner.tsx
 */

import React from 'react';
import UpgradeRequired from '../../common/UpgradeRequired';
import LoadingSpinner from '../common/LoadingSpinner';

interface ReleasePlannerProps {
  projectId: number;
}

const ReleasePlanner: React.FC<ReleasePlannerProps> = (props) => {
  const [Component, setComponent] = React.useState<React.ComponentType<ReleasePlannerProps> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const projectId = props != null && typeof (props as any).projectId === 'number' ? (props as any).projectId : undefined;

  React.useEffect(() => {
    import('../../../../premium/src/components/scrum/roadmap/ReleasePlanner')
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
    return <Component projectId={projectId} />;
  }

  if (Component) {
    return null;
  }

  return <UpgradeRequired featureName="Releases" />;
};

export default ReleasePlanner;
