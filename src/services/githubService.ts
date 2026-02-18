import { API_BASE_URL, fetchWithTimeout, REQUEST_TIMEOUT } from '../config/api';

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

class GitHubService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; error?: string; message?: string }> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    if (!token) {
      console.error('❌ [GitHubService] No hay token de autenticación en localStorage');
      return {
        success: false,
        error: 'No hay token de autenticación',
        message: 'Debes iniciar sesión para usar esta funcionalidad',
      };
    }

    console.log('🔑 [GitHubService] Token encontrado, haciendo petición a:', endpoint);

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
      ...options,
    };

    // Agregar timestamp a las peticiones GET para evitar caché
    let url = `${API_BASE_URL}${endpoint}`;
    if ((options.method === 'GET' || !options.method) && !endpoint.includes('?')) {
      url += `?_t=${Date.now()}`;
    } else if ((options.method === 'GET' || !options.method) && endpoint.includes('?')) {
      url += `&_t=${Date.now()}`;
    }

    try {
      console.log('🌐 [GitHubService] Realizando petición:', {
        url,
        method: options.method || 'GET',
        hasToken: !!token,
        tokenLength: token?.length
      });

      const response = await fetchWithTimeout(
        url,
        config,
        REQUEST_TIMEOUT
      );

      console.log('📥 [GitHubService] Respuesta recibida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ [GitHubService] Error en respuesta:', {
          status: response.status,
          error: data.error,
          message: data.message
        });

        // Si es un error 401, verificar si es un problema de autenticación de la app o de GitHub
        if (response.status === 401) {
          console.error('🔒 [GitHubService] Error de autenticación:', {
            error: data.error,
            message: data.message,
            endpoint
          });
          
          // Solo redirigir al login si el error es específicamente sobre el token de la aplicación
          // No redirigir si es un error relacionado con GitHub (token de GitHub expirado, etc.)
          const errorMsg = (data.message || data.error || '').toLowerCase();
          const isAppAuthError = errorMsg.includes('token no proporcionado') || 
                                 errorMsg.includes('se requiere token de autenticación') ||
                                 errorMsg.includes('token expirado') && !errorMsg.includes('github') ||
                                 errorMsg.includes('sesión ha expirado');
          
          if (typeof window !== 'undefined' && isAppAuthError) {
            console.error('🔒 [GitHubService] Token de aplicación expirado o inválido, redirigiendo al login');
            localStorage.removeItem('authToken');
            window.location.href = '/login-moderno?expired=true';
            return {
              success: false,
              error: 'Sesión expirada',
              message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
            };
          }
          
          // Si es un error de GitHub, no redirigir, solo devolver el error
          console.log('⚠️ [GitHubService] Error relacionado con GitHub, no con autenticación de la app');
        }
        
        return {
          success: false,
          error: data.error || 'Error en la petición',
          message: data.message || data.error || 'Error desconocido',
        };
      }

      console.log('✅ [GitHubService] Petición exitosa');
      console.log('📦 [GitHubService] Datos recibidos:', {
        hasData: !!data,
        hasDataData: !!data.data,
        dataKeys: data ? Object.keys(data) : [],
        dataDataKeys: data?.data ? Object.keys(data.data) : [],
        fullData: JSON.stringify(data).substring(0, 500)
      });
      return {
        success: true,
        data: data.data || data,
        error: data.error,
        message: data.message
      };
    } catch (error: any) {
      console.error('❌ [GitHubService] Error en petición:', error);
      return {
        success: false,
        error: error.message || 'Error de conexión',
      };
    }
  }

  /**
   * Inicia el flujo OAuth de GitHub
   * @param returnUrl - URL a la que redirigir después de conectar (opcional)
   */
  async startOAuth(returnUrl?: string): Promise<{ success: boolean; data?: { authUrl: string }; error?: string; message?: string }> {
    const url = returnUrl 
      ? `/integrations/github/oauth/start?returnUrl=${encodeURIComponent(returnUrl)}`
      : '/integrations/github/oauth/start';
    return this.request<{ authUrl: string }>(url);
  }

  /**
   * Obtiene el estado de la integración GitHub para un proyecto
   */
  async getStatus(projectId: number): Promise<{ success: boolean; data?: GitHubStatus; error?: string; message?: string }> {
    const response = await this.request<GitHubStatus | { status: GitHubStatus }>(`/integrations/github/projects/${projectId}/status`);
    // Normalizar la respuesta: el API puede devolver directamente el status o dentro de un objeto status
    if (response.success && response.data) {
      if ('status' in response.data) {
        return { 
          success: response.success, 
          data: response.data.status,
          error: response.error,
          message: response.message
        };
      }
    }
    // Si no tiene 'status', asumir que es directamente GitHubStatus
    return {
      success: response.success,
      data: response.data as GitHubStatus | undefined,
      error: response.error,
      message: response.message
    };
  }

  /**
   * Prueba la conexión con GitHub y verifica qué devuelve la API
   */
  async testConnection(): Promise<{ success: boolean; data?: any; error?: string; message?: string }> {
    return this.request('/integrations/github/test');
  }

  /**
   * Lista los repositorios del usuario autenticado
   */
  async listRepositories(): Promise<{ success: boolean; data?: { repos: Array<{
    id: number;
    name: string;
    full_name: string;
    owner: string;
    private: boolean;
    description: string | null;
    language: string | null;
    updated_at: string;
    html_url: string;
    default_branch: string;
  }> }; error?: string; message?: string }> {
    console.log('📋 [GitHubService] Listando repositorios del usuario');
    const response = await this.request<{ repos: Array<any> }>('/integrations/github/repos');
    console.log('📋 [GitHubService] Respuesta de listRepositories:', {
      success: response.success,
      hasRepos: !!response.data?.repos,
      repoCount: response.data?.repos?.length || 0,
      error: response.error
    });
    return response;
  }

  /**
   * Vincula un repositorio a un proyecto
   */
  async linkRepository(projectId: number, owner: string, repo: string): Promise<{ success: boolean; data?: { repoLink: any }; error?: string; message?: string }> {
    return this.request<{ repoLink: any }>(`/integrations/github/projects/${projectId}/repos`, {
      method: 'POST',
      body: JSON.stringify({ owner, repo }),
    });
  }

  /**
   * Desvincula un repositorio de un proyecto
   */
  async unlinkRepository(projectId: number, repoLinkId: number): Promise<{ success: boolean; error?: string; message?: string }> {
    return this.request(`/integrations/github/projects/${projectId}/repos/${repoLinkId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Obtiene actividad reciente de GitHub (PRs y commits)
   */
  async getActivity(projectId: number, owner: string, repo: string): Promise<{ success: boolean; data?: { activity: GitHubActivity } }> {
    return this.request<{ activity: GitHubActivity }>(
      `/integrations/github/projects/${projectId}/activity?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`
    );
  }

  /**
   * Vincula manualmente un commit a una tarea
   */
  async linkCommitToTask(taskId: number, commitSha: string, owner: string, repo: string): Promise<{ success: boolean; data?: { link: any }; error?: string; message?: string }> {
    return this.request<{ link: any }>(`/integrations/github/tasks/${taskId}/commits`, {
      method: 'POST',
      body: JSON.stringify({ commitSha, owner, repo }),
    });
  }
}

export const githubService = new GitHubService();

