// Tipos para la gestión de proyectos Scrum

export interface Project {
  id: number;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  epics?: Epic[];
  sprints?: Sprint[];
  members?: ProjectMember[];
  _count?: {
    epics: number;
    sprints: number;
    members: number;
  };
}

export interface Sprint {
  id: number;
  name: string;
  description?: string;
  projectId: number;
  status: SprintStatus;
  startDate?: string;
  endDate?: string;
  goal?: string;
  velocity?: number;
  createdAt: string;
  updatedAt: string;
  project?: Project;
  userStories?: UserStory[];
  members?: SprintMember[];
  planning?: SprintPlanning;
  retrospective?: SprintRetrospective;
  review?: SprintReview;
  _count?: {
    userStories: number;
    tasks: number;
    members: number;
  };
}

export interface Epic {
  id: number;
  title: string;
  description?: string;
  projectId: number;
  status: EpicStatus;
  priority: ScrumPriority;
  businessValue?: number;
  createdAt: string;
  updatedAt: string;
  project?: Project;
  userStories?: UserStory[];
  associatedSprints?: AssociatedSprint[];
  _count?: {
    userStories: number;
  };
}

export interface AssociatedSprint {
  id: number;
  name: string;
  status: SprintStatus;
  startDate?: string;
  endDate?: string;
  userStories: UserStory[];
  totalStoryPoints: number;
}

export interface UserStory {
  id: number;
  title: string;
  description: string;
  acceptanceCriteria?: string;
  epicId: number;
  sprintId?: number;
  storyPoints?: number;
  status: UserStoryStatus;
  priority: ScrumPriority;
  createdAt: string;
  updatedAt: string;
  epic?: Epic;
  sprint?: Sprint;
  tasks?: Task[];
  _count?: {
    tasks: number;
  };
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  userStoryId: number;
  sprintId?: number;
  type: TaskType;
  status: TaskStatus;
  priority: ScrumPriority;
  estimatedHours?: number;
  actualHours?: number;
  assigneeId?: number;
  startDate?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  userStory?: UserStory;
  sprint?: Sprint;
  assignee?: User;
  dependencies?: TaskDependency[];
}

export interface TaskDependency {
  id: number;
  taskId: number;
  dependsOnId: number;
  type: 'FINISH_TO_START' | 'START_TO_START' | 'FINISH_TO_FINISH' | 'START_TO_FINISH';
  lagDays?: number;
  createdAt: string;
  task?: Task;
  dependsOn?: Task;
}

export interface ProjectMember {
  id: number;
  projectId: number;
  userId: number;
  role: ProjectRole;
  joinedAt: string;
  user?: User;
}

export interface SprintMember {
  id: number;
  sprintId: number;
  userId: number;
  joinedAt: string;
  user?: User;
}

export interface User {
  id: number;
  name: string;
  email: string;
  // Otros campos del usuario...
}

export interface SprintPlanning {
  id: number;
  sprintId: number;
  plannedStoryPoints: number;
  plannedTasks: number;
  notes?: string;
  createdAt: string;
}

export interface SprintRetrospective {
  id: number;
  sprintId: number;
  whatWentWell?: string;
  whatWentWrong?: string;
  actionItems?: string;
  teamMood: TeamMood;
  createdAt: string;
}

export interface SprintReview {
  id: number;
  sprintId: number;
  completedStoryPoints: number;
  demoNotes?: string;
  stakeholderFeedback?: string;
  createdAt: string;
}

export interface Velocity {
  id: number;
  projectId: number;
  sprintId: number;
  storyPointsCompleted: number;
  averageVelocity: number;
  createdAt: string;
}

export interface BurndownChart {
  id: number;
  sprintId: number;
  day: number;
  idealRemaining: number;
  actualRemaining: number;
  date: string;
}

export interface ProjectTemplate {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  sprintTemplates?: SprintTemplate[];
  createdAt: string;
}

export interface SprintTemplate {
  id: number;
  projectTemplateId: number;
  name: string;
  duration: number; // en días
  velocity: number;
  isActive: boolean;
  createdAt: string;
}

