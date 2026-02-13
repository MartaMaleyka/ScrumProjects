import { useState, useEffect, useCallback } from 'react';
import { scrumService } from '../services/scrumService';
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
  TaskFilters
} from '../types/scrum';

// Hook para gestión de proyectos
export const useProjects = (filters: ProjectFilters = {}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await scrumService.getProjects(filters);
      
      if (response.success && response.data) {
        
        // El controlador devuelve 'projects', no 'items'
        const projectsData = (response.data as any).projects || response.data.items || response.data || [];
        
        setProjects(Array.isArray(projectsData) ? projectsData : []);
        setPagination(response.data.pagination);
      } else {
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar proyectos');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProjects();
  }, [filters]); // Cambiar a filters en lugar de fetchProjects

  const createProject = async (data: CreateProjectData) => {
    try {
      const response = await scrumService.createProject(data);
      
      if (response.success) {
        await fetchProjects(); // Recargar lista
        return response.data?.project;
      }
      throw new Error(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear proyecto');
      throw err;
    }
  };

  const updateProject = async (id: number, data: Partial<CreateProjectData>) => {
    try {
      const response = await scrumService.updateProject(id, data);
      if (response.success) {
        await fetchProjects(); // Recargar lista
        return response.data?.project;
      }
      throw new Error(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar proyecto');
      throw err;
    }
  };

  const deleteProject = async (id: number) => {
    try {
      const response = await scrumService.deleteProject(id);
      if (response.success) {
        await fetchProjects(); // Recargar lista
        return true;
      }
      throw new Error(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar proyecto');
      throw err;
    }
  };

  return {
    projects,
    loading,
    error,
    pagination,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject
  };
};

// Hook para un proyecto específico
export const useProject = (id: number) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await scrumService.getProjectById(id);
      if (response.success && response.data) {
        setProject(response.data.project);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar proyecto');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  return { project, loading, error, fetchProject };
};

// Hook para sprints de un proyecto
export const useProjectSprints = (projectId: number, filters: SprintFilters = {}) => {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSprints = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await scrumService.getProjectSprints(projectId, filters);
      if (response.success && response.data) {
        setSprints(response.data.sprints);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar sprints');
    } finally {
      setLoading(false);
    }
  }, [projectId, filters]);

  useEffect(() => {
    fetchSprints();
  }, [fetchSprints]);

  const createSprint = async (data: CreateSprintData) => {
    try {
      const response = await scrumService.createSprint(data);
      if (response.success) {
        await fetchSprints(); // Recargar lista
        return response.data?.sprint;
      }
      throw new Error(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear sprint');
      throw err;
    }
  };

  const updateSprint = async (id: number, data: Partial<CreateSprintData>) => {
    try {
      const response = await scrumService.updateSprint(id, data);
      if (response.success) {
        await fetchSprints(); // Recargar lista
        return response.data?.sprint;
      }
      throw new Error(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar sprint');
      throw err;
    }
  };

  return {
    sprints,
    loading,
    error,
    fetchSprints,
    createSprint,
    updateSprint
  };
};

// Hook para épicas de un proyecto
export const useProjectEpics = (projectId: number, filters: EpicFilters = {}) => {
  const [epics, setEpics] = useState<Epic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEpics = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await scrumService.getProjectEpics(projectId, filters);
      if (response.success && response.data) {
        setEpics(response.data.epics);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar épicas');
    } finally {
      setLoading(false);
    }
  }, [projectId, filters]);

  useEffect(() => {
    fetchEpics();
  }, [fetchEpics]);

  const createEpic = async (data: CreateEpicData) => {
    try {
      const response = await scrumService.createEpic(data);
      if (response.success) {
        await fetchEpics(); // Recargar lista
        return response.data?.epic;
      }
      throw new Error(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear épica');
      throw err;
    }
  };

  return {
    epics,
    loading,
    error,
    fetchEpics,
    createEpic
  };
};

// Hook para historias de usuario de una épica
export const useEpicUserStories = (epicId: number, filters: UserStoryFilters = {}) => {
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserStories = useCallback(async () => {
    if (!epicId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await scrumService.getEpicUserStories(epicId, filters);
      if (response.success && response.data) {
        setUserStories(response.data.userStories);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar historias de usuario');
    } finally {
      setLoading(false);
    }
  }, [epicId, filters]);

  useEffect(() => {
    fetchUserStories();
  }, [fetchUserStories]);

  const createUserStory = async (data: CreateUserStoryData) => {
    try {
      const response = await scrumService.createUserStory(data);
      if (response.success) {
        await fetchUserStories(); // Recargar lista
        return response.data?.userStory;
      }
      throw new Error(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear historia de usuario');
      throw err;
    }
  };

  return {
    userStories,
    loading,
    error,
    fetchUserStories,
    createUserStory
  };
};

// Hook para tareas de una historia de usuario
export const useUserStoryTasks = (userStoryId: number, filters: TaskFilters = {}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!userStoryId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await scrumService.getUserStoryTasks(userStoryId, filters);
      if (response.success && response.data) {
        setTasks(response.data.tasks);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar tareas');
    } finally {
      setLoading(false);
    }
  }, [userStoryId, filters]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (data: CreateTaskData) => {
    try {
      const response = await scrumService.createTask(data);
      if (response.success) {
        await fetchTasks(); // Recargar lista
        return response.data?.task;
      }
      throw new Error(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear tarea');
      throw err;
    }
  };

  const updateTask = async (id: number, data: Partial<CreateTaskData>) => {
    try {
      const response = await scrumService.updateTask(id, data);
      if (response.success) {
        await fetchTasks(); // Recargar lista
        return response.data?.task;
      }
      throw new Error(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar tarea');
      throw err;
    }
  };

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTask
  };
};

// Hook para métricas de proyecto
export const useProjectMetrics = (projectId: number) => {
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await scrumService.getProjectMetrics(projectId);
      if (response.success && response.data) {
        setMetrics(response.data.metrics);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar métricas');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, error, fetchMetrics };
};

// Hook para estadísticas de sprint
export const useSprintStats = (sprintId: number) => {
  const [stats, setStats] = useState<SprintStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!sprintId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await scrumService.getSprintStats(sprintId);
      if (response.success && response.data) {
        setStats(response.data.stats);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  }, [sprintId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, fetchStats };
};

// Hook para burndown chart
export const useSprintBurndown = (sprintId: number) => {
  const [burndownData, setBurndownData] = useState<BurndownChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBurndown = useCallback(async () => {
    if (!sprintId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await scrumService.getSprintBurndown(sprintId);
      if (response.success && response.data) {
        setBurndownData(response.data.burndownChart);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar burndown chart');
    } finally {
      setLoading(false);
    }
  }, [sprintId]);

  useEffect(() => {
    fetchBurndown();
  }, [fetchBurndown]);

  return { burndownData, loading, error, fetchBurndown };
};

// Hook para métricas del equipo
export const useTeamMetrics = (projectId: number) => {
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamMetrics = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await scrumService.getProjectTeamMetrics(projectId);
      if (response.success && response.data) {
        setTeamMetrics(response.data.teamMetrics);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar métricas del equipo');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTeamMetrics();
  }, [fetchTeamMetrics]);

  return { teamMetrics, loading, error, fetchTeamMetrics };
};

// Hook para velocidad del equipo
export const useTeamVelocity = (projectId: number) => {
  const [teamVelocity, setTeamVelocity] = useState<TeamVelocity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamVelocity = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await scrumService.getProjectVelocity(projectId);
      if (response.success && response.data) {
        setTeamVelocity(response.data.teamVelocity);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar velocidad del equipo');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTeamVelocity();
  }, [fetchTeamVelocity]);

  return { teamVelocity, loading, error, fetchTeamVelocity };
};
