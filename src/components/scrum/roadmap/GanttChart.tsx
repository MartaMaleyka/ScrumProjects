/**
 * GanttChart Stub (Community Edition)
 * 
 * Este componente carga dinámicamente desde premium si está disponible.
 * El componente real está en premium/src/components/scrum/roadmap/GanttChart.tsx
 */

import React from 'react';
import UpgradeRequired from '../../common/UpgradeRequired';
import LoadingSpinner from '../common/LoadingSpinner';

interface GanttChartProps {
  projectId: number;
  sprintId?: number;
  showDependencies?: boolean;
  showCriticalPath?: boolean;
}

const GanttChart: React.FC<GanttChartProps> = (props) => {
  const [Component, setComponent] = React.useState<React.ComponentType<GanttChartProps> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const projectId = props?.projectId;

  React.useEffect(() => {
    import('../../../../premium/src/components/scrum/roadmap/GanttChart')
      .then(mod => {
        if (mod?.default) setComponent(() => mod.default);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (Component && projectId != null) {
    return (
      <Component
        projectId={projectId}
        sprintId={props?.sprintId}
        showDependencies={props?.showDependencies}
        showCriticalPath={props?.showCriticalPath}
      />
    );
  }

  if (Component) {
    return null;
  }

  return <UpgradeRequired featureName="Gantt" />;
};

export default GanttChart;