// Enums
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type SprintStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type EpicStatus = 'DRAFT' | 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type UserStoryStatus = 'DRAFT' | 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskType = 'DEVELOPMENT' | 'TESTING' | 'DESIGN' | 'DOCUMENTATION' | 'BUG_FIX' | 'RESEARCH' | 'REFACTORING';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'TESTING' | 'COMPLETED' | 'CANCELLED';
export type ProjectRole = 'PRODUCT_OWNER' | 'SCRUM_MASTER' | 'DEVELOPER' | 'TESTER' | 'DESIGNER' | 'OBSERVER';
export type ScrumPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TeamMood = 'EXCELLENT' | 'GOOD' | 'NEUTRAL' | 'BAD' | 'TERRIBLE';

// Interfaces para formularios
export interface CreateProjectData {
  name: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string;
  endDate?: string;
}

export interface CreateSprintData {
  name: string;
  description?: string;
  projectId: number;
  startDate?: string;
  endDate?: string;
  goal?: string;
  velocity?: number;
}

export interface CreateEpicData {
  title: string;
  description?: string;
  projectId: number;
  status?: EpicStatus;
  priority?: ScrumPriority;
  businessValue?: number;
}

export interface CreateUserStoryData {
  title: string;
  description: string;
  acceptanceCriteria?: string;
  epicId: number;
  sprintId?: number;
  storyPoints?: number;
  status?: UserStoryStatus;
  priority?: ScrumPriority;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  userStoryId: number;
  sprintId?: number;
  type?: TaskType;
  status?: TaskStatus;
  priority?: ScrumPriority;
  estimatedHours?: number;
  assigneeId?: number;
}

// Interfaces para respuestas de la API
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

// Respuesta específica para proyectos (estructura real de la API)
export interface ProjectsResponse {
  success: boolean;
  message: string;
  data: {
    projects: Project[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  timestamp: string;
}

// Interfaces para métricas y reportes
export interface ProjectMetrics {
  project: Project;
  epics: {
    total: number;
    byStatus: Record<EpicStatus, number>;
    byPriority: Record<ScrumPriority, number>;
  };
  userStories: {
    total: number;
    totalPoints: number;
    byStatus: Record<UserStoryStatus, number>;
    byPriority: Record<ScrumPriority, number>;
    inSprints: number;
    notInSprints: number;
  };
  tasks: {
    total: number;
    byStatus: Record<TaskStatus, number>;
    byType: Record<TaskType, number>;
    totalEstimatedHours: number;
    totalActualHours: number;
  };
  sprints: {
    total: number;
    byStatus: Record<SprintStatus, number>;
    averageVelocity: number;
  };
  velocities: Array<{
    id: number;
    storyPointsCompleted: number;
    averageVelocity: number;
    createdAt: string;
  }>;
}

export interface SprintStats {
  sprint: Sprint;
  calculatedStats: {
    totalStoryPoints: number;
    completedStoryPoints: number;
    remainingStoryPoints: number;
    completionPercentage: string;
    totalTasks: number;
    completedTasks: number;
    taskCompletionPercentage: string;
  };
}

export interface TeamMetrics {
  teamSize: number;
  teamMembers: Array<{
    id: number;
    name: string;
    email: string;
    role: ProjectRole;
  }>;
  taskMetrics: {
    total: number;
    completed: number;
    completionRate: string;
    averageCompletionTime: number;
  };
}

export interface TeamVelocity {
  velocities: Array<{
    sprintId: number;
    sprintName: string;
    storyPointsCompleted: number;
    startDate: string;
    endDate: string;
  }>;
  averageVelocity: number;
  sprintCount: number;
}

export interface BurndownChartData {
  sprintId: number;
  sprintName: string;
  totalPoints: number;
  totalDays: number;
  idealBurndown: Array<{
    day: number;
    remainingPoints: number;
    date: string;
  }>;
  realBurndown: Array<{
    day: number;
    remainingPoints: number;
    date: string;
  }>;
  startDate: string;
  endDate: string;
}

// Interfaces para filtros y búsquedas
export interface ProjectFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProjectStatus;
  sortBy?: 'name' | 'status' | 'createdAt' | 'startDate' | 'endDate';
  sortOrder?: 'asc' | 'desc';
}

export interface SprintFilters {
  status?: SprintStatus;
  includeCompleted?: boolean;
}

export interface EpicFilters {
  status?: EpicStatus;
  priority?: ScrumPriority;
}

export interface UserStoryFilters {
  status?: UserStoryStatus;
  priority?: ScrumPriority;
  sprintId?: number;
  epicId?: number;
}

export interface TaskFilters {
  status?: TaskStatus;
  type?: TaskType;
  assigneeId?: number;
}
