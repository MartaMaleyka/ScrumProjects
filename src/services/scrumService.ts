import type { 
  Project, 
  Sprint, 
  Epic, 
  UserStory, 
  Task,
  ProjectMetrics,
  SprintStats,
  TeamMetrics,
  TeamVelocity,
  BurndownChartData,
  CreateProjectData,
  CreateSprintData,
  CreateEpicData,
  CreateUserStoryData,
  CreateTaskData,
  ProjectFilters,
  SprintFilters,
  EpicFilters,
  UserStoryFilters,
  TaskFilters,
  ApiResponse,
  PaginatedResponse,
  ProjectsResponse,
  ProjectMember,
  ProjectTemplate
} from '../types/scrum';

// Importar configuración centralizada de API
import { API_BASE_URL, fetchWithTimeout, REQUEST_TIMEOUT } from '../config/api';

class ScrumService {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    // Agregar timestamp a las peticiones GET para evitar caché del navegador
    let url = `${API_BASE_URL}/scrum${endpoint}`;
    if ((options.method === 'GET' || !options.method) && !endpoint.includes('?')) {
      url += `?_t=${Date.now()}`;
    } else if ((options.method === 'GET' || !options.method) && endpoint.includes('?')) {
      url += `&_t=${Date.now()}`;
    }

    try {
      const response = await fetchWithTimeout(url, config, REQUEST_TIMEOUT);
      const data = await response.json();
      
      if (!response.ok) {
        if (data.errors) {
        }
        throw new Error(data.message || 'Error en la petición');
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  }

  // ===== PROYECTOS =====

  async getProjects(filters: ProjectFilters = {}): Promise<ProjectsResponse> {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const queryString = params.toString();
    return this.request<any>(`/projects${queryString ? `?${queryString}` : ''}`) as Promise<ProjectsResponse>;
  }

  async getProjectById(id: number): Promise<ApiResponse<{ project: Project }>> {
    return this.request<{ project: Project }>(`/projects/${id}`);
  }

  async createProject(data: CreateProjectData): Promise<ApiResponse<{ project: Project }>> {
    const response = await this.request<{ project: Project }>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  }

  async updateProject(id: number, data: Partial<CreateProjectData>): Promise<ApiResponse<{ project: Project }>> {
    return this.request<{ project: Project }>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  async getProjectMetrics(projectId: number): Promise<ApiResponse<{ metrics: ProjectMetrics }>> {
    return this.request<{ metrics: ProjectMetrics }>(`/projects/${projectId}/metrics`);
  }

  async getProjectTeamMetrics(projectId: number): Promise<ApiResponse<{ teamMetrics: TeamMetrics }>> {
    return this.request<{ teamMetrics: TeamMetrics }>(`/projects/${projectId}/team-metrics`);
  }

  async getProjectVelocity(projectId: number): Promise<ApiResponse<{ teamVelocity: TeamVelocity }>> {
    return this.request<{ teamVelocity: TeamVelocity }>(`/projects/${projectId}/velocity`);
  }

  // ===== MIEMBROS DE PROYECTO =====

  async getProjectMembers(projectId: number): Promise<ApiResponse<{ members: ProjectMember[] }>> {
    return this.request<{ members: ProjectMember[] }>(`/projects/${projectId}/members`);
  }

  async addProjectMember(projectId: number, data: { userId: number; role?: string; teamId?: number }): Promise<ApiResponse<{ member: any }>> {
    return this.request<{ member: any }>(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProjectMember(projectId: number, memberId: number, data: { role: string }): Promise<ApiResponse<{ member: any }>> {
    return this.request<{ member: any }>(`/projects/${projectId}/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async removeProjectMember(projectId: number, memberId: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/projects/${projectId}/members/${memberId}`, {
      method: 'DELETE',
    });
  }

  // ===== SPRINTS =====

  async getProjectSprints(projectId: number, filters: SprintFilters = {}): Promise<ApiResponse<{ sprints: Sprint[] }>> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.includeCompleted !== undefined) params.append('includeCompleted', filters.includeCompleted.toString());

    const queryString = params.toString();
    return this.request<{ sprints: Sprint[] }>(`/projects/${projectId}/sprints${queryString ? `?${queryString}` : ''}`);
  }

  async getSprintById(id: number): Promise<ApiResponse<{ sprint: Sprint }>> {
    return this.request<{ sprint: Sprint }>(`/sprints/${id}`);
  }

  async createSprint(data: CreateSprintData): Promise<ApiResponse<{ sprint: Sprint }>> {
    return this.request<{ sprint: Sprint }>('/sprints', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSprint(id: number, data: Partial<CreateSprintData>): Promise<ApiResponse<{ sprint: Sprint }>> {
    return this.request<{ sprint: Sprint }>(`/sprints/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSprint(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/sprints/${id}`, {
      method: 'DELETE',
    });
  }

  async getSprintStats(sprintId: number): Promise<ApiResponse<{ stats: SprintStats }>> {
    // El endpoint /sprints/:id/stats no existe en la API
    return {
      success: true,
      message: 'Estadísticas básicas del sprint',
      data: {
        stats: {
          sprint: { id: sprintId } as Sprint,
          calculatedStats: {
            totalStoryPoints: 0,
            completedStoryPoints: 0,
            remainingStoryPoints: 0,
            completionPercentage: '0%',
            totalTasks: 0,
            completedTasks: 0,
            taskCompletionPercentage: '0%'
          }
        }
      }
    };
  }

  async getSprintBurndown(sprintId: number): Promise<ApiResponse<{ burndownChart: BurndownChartData }>> {
    return this.request<{ burndownChart: BurndownChartData }>(`/sprints/${sprintId}/burndown`);
  }

  // ===== ÉPICAS =====

  async getProjectEpics(projectId: number, filters: EpicFilters = {}): Promise<ApiResponse<{ epics: Epic[] }>> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);

    const queryString = params.toString();
    return this.request<{ epics: Epic[] }>(`/projects/${projectId}/epics${queryString ? `?${queryString}` : ''}`);
  }

  async getEpicById(id: number): Promise<ApiResponse<{ epic: Epic }>> {
    return this.request<{ epic: Epic }>(`/epics/${id}`);
  }

  async createEpic(data: CreateEpicData): Promise<ApiResponse<{ epic: Epic }>> {
    return this.request<{ epic: Epic }>('/epics', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEpic(id: number, data: Partial<CreateEpicData>): Promise<ApiResponse<{ epic: Epic }>> {
    return this.request<{ epic: Epic }>(`/epics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEpic(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/epics/${id}`, {
      method: 'DELETE',
    });
  }

  // ===== HISTORIAS DE USUARIO =====

  async getUserStories(filters: UserStoryFilters = {}): Promise<ApiResponse<{ userStories: UserStory[] }>> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.sprintId) params.append('sprintId', filters.sprintId.toString());

    const queryString = params.toString();
    return this.request<{ userStories: UserStory[] }>(`/user-stories${queryString ? `?${queryString}` : ''}`);
  }

  async getUserStoryById(id: number): Promise<ApiResponse<{ userStory: UserStory }>> {
    return this.request<{ userStory: UserStory }>(`/user-stories/${id}`);
  }

  async getEpicUserStories(epicId: number, filters: UserStoryFilters = {}): Promise<ApiResponse<{ userStories: UserStory[] }>> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.sprintId) params.append('sprintId', filters.sprintId.toString());

    const queryString = params.toString();
    return this.request<{ userStories: UserStory[] }>(`/epics/${epicId}/user-stories${queryString ? `?${queryString}` : ''}`);
  }

