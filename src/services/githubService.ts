/**
 * GitHub Service Stub (Community Edition)
 * 
 * Este servicio lanza un error indicando que GitHub es una feature premium.
 * El servicio real está en premium/src/services/githubService.ts
 */

const PREMIUM_REQUIRED_ERROR = {
  code: 'PREMIUM_REQUIRED',
  message: 'This feature requires Sprintiva Premium Edition. Please upgrade to access GitHub integration.',
};

class GitHubService {
  private static async throwPremiumError() {
    throw PREMIUM_REQUIRED_ERROR;
  }

  static async startOAuth(returnUrl?: string) {
    await this.throwPremiumError();
  }

  static async testConnection() {
    await this.throwPremiumError();
  }

  static async listRepositories() {
    await this.throwPremiumError();
  }

  static async getStatus(projectId: number) {
    await this.throwPremiumError();
  }

  static async linkRepository(projectId: number, owner: string, repo: string) {
    await this.throwPremiumError();
  }

  static async unlinkRepository(projectId: number, repoLinkId: number) {
    await this.throwPremiumError();
  }

  static async getActivity(projectId: number, owner: string, repo: string) {
    await this.throwPremiumError();
  }

  static async linkCommitToTask(taskId: number, commitSha: string, owner: string, repo: string) {
    await this.throwPremiumError();
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

export default GitHubService;
