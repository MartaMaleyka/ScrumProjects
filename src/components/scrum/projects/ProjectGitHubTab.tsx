import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { githubService, type GitHubStatus, type GitHubActivity } from '../../../services/githubService';
import { useAuth } from '../../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';
import { Button } from '../../ui/Button';

interface ProjectGitHubTabProps {
  projectId: number;
}

const ProjectGitHubTab: React.FC<ProjectGitHubTabProps> = ({ projectId }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [activity, setActivity] = useState<{ [key: string]: GitHubActivity }>({});
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState<{ [key: string]: boolean }>({});
  const [newRepoOwner, setNewRepoOwner] = useState('');
  const [newRepoName, setNewRepoName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canManage = user?.globalRole === 'ADMIN' || user?.globalRole === 'MANAGER';

  useEffect(() => {
    loadStatus();
  }, [projectId]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await githubService.getStatus(projectId);
      if (response.success && response.data) {
        setStatus(response.data.status || response.data as any);
      }
    } catch (err: any) {
      setError(err.message || t('github.error.loading', 'Error al cargar estado'));
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGitHub = async () => {
    try {
      const response = await githubService.startOAuth();
      if (response.success && response.data?.authUrl) {
        window.location.href = response.data.authUrl;
      }
    } catch (err: any) {
      setError(err.message || t('github.error.connecting', 'Error al conectar con GitHub'));
    }
  };

  const handleLinkRepository = async () => {
    if (!newRepoOwner || !newRepoName) {
      setError(t('github.error.missingFields', 'Owner y repo son requeridos'));
      return;
    }

    try {
      setLinking(true);
      setError(null);
      const response = await githubService.linkRepository(projectId, newRepoOwner, newRepoName);
      if (response.success) {
        setNewRepoOwner('');
        setNewRepoName('');
        await loadStatus();
      }
    } catch (err: any) {
      setError(err.message || t('github.error.linking', 'Error al vincular repositorio'));
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkRepository = async (repoLinkId: number) => {
    if (!confirm(t('github.confirmUnlink', '¿Desvincular este repositorio?'))) {
      return;
    }

    try {
      const response = await githubService.unlinkRepository(projectId, repoLinkId);
      if (response.success) {
        await loadStatus();
        // Limpiar actividad del repo desvinculado
        const repoKey = `${status?.linkedRepos.find(r => r.id === repoLinkId)?.owner}/${status?.linkedRepos.find(r => r.id === repoLinkId)?.repo}`;
        if (repoKey) {
          const newActivity = { ...activity };
          delete newActivity[repoKey];
          setActivity(newActivity);
        }
      }
    } catch (err: any) {
      setError(err.message || t('github.error.unlinking', 'Error al desvincular repositorio'));
    }
  };

  const loadActivity = async (owner: string, repo: string) => {
    const repoKey = `${owner}/${repo}`;
    if (loadingActivity[repoKey]) return;

    try {
      setLoadingActivity(prev => ({ ...prev, [repoKey]: true }));
      const response = await githubService.getActivity(projectId, owner, repo);
      if (response.success && response.data) {
        setActivity(prev => ({
          ...prev,
          [repoKey]: response.data!.activity || response.data as any
        }));
      }
    } catch (err: any) {
      console.error('Error al cargar actividad:', err);
    } finally {
      setLoadingActivity(prev => ({ ...prev, [repoKey]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" text={t('github.loading', 'Cargando...')} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Estado de conexión */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('github.connection', 'Conexión con GitHub')}
        </h3>
        
        {!status?.isConnected ? (
          <div className="text-center py-8">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
            </svg>
            <p className="text-gray-600 mb-4">
              {t('github.notConnected', 'No tienes una cuenta de GitHub conectada')}
            </p>
            <Button
              onClick={handleConnectGitHub}
              variant="primary"
            >
              {t('github.connect', 'Conectar GitHub')}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {t('github.connectedAs', 'Conectado como')}
              </p>
              <p className="text-lg font-semibold text-gray-900">
                @{status.githubUsername}
              </p>
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">{t('github.connected', 'Conectado')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Repositorios vinculados */}
      {status?.isConnected && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('github.linkedRepos', 'Repositorios Vinculados')}
              </h3>
              {canManage && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={t('github.owner', 'Owner')}
                    value={newRepoOwner}
                    onChange={(e) => setNewRepoOwner(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <span className="text-gray-500">/</span>
                  <input
                    type="text"
                    placeholder={t('github.repo', 'Repo')}
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <Button
                    onClick={handleLinkRepository}
                    variant="primary"
                    size="sm"
                    disabled={linking || !newRepoOwner || !newRepoName}
                  >
                    {linking ? t('common.loading', '...') : t('github.link', 'Vincular')}
                  </Button>
                </div>
              )}
            </div>

            {status.linkedRepos.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                {t('github.noRepos', 'Aún no hay repositorios vinculados')}
              </p>
            ) : (
              <div className="space-y-3">
                {status.linkedRepos.map((repo) => (
                  <div
                    key={repo.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <a
                          href={`https://github.com/${repo.owner}/${repo.repo}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          {repo.owner}/{repo.repo}
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => loadActivity(repo.owner, repo.repo)}
                        variant="secondary"
                        size="sm"
                        disabled={loadingActivity[`${repo.owner}/${repo.repo}`]}
                      >
                        {loadingActivity[`${repo.owner}/${repo.repo}`] 
                          ? t('common.loading', '...') 
                          : t('github.viewActivity', 'Ver Actividad')}
                      </Button>
                      {canManage && (
                        <Button
                          onClick={() => handleUnlinkRepository(repo.id)}
                          variant="danger"
                          size="sm"
                        >
                          {t('github.unlink', 'Desvincular')}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actividad */}
          {Object.keys(activity).length > 0 && (
            <div className="space-y-6">
              {Object.entries(activity).map(([repoKey, repoActivity]) => (
                <div key={repoKey} className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {t('github.activity', 'Actividad')} - {repoKey}
                  </h3>

                  {/* Pull Requests */}
                  {repoActivity.pullRequests.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-md font-semibold text-gray-700 mb-3">
                        {t('github.pullRequests', 'Pull Requests')}
                      </h4>
                      <div className="space-y-2">
                        {repoActivity.pullRequests.map((pr) => (
                          <div
                            key={pr.number}
                            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <a
                                  href={pr.html_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                                >
                                  #{pr.number} {pr.title}
                                </a>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  pr.merged
                                    ? 'bg-purple-100 text-purple-700'
                                    : pr.state === 'open'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {pr.merged ? t('github.merged', 'Merged') : pr.state}
                                </span>
                              </div>
                              {pr.linkedTask && (
                                <div className="text-sm text-gray-600">
                                  {t('github.linkedTo', 'Vinculado a')}{' '}
                                  <span className="font-medium text-indigo-600">
                                    SP-{pr.linkedTask.id}: {pr.linkedTask.title}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Commits */}
                  {repoActivity.commits.length > 0 && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-700 mb-3">
                        {t('github.commits', 'Commits')}
                      </h4>
                      <div className="space-y-2">
                        {repoActivity.commits.map((commit) => (
                          <div
                            key={commit.sha}
                            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <a
                                  href={commit.html_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                                >
                                  {commit.sha.substring(0, 7)} - {commit.commit.message.split('\n')[0]}
                                </a>
                              </div>
                              {commit.linkedTask && (
                                <div className="text-sm text-gray-600">
                                  {t('github.linkedTo', 'Vinculado a')}{' '}
                                  <span className="font-medium text-indigo-600">
                                    SP-{commit.linkedTask.id}: {commit.linkedTask.title}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProjectGitHubTab;

