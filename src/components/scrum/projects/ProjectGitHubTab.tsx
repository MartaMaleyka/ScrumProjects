/**
 * ProjectGitHubTab Stub (Community Edition)
 * 
 * Este componente carga dinámicamente desde premium si está disponible.
 * El componente real está en premium/src/components/scrum/projects/ProjectGitHubTab.tsx
 */

import React from 'react';
import { loadPremiumComponent } from '../../../config/premiumLoader';
import UpgradeRequired from '../../common/UpgradeRequired';
import LoadingSpinner from '../common/LoadingSpinner';

interface ProjectGitHubTabProps {
  projectId: number;
}

const ProjectGitHubTab: React.FC<ProjectGitHubTabProps> = (props) => {
  const [Component, setComponent] = React.useState<React.ComponentType<ProjectGitHubTabProps> | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadPremiumComponent('components/scrum/projects/ProjectGitHubTab')
      .then(comp => {
        if (comp) {
          setComponent(comp as React.ComponentType<ProjectGitHubTabProps>);
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

  return <UpgradeRequired featureName="GitHub Integration" />;
};

export default ProjectGitHubTab;