  async createUserStory(data: CreateUserStoryData): Promise<ApiResponse<{ userStory: UserStory }>> {
    return this.request<{ userStory: UserStory }>('/user-stories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUserStory(id: number, data: Partial<CreateUserStoryData>): Promise<ApiResponse<{ userStory: UserStory }>> {
    return this.request<{ userStory: UserStory }>(`/user-stories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUserStory(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/user-stories/${id}`, {
      method: 'DELETE',
    });
  }

  // ===== TAREAS =====

  async getUserStoryTasks(userStoryId: number, filters: TaskFilters = {}): Promise<ApiResponse<{ tasks: Task[] }>> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.type) params.append('type', filters.type);
    if (filters.assigneeId) params.append('assigneeId', filters.assigneeId.toString());

    const queryString = params.toString();
    return this.request<{ tasks: Task[] }>(`/user-stories/${userStoryId}/tasks${queryString ? `?${queryString}` : ''}`);
  }

  async getProjectTasks(projectId: number, filters: TaskFilters = {}): Promise<ApiResponse<{ tasks: Task[] }>> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.type) params.append('type', filters.type);
    if (filters.assigneeId) params.append('assigneeId', filters.assigneeId.toString());

    const queryString = params.toString();
    return this.request<{ tasks: Task[] }>(`/projects/${projectId}/tasks${queryString ? `?${queryString}` : ''}`);
  }

  async getSprintTasks(sprintId: number, filters: TaskFilters = {}): Promise<ApiResponse<{ tasks: Task[] }>> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.type) params.append('type', filters.type);
    if (filters.assigneeId) params.append('assigneeId', filters.assigneeId.toString());

    const queryString = params.toString();
    return this.request<{ tasks: Task[] }>(`/sprints/${sprintId}/tasks${queryString ? `?${queryString}` : ''}`);
  }

  async getTaskById(id: number): Promise<ApiResponse<{ task: Task }>> {
    return this.request<{ task: Task }>(`/tasks/${id}`);
  }

  async createTask(data: CreateTaskData): Promise<ApiResponse<{ task: Task }>> {
    return this.request<{ task: Task }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(id: number, data: Partial<CreateTaskData>): Promise<ApiResponse<{ task: Task }>> {
    return this.request<{ task: Task }>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // ===== DASHBOARD =====

  async getDashboard(projectId?: number, sprintId?: number, teamId?: number, period?: string): Promise<ApiResponse<{ dashboard: any }>> {
    const params = new URLSearchParams();
    
    if (projectId) params.append('projectId', projectId.toString());
    if (sprintId) params.append('sprintId', sprintId.toString());
    if (teamId) params.append('teamId', teamId.toString());
    if (period) params.append('period', period);

    const queryString = params.toString();
    return this.request<{ dashboard: any }>(`/dashboard${queryString ? `?${queryString}` : ''}`);
  }

  // ===== PANEL DE CONTROL GENERAL =====

  async getDashboardConsolidated(teamId?: number, directionId?: number, status?: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    if (teamId) params.append('teamId', teamId.toString());
    if (directionId) params.append('directionId', directionId.toString());
    if (status) params.append('status', status);

    const queryString = params.toString();
    return this.request<any>(`/dashboard/consolidated${queryString ? `?${queryString}` : ''}`);
  }

  async getProductivityMetrics(period?: string, assigneeId?: number): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    if (period) params.append('period', period);
    if (assigneeId) params.append('assigneeId', assigneeId.toString());

    const queryString = params.toString();
    return this.request<any>(`/dashboard/productivity${queryString ? `?${queryString}` : ''}`);
  }

  async getDeadlineAlerts(days?: number): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    if (days) params.append('days', days.toString());

    const queryString = params.toString();
    return this.request<any>(`/dashboard/deadlines${queryString ? `?${queryString}` : ''}`);
  }

  // ===== MÉTRICAS Y KPI =====

  async getCompletionByAssignee(period?: string, assigneeId?: number): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    if (period) params.append('period', period);
    if (assigneeId) params.append('assigneeId', assigneeId.toString());

    const queryString = params.toString();
    return this.request<any>(`/metrics/completion-by-assignee${queryString ? `?${queryString}` : ''}`);
  }

  async getCompletionTimeMetrics(projectId?: number, period?: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    if (projectId) params.append('projectId', projectId.toString());
    if (period) params.append('period', period);

    const queryString = params.toString();
    return this.request<any>(`/metrics/completion-time${queryString ? `?${queryString}` : ''}`);
  }

  async getWorkloadDistribution(teamId?: number, period?: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    if (teamId) params.append('teamId', teamId.toString());
    if (period) params.append('period', period);

    const queryString = params.toString();
    return this.request<any>(`/metrics/workload-distribution${queryString ? `?${queryString}` : ''}`);
  }

  async getPerformanceHistory(assigneeId?: number, period?: string, intervals?: number): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    if (assigneeId) params.append('assigneeId', assigneeId.toString());
    if (period) params.append('period', period);
    if (intervals) params.append('intervals', intervals.toString());

    const queryString = params.toString();
    return this.request<any>(`/metrics/performance-history${queryString ? `?${queryString}` : ''}`);
  }

  // ===== MÉTRICAS DE EQUIPO =====

  async getTeamMetrics(projectId: number, period?: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    if (period) params.append('period', period);

    const queryString = params.toString();
    return this.request<any>(`/projects/${projectId}/team-metrics${queryString ? `?${queryString}` : ''}`);
  }

  async getTeamVelocity(projectId: number, limit?: number): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    if (limit) params.append('limit', limit.toString());

    const queryString = params.toString();
    return this.request<any>(`/projects/${projectId}/velocity${queryString ? `?${queryString}` : ''}`);
  }

  // ===== PLANTILLAS =====

  async getTemplates(): Promise<ApiResponse<{ templates: ProjectTemplate[] }>> {
    return this.request<{ templates: ProjectTemplate[] }>('/templates');
  }
}

export const scrumService = new ScrumService();
export default scrumService;
