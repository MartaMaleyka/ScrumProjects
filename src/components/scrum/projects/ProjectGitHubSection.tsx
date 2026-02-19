/**
 * ProjectGitHubSection Stub (Community Edition)
 * 
 * Este componente carga dinámicamente desde premium si está disponible.
 * El componente real está en premium/src/components/scrum/projects/ProjectGitHubSection.tsx
 */

import React from 'react';
import { loadPremiumComponent } from '../../../config/premiumLoader';
import UpgradeRequired from '../../common/UpgradeRequired';
import LoadingSpinner from '../common/LoadingSpinner';

interface ProjectGitHubSectionProps {
  projectId: number;
}

const ProjectGitHubSection: React.FC<ProjectGitHubSectionProps> = (props) => {
  const [Component, setComponent] = React.useState<React.ComponentType<ProjectGitHubSectionProps> | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadPremiumComponent('components/scrum/projects/ProjectGitHubSection')
      .then(comp => {
        if (comp) {
          setComponent(comp as React.ComponentType<ProjectGitHubSectionProps>);
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

export default ProjectGitHubSection;
