// Tipos para Roadmap y Planificación Visual

import type { EpicStatus, ScrumPriority, TaskStatus, DependencyType } from './scrum';

export type ReleaseStatus = 'PLANNING' | 'IN_PROGRESS' | 'RELEASED' | 'CANCELLED';
export type DependencyType = 'FINISH_TO_START' | 'START_TO_START' | 'FINISH_TO_FINISH' | 'START_TO_FINISH';

export interface TaskDependency {
  id: number;
  taskId: number;
  dependsOnId: number;
  type: DependencyType;
  lagDays: number;
  dependsOn?: {
    id: number;
    title: string;
    status: TaskStatus;
    dueDate?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Release {
  id: number;
  projectId: number;
  version: string;
  name?: string;
  description?: string;
  status: ReleaseStatus;
  releaseDate?: string;
  plannedDate?: string;
  createdAt: string;
  updatedAt: string;
  notes?: ReleaseNote[];
  epicReleases?: EpicRelease[];
}

export interface ReleaseNote {
  id: number;
  releaseId: number;
  taskId?: number;
  type: 'feature' | 'bugfix' | 'improvement' | 'breaking';
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  task?: {
    id: number;
    title: string;
  };
}

export interface EpicRelease {
  id: number;
  epicId: number;
  releaseId: number;
  createdAt: string;
  epic?: {
    id: number;
    title: string;
    status: EpicStatus;
  };
}

export interface RoadmapItem {
  id: number;
  title: string;
  description?: string;
  status: EpicStatus;
  priority: ScrumPriority;
  estimatedStart?: string;
  estimatedEnd?: string;
  storyCount: number;
  completedStories: number;
}

export interface GanttTask {
  id: number;
  title: string;
  startDate?: string;
  dueDate?: string;
  status: TaskStatus;
  priority: ScrumPriority;
  assignee?: {
    id: number;
    name: string;
    email: string;
  };
  sprint?: {
    id: number;
    name: string;
    startDate?: string;
    endDate?: string;
  };
  userStory?: {
    id: number;
    title: string;
    epic?: {
      id: number;
      title: string;
    };
  };
  dependencies: TaskDependency[];
}

export interface GanttData {
  tasks: GanttTask[];
  sprints: Array<{
    id: number;
    name: string;
    startDate?: string;
    endDate?: string;
    status: string;
  }>;
}

export interface CriticalPathItem {
  id: number;
  title: string;
  earlyStart: string;
  earlyFinish: string;
  slack: number;
}

export interface CriticalPath {
  criticalPath: CriticalPathItem[];
  totalDuration: number;
}

export interface CreateReleaseData {
  version: string;
  name?: string;
  description?: string;
  plannedDate?: string;
  epicIds?: number[];
}

export interface UpdateReleaseData {
  version?: string;
  name?: string;
  description?: string;
  status?: ReleaseStatus;
  releaseDate?: string;
  plannedDate?: string;
  epicIds?: number[];
}

export interface CreateDependencyData {
  dependsOnId: number;
  type?: DependencyType;
  lagDays?: number;
}

