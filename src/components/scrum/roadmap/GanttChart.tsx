/**
 * GanttChart Stub (Community Edition)
 * 
 * Este componente carga dinámicamente desde premium si está disponible.
 * El componente real está en premium/src/components/scrum/roadmap/GanttChart.tsx
 */

import React from 'react';
import { loadPremiumComponent } from '../../../config/premiumLoader';
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

  React.useEffect(() => {
    loadPremiumComponent('components/scrum/roadmap/GanttChart')
      .then(comp => {
        if (comp) {
          setComponent(comp as React.ComponentType<GanttChartProps>);
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

  return <UpgradeRequired featureName="Gantt" />;
};

export default GanttChart;
