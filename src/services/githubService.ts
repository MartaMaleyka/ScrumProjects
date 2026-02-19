/**
 * GitHub Service (Community Edition)
 * 
 * Si la feature GitHub está habilitada, delega al servicio real (premium) que llama al API.
 * Si no, lanza PREMIUM_REQUIRED.
 */

import { isFeatureEnabled } from '../config/features';

const PREMIUM_REQUIRED_ERROR = {
  code: 'PREMIUM_REQUIRED',
  message: 'This feature requires Sprintiva Premium Edition. Please upgrade to access GitHub integration.',
};

async function getRealService() {
  const mod = await import('../../premium/src/services/githubService');
  return mod.githubService;
}

class GitHubService {
  static async startOAuth(returnUrl?: string) {
    if (!isFeatureEnabled('github')) throw PREMIUM_REQUIRED_ERROR;
    return (await getRealService()).startOAuth(returnUrl);
  }

  static async testConnection() {
    if (!isFeatureEnabled('github')) throw PREMIUM_REQUIRED_ERROR;
    return (await getRealService()).testConnection();
  }

  static async listRepositories() {
    if (!isFeatureEnabled('github')) throw PREMIUM_REQUIRED_ERROR;
    return (await getRealService()).listRepositories();
  }

  static async getStatus(projectId: number) {
    if (!isFeatureEnabled('github')) throw PREMIUM_REQUIRED_ERROR;
    return (await getRealService()).getStatus(projectId);
  }

  static async linkRepository(projectId: number, owner: string, repo: string) {
    if (!isFeatureEnabled('github')) throw PREMIUM_REQUIRED_ERROR;
    return (await getRealService()).linkRepository(projectId, owner, repo);
  }

  static async unlinkRepository(projectId: number, repoLinkId: number) {
    if (!isFeatureEnabled('github')) throw PREMIUM_REQUIRED_ERROR;
    return (await getRealService()).unlinkRepository(projectId, repoLinkId);
  }

  static async getActivity(projectId: number, owner: string, repo: string) {
    if (!isFeatureEnabled('github')) throw PREMIUM_REQUIRED_ERROR;
    return (await getRealService()).getActivity(projectId, owner, repo);
  }

  static async linkCommitToTask(taskId: number, commitSha: string, owner: string, repo: string) {
    if (!isFeatureEnabled('github')) throw PREMIUM_REQUIRED_ERROR;
    return (await getRealService()).linkCommitToTask(taskId, commitSha, owner, repo);
  }
}

// Tipos exportados para compatibilidad (definidos en premium)
export interface GitHubStatus {
  isConnected: boolean;
  githubUsername: string | null;
  linkedRepos: Array<{
    id: number;
    owner: string;
    repo: string;
    isActive: boolean;
  }>;
}

export interface GitHubActivity {
  pullRequests: Array<{
    number: number;
    title: string;
    state: string;
    merged: boolean;
    html_url: string;
    linkedTask?: {
      id: number;
      title: string;
      status: string;
    } | null;
  }>;
  commits: Array<{
    sha: string;
    commit: {
      message: string;
    };
    html_url: string;
    linkedTask?: {
      id: number;
      title: string;
      status: string;
    } | null;
  }>;
  linksCreated: {
    prs: number;
    commits: number;
  };
}

// Export de compatibilidad con el módulo premium
// En Premium se exporta un objeto/servicio llamado `githubService`.
// Aquí exponemos la clase estática bajo ese nombre para que
// los imports existentes sigan funcionando.
export const githubService = GitHubService;

export default GitHubService;
