import React, { useState, useEffect, useRef } from 'react';
import AppSidebarLayout from '../../layout/AppSidebarLayout';
import { API_BASE_URL, authenticatedRequest } from '../../../config/api';
import { scrumService } from '../../../services/scrumService';
import AddProjectMemberModal from '../members/AddProjectMemberModal';
import KanbanBoard from '../tasks/KanbanBoard';
import ScrumFloatingActionButton from '../common/ScrumFloatingActionButton';
import ScrumBreadcrumbs from '../common/ScrumBreadcrumbs';
import { exportService } from '../../../services/exportService';

interface Project {
  id: number;
  name: string;
  description?: string | null;
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
  epics?: Epic[];
  userStories?: UserStory[];
  sprints?: Sprint[];
  members?: ProjectMember[];
}

interface Epic {
  id: number;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  createdAt: string;
}

interface UserStory {
  id: number;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  storyPoints?: number | null;
  epicId?: number | null;
  sprintId?: number | null;
  epic?: {
    id: number;
    title: string;
  };
  sprint?: {
    id: number;
    name: string;
  };
  createdAt: string;
}

interface Sprint {
  id: number;
  name: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  goal?: string | null;
}

interface ProjectMember {
  id: number;
  role: string;
  joinedAt: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

const ProjectDetailModern: React.FC = () => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('detalles');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState<number | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [showWorkflowGuide, setShowWorkflowGuide] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarView, setCalendarView] = useState<'month' | 'timeline'>('month');
  const [visibleActivities, setVisibleActivities] = useState(5);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  
  // Estados para datos del sprint actual
  const [activeSprintData, setActiveSprintData] = useState<any>(null);
  const [activeSprintTasks, setActiveSprintTasks] = useState<any[]>([]);
  const [loadingSprintData, setLoadingSprintData] = useState(false);

  // Debug: Log cuando cambia el tab o el project
  useEffect(() => {
    if (activeTab === 'tareas' && project) {
    }
  }, [activeTab, project]);

  // Cerrar menú de exportación al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  // Obtener ID del proyecto de la URL
  const getProjectId = (): string => {
    if (typeof window === 'undefined') {
      return '';
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    let id = urlParams.get('id');
    
    if (!id) {
      const pathParts = window.location.pathname.split('/');
      id = pathParts[pathParts.length - 1];
    }
    return id || '';
  };

  // Cargar datos del proyecto
  useEffect(() => {
    const id = getProjectId();
    
    if (!id) {
      setError('ID de proyecto no válido');
      setLoading(false);
      return;
    }
    
    const loadProjectData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await authenticatedRequest(`${API_BASE_URL}/scrum/projects/${id}`);
        
        const projectData = response.project || response.data?.project || response;
        
        setProject(projectData);
        
        // Cargar datos del sprint activo si existe
        if (projectData?.sprints) {
          const activeSprint = projectData.sprints.find((s: Sprint) => s.status === 'ACTIVE');
          if (activeSprint) {
            loadActiveSprintData(activeSprint.id);
          }
        }
        
      } catch (error: any) {
        
        if (error.message && error.message.includes('403')) {
          setError('No tienes permisos para ver este proyecto. Contacta al administrador del sistema.');
          setTimeout(() => {
            window.location.href = '/proyectos';
          }, 3000);
        } else if (error.message && error.message.includes('401')) {
          setError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
          setTimeout(() => {
            window.location.href = '/login-moderno';
          }, 2000);
        } else {
          setError(error.message || 'Error al cargar el proyecto');
        }
      } finally {
        setLoading(false);
      }
    };

    loadProjectData();
  }, []);

  // Función para cargar datos del sprint activo
  const loadActiveSprintData = async (sprintId: number) => {
    try {
      setLoadingSprintData(true);
      
      // Cargar tareas del sprint
      const tasksResponse = await scrumService.getSprintTasks(sprintId);
      if (tasksResponse.success && tasksResponse.data) {
        setActiveSprintTasks(tasksResponse.data.tasks || []);
      }
      
      // Cargar detalles completos del sprint
      const sprintResponse = await authenticatedRequest(`${API_BASE_URL}/scrum/sprints/${sprintId}`);
      const sprintData = sprintResponse.sprint || sprintResponse.data?.sprint || sprintResponse;
      setActiveSprintData(sprintData);
      
    } catch (error: any) {
      console.error('Error al cargar datos del sprint activo:', error);
    } finally {
      setLoadingSprintData(false);
    }
  };

  const formatDate = (dateString?: string | null | Date) => {
    if (!dateString) return 'Sin fecha';
    try {
      const date = dateString instanceof Date ? dateString : new Date(dateString);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      return date.toLocaleDateString('es-PA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error al formatear fecha:', error, dateString);
      return 'Fecha inválida';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNING': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ACTIVE': return 'bg-green-100 text-green-800 border-green-200';
      case 'ON_HOLD': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'PLANNING': return 'Planificación';
      case 'ACTIVE': return 'Activo';
      case 'ON_HOLD': return 'En Espera';
      case 'COMPLETED': return 'Completado';
      case 'CANCELLED': return 'Cancelado';
      default: return status;
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'PRODUCT_OWNER': return 'Product Owner';
      case 'SCRUM_MASTER': return 'Scrum Master';
      case 'DEVELOPER': return 'Desarrollador';
      case 'TESTER': return 'Tester/QA';
      case 'DESIGNER': return 'Diseñador';
      case 'STAKEHOLDER': return 'Stakeholder';
      case 'INFRAESTRUCTURA': return 'Infraestructura';
      case 'REDES': return 'Redes';
      case 'SEGURIDAD': return 'Seguridad';
      default: return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'PRODUCT_OWNER': return '👑';
      case 'SCRUM_MASTER': return '🎯';
      case 'DEVELOPER': return '💻';
      case 'TESTER': return '🧪';
      case 'DESIGNER': return '🎨';
      case 'STAKEHOLDER': return '👔';
      case 'INFRAESTRUCTURA': return '🏗️';
      case 'REDES': return '🌐';
      case 'SEGURIDAD': return '🔒';
      default: return '👤';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'PRODUCT_OWNER': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'SCRUM_MASTER': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DEVELOPER': return 'bg-green-100 text-green-800 border-green-200';
      case 'TESTER': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'DESIGNER': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'STAKEHOLDER': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'INFRAESTRUCTURA': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'REDES': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'SEGURIDAD': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este miembro del proyecto?')) {
      return;
    }

    try {
      setDeletingMemberId(memberId);
      
      // Actualización optimista: remover el miembro de la UI inmediatamente
      if (project) {
        const updatedMembers = project.members?.filter(m => m.id !== memberId) || [];
        setProject({
          ...project,
          members: updatedMembers
        });
      }
      
      // Eliminar en el backend
      await authenticatedRequest(
        `${API_BASE_URL}/scrum/projects/${project?.id}/members/${memberId}`,
        { method: 'DELETE' }
      );
      
      // Esperar un momento para que el backend procese el cambio
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Recargar solo los miembros para sincronizar
      const timestamp = new Date().getTime();
      const membersResponse = await authenticatedRequest(
        `${API_BASE_URL}/scrum/projects/${project?.id}/members?_t=${timestamp}`,
        {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
      
      const members = membersResponse.data?.members || membersResponse.members || [];
      
      if (project) {
        setProject({
          ...project,
          members: members,
          _count: {
            ...project._count,
            members: members.length // Actualizar el conteo de miembros
          }
        });
      }
      
    } catch (error: any) {
      // Revertir cambio optimista en caso de error
      if (project) {
        const id = getProjectId();
        if (id) {
          const response = await authenticatedRequest(`${API_BASE_URL}/scrum/projects/${id}`);
          const projectData = response.project || response.data?.project || response;
          setProject(projectData);
        }
      }
      alert('Error al eliminar miembro: ' + (error.message || 'Error desconocido'));
    } finally {
      setDeletingMemberId(null);
    }
  };

  const handleMemberAdded = async () => {
    // Recargar solo los miembros para actualización más rápida
    const id = getProjectId();
    if (id && project) {
      try {
        // Pequeño delay para asegurar que el backend haya procesado el cambio
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Recargar solo los miembros (más rápido que recargar todo el proyecto)
        const timestamp = new Date().getTime();
        const membersResponse = await authenticatedRequest(
          `${API_BASE_URL}/scrum/projects/${id}/members?_t=${timestamp}`,
          {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          }
        );
        
        const members = membersResponse.data?.members || membersResponse.members || [];
        
        // Actualizar solo los miembros del proyecto
        setProject({
          ...project,
          members: members,
          _count: {
            ...project._count,
            members: members.length // Actualizar el conteo de miembros
          }
        });
      } catch (error) {
        // Fallback: recargar todo el proyecto si falla
        try {
          const timestamp = new Date().getTime();
          const response = await authenticatedRequest(`${API_BASE_URL}/scrum/projects/${id}?_t=${timestamp}`, {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          });
          const projectData = response.project || response.data?.project || response;
          setProject(projectData);
        } catch (fallbackError) {
        }
      }
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;

    const confirmMessage = `¿Estás seguro de que deseas eliminar el proyecto "${project.name}"?\n\nEl proyecto se moverá a la papelera y se eliminará permanentemente después de 30 días.\n\nEsta acción no se puede deshacer fácilmente.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setDeletingProject(true);
      
      await authenticatedRequest(
        `${API_BASE_URL}/scrum/projects/${project.id}`,
        { method: 'DELETE' }
      );

      alert('Proyecto movido a papelera. Se eliminará permanentemente en 30 días.');
      
      // Redirigir a la lista de proyectos
      window.location.href = '/proyectos';
    } catch (error: any) {
      alert('Error al eliminar proyecto: ' + (error.message || 'Error desconocido'));
    } finally {
      setDeletingProject(false);
    }
  };

  // Calcular estadísticas del dashboard (mezclando datos del sprint actual + datos globales)
  const calculateDashboardStats = () => {
    if (!project) return null;

    // === DATOS GLOBALES DEL PROYECTO ===
    const epicsTotal = project.epics?.length || 0;
    const epicsCompleted = project.epics?.filter(e => e.status === 'COMPLETED').length || 0;
    const epicsInProgress = project.epics?.filter(e => e.status === 'IN_PROGRESS').length || 0;
    const epicsReady = project.epics?.filter(e => e.status === 'READY').length || 0;
    const totalProgress = epicsTotal > 0 ? Math.round((epicsCompleted / epicsTotal) * 100) : 0;

    const sprintsTotal = project.sprints?.length || 0;
    const sprintsActive = project.sprints?.filter(s => s.status === 'ACTIVE').length || 0;
    const sprintsCompleted = project.sprints?.filter(s => s.status === 'COMPLETED').length || 0;
    const members = project.members?.length || 0;

    // === DATOS DEL SPRINT ACTUAL ===
    const activeSprint = project.sprints?.find(s => s.status === 'ACTIVE');
    
    // Calcular métricas del sprint actual
    let sprintProgress = 0;
    let sprintTasksTotal = 0;
    let sprintTasksCompleted = 0;
    let sprintTasksInProgress = 0;
    let sprintTasksTodo = 0;
    let sprintUserStories = 0;
    let sprintStoryPoints = 0;
    let daysRemaining = 0;
    
    if (activeSprint && activeSprintData) {
      // Usar datos cargados del sprint
      sprintTasksTotal = activeSprintTasks.length;
      sprintTasksCompleted = activeSprintTasks.filter(t => t.status === 'COMPLETED' || t.status === 'DONE').length;
      sprintTasksInProgress = activeSprintTasks.filter(t => t.status === 'IN_PROGRESS').length;
      sprintTasksTodo = activeSprintTasks.filter(t => t.status === 'TODO' || t.status === 'TO_DO').length;
      sprintProgress = sprintTasksTotal > 0 ? Math.round((sprintTasksCompleted / sprintTasksTotal) * 100) : 0;
      
      // User stories del sprint
      if (activeSprintData.userStories) {
        sprintUserStories = activeSprintData.userStories.length;
        sprintStoryPoints = activeSprintData.userStories.reduce((sum: number, us: any) => sum + (us.storyPoints || 0), 0);
      } else if (project.userStories) {
        const sprintUserStoriesList = project.userStories.filter((us: any) => us.sprintId === activeSprint.id);
        sprintUserStories = sprintUserStoriesList.length;
        sprintStoryPoints = sprintUserStoriesList.reduce((sum: number, us: any) => sum + (us.storyPoints || 0), 0);
      }
    } else if (activeSprint) {
      // Fallback: usar datos básicos del sprint si no se cargaron los detalles
      if (activeSprint.endDate) {
        const endDate = new Date(activeSprint.endDate);
        const today = new Date();
        const diffTime = endDate.getTime() - today.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }

    // Días restantes del sprint activo
    if (activeSprint?.endDate) {
      const endDate = new Date(activeSprint.endDate);
      const today = new Date();
      const diffTime = endDate.getTime() - today.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Health status (basado en sprint actual principalmente)
    let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (activeSprint) {
      if (daysRemaining < 3 && sprintProgress < 80) healthStatus = 'critical';
      else if (daysRemaining < 7 && sprintProgress < 60) healthStatus = 'warning';
      else if (sprintProgress < 40 && daysRemaining < 10) healthStatus = 'warning';
    } else {
      if (totalProgress < 30 && epicsTotal > 0) healthStatus = 'warning';
    }
    if (project.status === 'ON_HOLD') healthStatus = 'warning';
    if (project.status === 'CANCELLED') healthStatus = 'critical';

    return {
      // Datos globales del proyecto
      epics: {
        total: epicsTotal,
        completed: epicsCompleted,
        inProgress: epicsInProgress,
        ready: epicsReady,
        draft: epicsTotal - epicsCompleted - epicsInProgress - epicsReady
      },
      sprints: {
        total: sprintsTotal,
        active: sprintsActive,
        completed: sprintsCompleted
      },
      members,
      progress: totalProgress,
      
      // Datos del sprint actual (prioritarios)
      activeSprint: activeSprint ? {
        id: activeSprint.id,
        name: activeSprint.name,
        daysRemaining,
        endDate: activeSprint.endDate,
        goal: activeSprint.goal,
        progress: sprintProgress,
        tasks: {
          total: sprintTasksTotal,
          completed: sprintTasksCompleted,
          inProgress: sprintTasksInProgress,
          todo: sprintTasksTodo
        },
        userStories: sprintUserStories,
        storyPoints: sprintStoryPoints
      } : null,
      
      healthStatus
    };
  };

  // Funciones para el calendario
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getSprintsForDay = (day: number, month: number, year: number) => {
    if (!project?.sprints) return [];
    
    const currentDate = new Date(year, month, day);
    return project.sprints.filter(sprint => {
      if (!sprint.startDate || !sprint.endDate) return false;
      const startDate = new Date(sprint.startDate);
      const endDate = new Date(sprint.endDate);
      return currentDate >= startDate && currentDate <= endDate;
    });
  };

  const isSprintStartDate = (sprint: Sprint, day: number, month: number, year: number) => {
    if (!sprint.startDate) return false;
    const startDate = new Date(sprint.startDate);
    return startDate.getDate() === day && 
           startDate.getMonth() === month && 
           startDate.getFullYear() === year;
  };

  const isSprintEndDate = (sprint: Sprint, day: number, month: number, year: number) => {
    if (!sprint.endDate) return false;
    const endDate = new Date(sprint.endDate);
    return endDate.getDate() === day && 
           endDate.getMonth() === month && 
           endDate.getFullYear() === year;
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  if (loading) {
    return (
      <AppSidebarLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-deep mx-auto mb-4"></div>
            <p className="text-gray-neutral text-lg font-chatgpt-normal">
              Cargando detalles del proyecto...
            </p>
          </div>
        </div>
      </AppSidebarLayout>
    );
  }

  if (error) {
    return (
      <AppSidebarLayout>
        <div className="h-full flex items-center justify-center bg-gradient-to-br from-cream to-gray-50">
          <div className="max-w-2xl mx-auto p-8">
            <div className="bg-white border-2 border-red-200 rounded-2xl p-8 text-center shadow-xl">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-chatgpt-semibold text-gray-900 mb-4">
                Error al Cargar Proyecto
              </h2>
              <p className="text-gray-neutral text-lg mb-6 font-chatgpt-normal">
                {error}
              </p>
              <div className="flex justify-center gap-4">
                <a 
                  href="/proyectos"
                  className="bg-blue-deep hover:bg-blue-light text-white px-6 py-3 rounded-xl font-chatgpt-medium transition-all duration-300 shadow-medium hover:shadow-lg hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-light/30 focus:ring-offset-2"
                >
                  Volver a Proyectos
                </a>
                <a 
                  href="/scrum"
                  className="bg-white border-2 border-gray-300 hover:border-blue-deep text-gray-700 hover:text-blue-deep px-6 py-3 rounded-xl font-chatgpt-medium transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-light/30 focus:ring-offset-2"
                >
                  Ir al Dashboard
                </a>
              </div>
            </div>
          </div>
        </div>
      </AppSidebarLayout>
    );
  }

  if (!project) {
    return (
      <AppSidebarLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-neutral text-lg">Proyecto no encontrado</p>
          </div>
        </div>
      </AppSidebarLayout>
    );
  }

  return (
    <AppSidebarLayout>
      <div className="h-full flex flex-col">
        {/* Breadcrumbs mejorados */}
        <ScrumBreadcrumbs
          items={[
            {
              label: 'Proyectos',
              href: '/proyectos',
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              ),
            },
            {
              label: project.name,
            },
          ]}
        />

        {/* Header */}
        <div className="bg-gradient-to-br from-cream to-gray-50 border-b border-gray-200 px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex justify-center">
            <div className="max-w-7xl w-full">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-chatgpt-semibold text-gray-900 leading-tight">
                      {project.name}
                    </h1>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                      {getStatusName(project.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-neutral">
                    Proyecto #{project.id} • Creado el {formatDate(project.createdAt)}
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Grupo 1: Acciones secundarias (Exportar y Ayuda) */}
                  <div className="flex items-center gap-2">
                    {/* Botón de exportación con menú desplegable */}
                    <div className="relative" ref={exportMenuRef}>
                      <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        disabled={isExporting || !project}
                        className="bg-blue-deep hover:bg-blue-light disabled:bg-gray-400 text-white px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-300 flex items-center space-x-2 disabled:cursor-not-allowed text-sm shadow-sm hover:shadow-md"
                        title="Exportar Proyecto"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>{isExporting ? 'Exportando...' : 'Exportar'}</span>
                        <svg 
                          className={`w-4 h-4 transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {showExportMenu && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                          <button
                            onClick={async () => {
                              if (!project) return;
                              try {
                                setIsExporting(true);
                                setShowExportMenu(false);
                                await exportService.exportProjectToPDF(
                                  project as any,
                                  project.epics as any,
                                  project.sprints as any,
                                  [] // Las tareas se cargan por sprint/historia
                                );
                              } catch (error: any) {
                                alert(`Error al exportar PDF: ${error.message}`);
                              } finally {
                                setIsExporting(false);
                              }
                            }}
                            disabled={isExporting || !project}
                            className="w-full text-left px-4 py-3 hover:bg-red-50 text-gray-700 hover:text-red-700 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span>Exportar a PDF</span>
                          </button>
                          <button
                            onClick={() => {
                              if (!project) return;
                              try {
                                setIsExporting(true);
                                setShowExportMenu(false);
                                exportService.exportProjectToExcel(
                                  project as any,
                                  project.epics as any,
                                  project.sprints as any,
                                  []
                                );
                              } catch (error: any) {
                                alert(`Error al exportar Excel: ${error.message}`);
                              } finally {
                                setIsExporting(false);
                              }
                            }}
                            disabled={isExporting || !project}
                            className="w-full text-left px-4 py-3 hover:bg-green-50 text-gray-700 hover:text-green-700 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed border-t border-gray-100"
                          >
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Exportar a Excel</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setShowWorkflowGuide(!showWorkflowGuide)}
                      className="bg-purple-50 border-2 border-purple-200 hover:border-purple-400 text-purple-700 hover:text-purple-900 px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-300 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 text-sm"
                      title="Ver guía de trabajo"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>¿Cómo usar?</span>
                    </button>
                  </div>

                  {/* Separador visual */}
                  <div className="hidden sm:block w-px h-8 bg-gray-300"></div>

                  {/* Grupo 2: Acciones principales (Editar y Eliminar) */}
                  <div className="flex items-center gap-2">
                    <a 
                      href={`/proyectos/editar?id=${project.id}`}
                      className="bg-blue-deep hover:bg-blue-light text-white px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-300 flex items-center justify-center space-x-2 shadow-medium hover:shadow-lg hover:scale-105 active:scale-95 text-sm focus:outline-none focus:ring-4 focus:ring-blue-light/30 focus:ring-offset-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Editar</span>
                    </a>

                    <button
                      onClick={handleDeleteProject}
                      disabled={deletingProject}
                      className="bg-red-50 border-2 border-red-200 hover:border-red-400 text-red-700 hover:text-red-900 px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-300 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      title="Eliminar proyecto (se moverá a papelera)"
                    >
                      {deletingProject ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Eliminando...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Eliminar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Guía de Flujo de Trabajo (Colapsable) */}
        {showWorkflowGuide && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-b border-purple-200 px-4 sm:px-6 py-6 animate-fadeIn">
            <div className="flex justify-center">
              <div className="max-w-7xl w-full">
                <div className="bg-white rounded-2xl shadow-lg border-2 border-purple-200 p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-chatgpt-semibold text-gray-900">
                          Guía de Trabajo Scrum
                        </h3>
                        <p className="text-sm text-gray-neutral mt-1">
                          Sigue estos pasos para gestionar tu proyecto de forma efectiva
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowWorkflowGuide(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Paso 1: Configurar Proyecto */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border-2 border-blue-200 hover:border-blue-400 transition-all hover:shadow-md">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-chatgpt-semibold shadow-lg">
                          1
                        </div>
                        <h4 className="font-chatgpt-semibold text-gray-900">Configurar Proyecto</h4>
                      </div>
                      <p className="text-sm text-gray-700 mb-3">
                        Revisa y actualiza los <strong>Detalles</strong> del proyecto: descripción, fechas y estado.
                      </p>
                      <button
                        onClick={() => { setActiveTab('detalles'); setShowWorkflowGuide(false); }}
                        className="text-blue-700 hover:text-blue-900 text-sm font-chatgpt-medium flex items-center space-x-1"
                      >
                        <span>Ir a Detalles</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    {/* Paso 2: Formar Equipo */}
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border-2 border-green-200 hover:border-green-400 transition-all hover:shadow-md">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-chatgpt-semibold shadow-lg">
                          2
                        </div>
                        <h4 className="font-chatgpt-semibold text-gray-900">Formar Equipo</h4>
                      </div>
                      <p className="text-sm text-gray-700 mb-3">
                        Agrega <strong>Miembros</strong> al proyecto y asigna roles (Product Owner, Scrum Master, Developers, etc.).
                      </p>
                      <button
                        onClick={() => { setActiveTab('miembros'); setShowWorkflowGuide(false); }}
                        className="text-green-700 hover:text-green-900 text-sm font-chatgpt-medium flex items-center space-x-1"
                      >
                        <span>Ir a Miembros</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    {/* Paso 3: Definir Epics */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border-2 border-purple-200 hover:border-purple-400 transition-all hover:shadow-md">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-chatgpt-semibold shadow-lg">
                          3
                        </div>
                        <h4 className="font-chatgpt-semibold text-gray-900">Definir Epics</h4>
                      </div>
                      <p className="text-sm text-gray-700 mb-3">
                        Crea <strong>Epics</strong> (grandes funcionalidades) que representen los objetivos principales del proyecto.
                      </p>
                      <button
                        onClick={() => { setActiveTab('epics'); setShowWorkflowGuide(false); }}
                        className="text-purple-700 hover:text-purple-900 text-sm font-chatgpt-medium flex items-center space-x-1"
                      >
                        <span>Ir a Epics</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    {/* Paso 4: Crear Sprints */}
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border-2 border-orange-200 hover:border-orange-400 transition-all hover:shadow-md">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-chatgpt-semibold shadow-lg">
                          4
                        </div>
                        <h4 className="font-chatgpt-semibold text-gray-900">Planificar Sprints</h4>
                      </div>
                      <p className="text-sm text-gray-700 mb-3">
                        Crea <strong>Sprints</strong> (iteraciones de 1-4 semanas) con objetivos claros y fechas definidas.
                      </p>
                      <button
                        onClick={() => { setActiveTab('sprints'); setShowWorkflowGuide(false); }}
                        className="text-orange-700 hover:text-orange-900 text-sm font-chatgpt-medium flex items-center space-x-1"
                      >
                        <span>Ir a Sprints</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    {/* Paso 5: Gestionar User Stories */}
                    <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-5 border-2 border-cyan-200 hover:border-cyan-400 transition-all hover:shadow-md">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-8 h-8 bg-cyan-600 text-white rounded-full flex items-center justify-center font-chatgpt-semibold shadow-lg">
                          5
                        </div>
                        <h4 className="font-chatgpt-semibold text-gray-900">Crear User Stories</h4>
                      </div>
                      <p className="text-sm text-gray-700 mb-3">
                        Dentro de cada Epic, crea <strong>User Stories</strong> (requisitos específicos) y asígnalas a Sprints.
                      </p>
                      <div className="text-cyan-700 text-sm font-chatgpt-medium flex items-center space-x-1">
                        <span>Desde la sección Epics</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    </div>

                    {/* Paso 6: Gestionar Tareas */}
                    <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-5 border-2 border-pink-200 hover:border-pink-400 transition-all hover:shadow-md">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-8 h-8 bg-pink-600 text-white rounded-full flex items-center justify-center font-chatgpt-semibold shadow-lg">
                          6
                        </div>
                        <h4 className="font-chatgpt-semibold text-gray-900">Ejecutar Tareas</h4>
                      </div>
                      <p className="text-sm text-gray-700 mb-3">
                        Usa el tablero <strong>Kanban</strong> para gestionar tareas: mover de Pendiente → En Progreso → Completada.
                      </p>
                      <button
                        onClick={() => { setActiveTab('tareas'); setShowWorkflowGuide(false); }}
                        className="text-pink-700 hover:text-pink-900 text-sm font-chatgpt-medium flex items-center space-x-1"
                      >
                        <span>Ir a Tareas</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Tips adicionales */}
                  <div className="mt-6 bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-500 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h5 className="font-chatgpt-semibold text-gray-900 mb-2">💡 Mejores Prácticas</h5>
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li>• <strong>Product Owner:</strong> Define y prioriza los Epics y User Stories</li>
                          <li>• <strong>Scrum Master:</strong> Facilita el proceso y elimina impedimentos</li>
                          <li>• <strong>Development Team:</strong> Estima y ejecuta las tareas en cada Sprint</li>
                          <li>• <strong>Sprint Planning:</strong> Selecciona User Stories y crea tareas al inicio de cada Sprint</li>
                          <li>• <strong>Daily Standups:</strong> Actualiza el estado de las tareas diariamente en el tablero</li>
                          <li>• <strong>Sprint Review/Retro:</strong> Al finalizar cada Sprint, revisa el progreso y mejora continua</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-gradient-to-br from-cream to-gray-50 border-b border-gray-200 px-4 sm:px-6">
          <div className="flex justify-center">
            <div className="max-w-7xl w-full">
              <div className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('detalles')}
                  className={`py-4 px-1 border-b-2 font-chatgpt-medium text-sm transition-colors duration-200 ${
                    activeTab === 'detalles'
                      ? 'border-blue-deep text-blue-deep'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Detalles
                </button>
                <button
                  onClick={() => setActiveTab('epics')}
                  className={`py-4 px-1 border-b-2 font-chatgpt-medium text-sm transition-colors duration-200 ${
                    activeTab === 'epics'
                      ? 'border-blue-deep text-blue-deep'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Epics ({project.epics?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('user-stories')}
                  className={`py-4 px-1 border-b-2 font-chatgpt-medium text-sm transition-colors duration-200 ${
                    activeTab === 'user-stories'
                      ? 'border-blue-deep text-blue-deep'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  User Stories ({project.userStories?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('sprints')}
                  className={`py-4 px-1 border-b-2 font-chatgpt-medium text-sm transition-colors duration-200 ${
                    activeTab === 'sprints'
                      ? 'border-blue-deep text-blue-deep'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Sprints ({project.sprints?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('tareas')}
                  className={`py-4 px-1 border-b-2 font-chatgpt-medium text-sm transition-colors duration-200 ${
                    activeTab === 'tareas'
                      ? 'border-blue-deep text-blue-deep'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Tareas
                </button>
                <button
                  onClick={() => setActiveTab('miembros')}
                  className={`py-4 px-1 border-b-2 font-chatgpt-medium text-sm transition-colors duration-200 ${
                    activeTab === 'miembros'
                      ? 'border-blue-deep text-blue-deep'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Miembros ({project.members?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('calendario')}
                  className={`py-4 px-1 border-b-2 font-chatgpt-medium text-sm transition-colors duration-200 ${
                    activeTab === 'calendario'
                      ? 'border-blue-deep text-blue-deep'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Calendario
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 bg-gradient-to-br from-cream to-gray-50 px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto">
          <div className="flex justify-center">
            <div className="max-w-7xl w-full">
              {activeTab === 'detalles' && (() => {
                const stats = calculateDashboardStats();
                if (!stats) return null;

                return (
                  <div className="space-y-6">
                    {/* Header del Dashboard */}
                    <div className="bg-gradient-to-r from-blue-deep to-blue-light rounded-2xl shadow-medium p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-chatgpt-semibold mb-2">Dashboard del Proyecto</h2>
                          <p className="text-blue-100">Vista general de métricas y progreso</p>
                        </div>
                        {/* Health Indicator */}
                        <div className={`px-4 py-2 rounded-xl font-chatgpt-semibold flex items-center space-x-2 ${
                          stats.healthStatus === 'healthy' ? 'bg-green-500/20 border-2 border-green-300 text-green-100' :
                          stats.healthStatus === 'warning' ? 'bg-yellow-500/20 border-2 border-yellow-300 text-yellow-100' :
                          'bg-red-500/20 border-2 border-red-300 text-red-100'
                        }`}>
                          <span className="text-2xl">
                            {stats.healthStatus === 'healthy' ? '🟢' : stats.healthStatus === 'warning' ? '🟡' : '🔴'}
                          </span>
                          <span>
                            {stats.healthStatus === 'healthy' ? 'On Track' : stats.healthStatus === 'warning' ? 'Requiere Atención' : 'En Riesgo'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* KPI Cards - Priorizando datos del Sprint Actual */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                      {/* Progreso del Sprint Actual (PRIMERO Y MÁS DESTACADO) */}
                      {stats.activeSprint ? (
                        <div className="bg-gradient-to-br from-yellow-sun/10 via-yellow-sun/5 to-white rounded-2xl shadow-medium border-2 border-yellow-sun/30 p-6 hover:shadow-lg transition-all hover:border-yellow-sun hover:scale-[1.02] group">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-yellow-sun to-yellow-soft rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </div>
                            <span className="text-3xl font-chatgpt-bold text-yellow-sun">{stats.activeSprint.progress || 0}%</span>
                          </div>
                          <h3 className="text-sm font-chatgpt-semibold text-gray-900 mb-1">Sprint Actual</h3>
                          <p className="text-xs text-gray-600 mb-3 truncate">{stats.activeSprint.name}</p>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                            <div 
                              className="bg-gradient-to-r from-yellow-sun to-yellow-soft h-2.5 rounded-full transition-all duration-500 shadow-sm"
                              style={{ width: `${stats.activeSprint.progress || 0}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-3 text-xs">
                            <span className="text-gray-600">{stats.activeSprint.tasks?.completed || 0}/{stats.activeSprint.tasks?.total || 0} tareas</span>
                            <span className="text-yellow-sun font-chatgpt-medium">{stats.activeSprint.daysRemaining}d restantes</span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-6 hover:shadow-lg transition-all hover:border-blue-deep">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-deep to-blue-light rounded-xl flex items-center justify-center shadow-medium">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </div>
                            <span className="text-3xl font-chatgpt-semibold text-blue-deep">{stats.progress}%</span>
                          </div>
                          <h3 className="text-sm font-chatgpt-medium text-gray-700 mb-1">Progreso General</h3>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                              className="bg-gradient-to-r from-blue-deep to-blue-light h-2 rounded-full transition-all duration-500"
                              style={{ width: `${stats.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Tareas del Sprint Actual */}
                      {stats.activeSprint ? (
                        <div className="bg-white rounded-2xl shadow-soft border-2 border-gray-200 p-6 hover:shadow-lg transition-all hover:border-blue-deep hover:scale-[1.01]">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-deep to-blue-light rounded-xl flex items-center justify-center shadow-medium">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                              </svg>
                            </div>
                            <span className="text-3xl font-chatgpt-semibold text-blue-deep">{stats.activeSprint.tasks?.total || 0}</span>
                          </div>
                          <h3 className="text-sm font-chatgpt-medium text-gray-700 mb-2">Tareas del Sprint</h3>
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span className="flex items-center space-x-1">
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                              <span>{stats.activeSprint.tasks?.completed || 0} Completadas</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              <span>{stats.activeSprint.tasks?.inProgress || 0} En Progreso</span>
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-6 hover:shadow-lg transition-all hover:border-purple-400">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <span className="text-3xl font-chatgpt-semibold text-purple-600">{stats.epics.total}</span>
                          </div>
                          <h3 className="text-sm font-chatgpt-medium text-gray-700 mb-2">Epics</h3>
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span className="flex items-center space-x-1">
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                              <span>{stats.epics.completed} Completados</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              <span>{stats.epics.inProgress} Activos</span>
                            </span>
                          </div>
                        </div>
                      )}

                      {/* User Stories / Story Points del Sprint */}
                      {stats.activeSprint ? (
                        <div className="bg-white rounded-2xl shadow-soft border-2 border-gray-200 p-6 hover:shadow-lg transition-all hover:border-blue-light hover:scale-[1.01]">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-light to-cyan-400 rounded-xl flex items-center justify-center shadow-medium">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <span className="text-3xl font-chatgpt-semibold text-blue-light">{stats.activeSprint.storyPoints || 0}</span>
                          </div>
                          <h3 className="text-sm font-chatgpt-medium text-gray-700 mb-2">Story Points</h3>
                          <p className="text-xs text-gray-600">{stats.activeSprint.userStories || 0} User Stories</p>
                        </div>
                      ) : (
                        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-6 hover:shadow-lg transition-all hover:border-orange-400">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <span className="text-3xl font-chatgpt-semibold text-orange-600">{stats.sprints.total}</span>
                          </div>
                          <h3 className="text-sm font-chatgpt-medium text-gray-700 mb-2">Sprints</h3>
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span className="flex items-center space-x-1">
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                              <span>{stats.sprints.active} Activos</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                              <span>{stats.sprints.completed} Completados</span>
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Miembros del Equipo (siempre visible) */}
                      <div className="bg-white rounded-2xl shadow-soft border-2 border-gray-200 p-6 hover:shadow-lg transition-all hover:border-green-400 hover:scale-[1.01]">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-medium">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          </div>
                          <span className="text-3xl font-chatgpt-semibold text-green-600">{stats.members}</span>
                        </div>
                        <h3 className="text-sm font-chatgpt-medium text-gray-700 mb-2">Miembros del Equipo</h3>
                        <button
                          onClick={() => setActiveTab('miembros')}
                          className="text-xs text-green-600 hover:text-green-700 font-chatgpt-medium flex items-center space-x-1 transition-colors"
                        >
                          <span>Ver equipo completo</span>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Columna Izquierda - Progreso Visual */}
                      <div className="lg:col-span-2 space-y-6">
                        {/* Gráfico de Progreso Grande */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                          <h3 className="text-lg font-chatgpt-semibold text-gray-900 mb-6 flex items-center space-x-2">
                            <svg className="w-5 h-5 text-blue-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span>Distribución de Epics</span>
                          </h3>
                          
                          {stats.epics.total > 0 ? (
                    <div>
                              {/* Barra de progreso visual */}
                              <div className="flex items-center justify-center mb-8">
                                <div className="relative w-48 h-48">
                                  <svg className="w-full h-full transform -rotate-90">
                                    {/* Círculo de fondo */}
                                    <circle
                                      cx="96"
                                      cy="96"
                                      r="80"
                                      stroke="#E5E7EB"
                                      strokeWidth="16"
                                      fill="none"
                                    />
                                    {/* Círculo de progreso */}
                                    <circle
                                      cx="96"
                                      cy="96"
                                      r="80"
                                      stroke="url(#gradient)"
                                      strokeWidth="16"
                                      fill="none"
                                      strokeDasharray={`${2 * Math.PI * 80}`}
                                      strokeDashoffset={`${2 * Math.PI * 80 * (1 - stats.progress / 100)}`}
                                      strokeLinecap="round"
                                      className="transition-all duration-1000"
                                    />
                                    <defs>
                                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#0264C5" />
                                        <stop offset="100%" stopColor="#11C0F1" />
                                      </linearGradient>
                                    </defs>
                                  </svg>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-chatgpt-semibold bg-gradient-to-r from-blue-deep to-blue-light bg-clip-text text-transparent">
                                      {stats.progress}%
                                    </span>
                                    <span className="text-sm text-gray-600 mt-1">Completado</span>
                                  </div>
                                </div>
                    </div>
                    
                              {/* Desglose de estados */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                                  <div className="text-2xl font-chatgpt-semibold text-green-700">{stats.epics.completed}</div>
                                  <div className="text-xs text-gray-600 mt-1">✅ Completados</div>
                                </div>
                                <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                                  <div className="text-2xl font-chatgpt-semibold text-blue-700">{stats.epics.inProgress}</div>
                                  <div className="text-xs text-gray-600 mt-1">🚀 En Progreso</div>
                                </div>
                                <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-200">
                                  <div className="text-2xl font-chatgpt-semibold text-purple-700">{stats.epics.ready}</div>
                                  <div className="text-xs text-gray-600 mt-1">✅ Listos</div>
                                </div>
                                <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                                  <div className="text-2xl font-chatgpt-semibold text-gray-700">{stats.epics.draft}</div>
                                  <div className="text-xs text-gray-600 mt-1">📝 Borradores</div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <p>No hay epics para mostrar métricas</p>
                              <a
                                href={`/epics/nuevo?projectId=${project.id}`}
                                className="inline-flex items-center mt-4 text-blue-deep hover:text-blue-light font-chatgpt-medium transition-colors"
                              >
                                <span>Crear primer epic</span>
                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Sprint Activo - Sección Destacada */}
                        {stats.activeSprint ? (
                          <div className="bg-gradient-to-br from-yellow-sun/20 via-yellow-sun/10 to-white rounded-2xl shadow-medium border-2 border-yellow-sun/40 p-6 sm:p-8 hover:shadow-lg transition-all duration-300">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-3">
                                  <div className="w-14 h-14 bg-gradient-to-br from-yellow-sun to-yellow-soft rounded-xl flex items-center justify-center shadow-lg">
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <h3 className="text-xl sm:text-2xl font-chatgpt-bold text-gray-900 mb-1">Sprint Actual</h3>
                                    <p className="text-base sm:text-lg font-chatgpt-semibold text-yellow-sun">{stats.activeSprint.name}</p>
                                  </div>
                                </div>
                                {stats.activeSprint.goal && (
                                  <p className="text-sm text-gray-700 bg-white/60 rounded-lg p-3 border border-yellow-sun/20">
                                    <span className="font-chatgpt-medium text-gray-900">Objetivo:</span> {stats.activeSprint.goal}
                                  </p>
                                )}
                              </div>
                              <div className={`px-5 py-4 rounded-2xl font-chatgpt-bold text-center shadow-lg border-2 transition-all ${
                                stats.activeSprint.daysRemaining < 3 ? 'bg-red-100 text-red-800 border-red-300' :
                                stats.activeSprint.daysRemaining < 7 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                'bg-green-100 text-green-800 border-green-300'
                              }`}>
                                <div className="text-3xl sm:text-4xl">{stats.activeSprint.daysRemaining}</div>
                                <div className="text-xs sm:text-sm mt-1">días restantes</div>
                              </div>
                            </div>
                            
                            {/* Métricas del Sprint */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                              <div className="bg-white/80 rounded-xl p-4 border border-yellow-sun/20">
                                <div className="text-2xl font-chatgpt-bold text-blue-deep">{stats.activeSprint.progress || 0}%</div>
                                <div className="text-xs text-gray-600 mt-1">Progreso</div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                  <div 
                                    className="bg-gradient-to-r from-yellow-sun to-yellow-soft h-1.5 rounded-full transition-all duration-500"
                                    style={{ width: `${stats.activeSprint.progress || 0}%` }}
                                  />
                                </div>
                              </div>
                              <div className="bg-white/80 rounded-xl p-4 border border-yellow-sun/20">
                                <div className="text-2xl font-chatgpt-bold text-blue-deep">{stats.activeSprint.tasks?.total || 0}</div>
                                <div className="text-xs text-gray-600 mt-1">Total Tareas</div>
                                <div className="text-xs text-green-600 mt-1">{stats.activeSprint.tasks?.completed || 0} completadas</div>
                              </div>
                              <div className="bg-white/80 rounded-xl p-4 border border-yellow-sun/20">
                                <div className="text-2xl font-chatgpt-bold text-blue-deep">{stats.activeSprint.userStories || 0}</div>
                                <div className="text-xs text-gray-600 mt-1">User Stories</div>
                                <div className="text-xs text-blue-600 mt-1">{stats.activeSprint.storyPoints || 0} puntos</div>
                              </div>
                              <div className="bg-white/80 rounded-xl p-4 border border-yellow-sun/20">
                                <div className="text-2xl font-chatgpt-bold text-blue-deep">{stats.activeSprint.tasks?.inProgress || 0}</div>
                                <div className="text-xs text-gray-600 mt-1">En Progreso</div>
                                <div className="text-xs text-orange-600 mt-1">{stats.activeSprint.tasks?.todo || 0} pendientes</div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-yellow-sun/30">
                              <div className="text-sm text-gray-700">
                                <span className="font-chatgpt-medium">Finaliza:</span> {formatDate(stats.activeSprint.endDate)}
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => setActiveTab('tareas')}
                                  className="px-4 py-2 bg-gradient-to-r from-blue-deep to-blue-light hover:from-blue-light hover:to-blue-deep text-white rounded-xl font-chatgpt-medium transition-all duration-300 shadow-soft hover:shadow-medium hover:scale-105 active:scale-95 text-sm flex items-center space-x-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                  <span>Ver Tareas</span>
                                </button>
                                <button
                                  onClick={() => setActiveTab('sprints')}
                                  className="px-4 py-2 bg-white border-2 border-gray-300 hover:border-blue-deep text-gray-700 hover:text-blue-deep rounded-xl font-chatgpt-medium transition-all duration-300 hover:scale-105 active:scale-95 text-sm flex items-center space-x-2"
                                >
                                  <span>Ver Detalles</span>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                            <div className="text-center py-6">
                              <span className="text-4xl mb-4 block">📋</span>
                              <h3 className="text-lg font-chatgpt-semibold text-gray-900 mb-2">No hay sprint activo</h3>
                              <p className="text-sm text-gray-600 mb-4">Crea un sprint para comenzar a trabajar</p>
                              <a
                                href={`/sprints/nuevo?projectId=${project.id}`}
                                className="inline-flex items-center bg-blue-deep hover:bg-blue-light text-white px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-300 shadow-medium hover:shadow-lg hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-light/30 focus:ring-offset-2"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Crear Sprint
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Lista de Todos los Sprints */}
                        {project.sprints && project.sprints.length > 0 && (
                          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-chatgpt-semibold text-gray-900 flex items-center space-x-2">
                                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Todos los Sprints ({project.sprints.length})</span>
                              </h3>
                              <button
                                onClick={() => setActiveTab('sprints')}
                                className="text-xs text-[#0264C5] hover:text-[#11C0F1] font-chatgpt-medium flex items-center space-x-1"
                              >
                                <span>Ver todos</span>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {project.sprints.slice(0, 5).map((sprint: any) => (
                                <div key={sprint.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <span className={`w-2 h-2 rounded-full ${
                                        sprint.status === 'ACTIVE' ? 'bg-green-500' :
                                        sprint.status === 'COMPLETED' ? 'bg-gray-400' :
                                        sprint.status === 'PLANNING' ? 'bg-blue-500' :
                                        'bg-yellow-500'
                                      }`}></span>
                                      <a
                                        href={`/sprints/detalle?id=${sprint.id}`}
                                        className="font-chatgpt-medium text-gray-900 hover:text-blue-deep transition-colors"
                                      >
                                        {sprint.name}
                                      </a>
                                    </div>
                                    {sprint.goal && (
                                      <p className="text-xs text-gray-600 mt-1 ml-4">{sprint.goal.substring(0, 60)}{sprint.goal.length > 60 ? '...' : ''}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <span className={`text-xs px-2 py-1 rounded-full font-chatgpt-medium ${
                                      sprint.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                      sprint.status === 'COMPLETED' ? 'bg-gray-100 text-gray-700' :
                                      sprint.status === 'PLANNING' ? 'bg-blue-100 text-blue-700' :
                                      'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {getStatusName(sprint.status)}
                                    </span>
                                    <a
                                      href={`/sprints/detalle?id=${sprint.id}`}
                                      className="text-gray-400 hover:text-blue-deep transition-colors"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {project.sprints.length > 5 && (
                              <div className="mt-4 text-center">
                                <button
                                  onClick={() => setActiveTab('sprints')}
                                  className="text-sm text-blue-deep hover:text-blue-light font-chatgpt-medium transition-colors"
                                >
                                  Ver {project.sprints.length - 5} sprints más →
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Auditoría del Proyecto / Activity Feed */}
                        {(() => {
                          // Generar actividades basadas en datos del proyecto
                          const activities = [];
                          
                          // Actividad de creación del proyecto
                          activities.push({
                            id: 'project-created',
                            type: 'creation',
                            title: 'Proyecto creado',
                            description: `El proyecto "${project.name}" fue creado`,
                            timestamp: project.createdAt,
                            icon: '🎯',
                            color: 'purple'
                          });

                          // Actividades de miembros
                          if (project.members && project.members.length > 0) {
                            project.members.slice(0, 3).forEach((member, idx) => {
                              activities.push({
                                id: `member-${member.id}`,
                                type: 'member',
                                title: 'Miembro agregado',
                                description: `${member.user.name} se unió como ${getRoleName(member.role)}`,
                                timestamp: member.joinedAt,
                                icon: '👤',
                                color: 'green'
                              });
                            });
                          }

                          // Actividades de epics
                          if (project.epics && project.epics.length > 0) {
                            project.epics.slice(0, 3).forEach((epic) => {
                              activities.push({
                                id: `epic-${epic.id}`,
                                type: 'epic',
                                title: 'Epic creado',
                                description: `"${epic.title}" fue agregado al proyecto`,
                                timestamp: epic.createdAt,
                                icon: '⚡',
                                color: 'purple'
                              });
                            });
                          }

                          // Actividades de sprints
                          if (project.sprints && project.sprints.length > 0) {
                            project.sprints.slice(0, 3).forEach((sprint) => {
                              activities.push({
                                id: `sprint-${sprint.id}`,
                                type: 'sprint',
                                title: sprint.status === 'ACTIVE' ? 'Sprint iniciado' : 'Sprint creado',
                                description: `"${sprint.name}" ${sprint.status === 'ACTIVE' ? 'está en progreso' : 'fue planificado'}`,
                                timestamp: sprint.startDate || new Date().toISOString(),
                                icon: '🏃',
                                color: sprint.status === 'ACTIVE' ? 'green' : 'blue'
                              });
                            });
                          }

                          // Actividad de última actualización
                          if (project.updatedAt !== project.createdAt) {
                            activities.push({
                              id: 'project-updated',
                              type: 'update',
                              title: 'Proyecto actualizado',
                              description: 'Se realizaron cambios en la configuración del proyecto',
                              timestamp: project.updatedAt,
                              icon: '✏️',
                              color: 'blue'
                            });
                          }

                          // Ordenar por fecha más reciente
                          activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                          const getActivityColorClasses = (color: string) => {
                            switch (color) {
                              case 'green': return 'bg-green-50 border-green-200 text-green-700';
                              case 'blue': return 'bg-blue-50 border-blue-200 text-blue-700';
                              case 'purple': return 'bg-purple-50 border-purple-200 text-purple-700';
                              case 'orange': return 'bg-orange-50 border-orange-200 text-orange-700';
                              case 'red': return 'bg-red-50 border-red-200 text-red-700';
                              default: return 'bg-gray-50 border-gray-200 text-gray-700';
                            }
                          };

                          const getTimeAgo = (timestamp: string) => {
                            const now = new Date();
                            const then = new Date(timestamp);
                            const diffMs = now.getTime() - then.getTime();
                            const diffMins = Math.floor(diffMs / 60000);
                            const diffHours = Math.floor(diffMs / 3600000);
                            const diffDays = Math.floor(diffMs / 86400000);

                            if (diffMins < 1) return 'Hace un momento';
                            if (diffMins < 60) return `Hace ${diffMins} min`;
                            if (diffHours < 24) return `Hace ${diffHours}h`;
                            if (diffDays < 7) return `Hace ${diffDays}d`;
                            return then.toLocaleDateString('es-PA', { month: 'short', day: 'numeric' });
                          };

                          return (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                              <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-chatgpt-semibold text-gray-900 flex items-center space-x-2">
                                  <svg className="w-5 h-5 text-[#0264C5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                  </svg>
                                  <span>Auditoría del Proyecto</span>
                                </h3>
                                <span className="text-xs text-gray-500 font-chatgpt-medium">
                                  {activities.length} eventos
                                </span>
                              </div>

                              {/* Timeline de actividades */}
                              <div className="relative">
                                {/* Línea vertical del timeline */}
                                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-deep via-blue-light to-gray-300"></div>

                                {/* Lista de actividades */}
                                <div className="space-y-4">
                                  {activities.slice(0, visibleActivities).map((activity, index) => (
                                    <div
                                      key={activity.id}
                                      className="relative pl-16 group"
                                    >
                                      {/* Punto del timeline */}
                                      <div className={`absolute left-3 w-6 h-6 rounded-full border-2 border-white shadow-md flex items-center justify-center text-xs ${getActivityColorClasses(activity.color)} transition-transform duration-200 group-hover:scale-125`}>
                                        {activity.icon}
                                      </div>

                                      {/* Contenido de la actividad */}
                                      <div className={`p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${getActivityColorClasses(activity.color)}`}>
                                        <div className="flex items-start justify-between mb-1">
                                          <h4 className="font-chatgpt-semibold text-sm text-gray-900">
                                            {activity.title}
                                          </h4>
                                          <span className="text-[10px] text-gray-500 font-chatgpt-medium whitespace-nowrap ml-2">
                                            {getTimeAgo(activity.timestamp)}
                                          </span>
                                        </div>
                                        <p className="text-xs text-gray-600">
                                          {activity.description}
                                        </p>
                                        <div className="mt-2 flex items-center space-x-2">
                                          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          <span className="text-[10px] text-gray-500">
                                            {new Date(activity.timestamp).toLocaleString('es-PA', {
                                              year: 'numeric',
                                              month: 'short',
                                              day: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Controles de paginación */}
                                {activities.length > 5 && (
                                  <div className="mt-6 flex flex-col items-center space-y-3">
                                    {/* Indicador de progreso */}
                                    <div className="text-center">
                                      <p className="text-sm text-gray-600 font-chatgpt-medium">
                                        Mostrando {Math.min(visibleActivities, activities.length)} de {activities.length} actividades
                                      </p>
                                      <div className="w-48 h-1.5 bg-gray-200 rounded-full mt-2 mx-auto overflow-hidden">
                                        <div 
                                          className="h-full bg-gradient-to-r from-blue-deep to-blue-light transition-all duration-300 rounded-full"
                                          style={{ width: `${(Math.min(visibleActivities, activities.length) / activities.length) * 100}%` }}
                                        />
                                      </div>
                                    </div>

                                    {/* Botones */}
                                    <div className="flex items-center space-x-3">
                                      {visibleActivities < activities.length && (
                                        <button
                                          onClick={() => setVisibleActivities(prev => Math.min(prev + 5, activities.length))}
                                          className="px-4 py-2 bg-gradient-to-r from-blue-deep to-blue-light hover:shadow-lg text-white rounded-xl font-chatgpt-medium transition-all duration-300 hover:scale-105 active:scale-95 flex items-center space-x-2 focus:outline-none focus:ring-4 focus:ring-blue-light/30 focus:ring-offset-2"
                                        >
                                          <span>Ver más actividades</span>
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                          </svg>
                                        </button>
                                      )}
                                      
                                      {visibleActivities > 5 && (
                                        <button
                                          onClick={() => setVisibleActivities(5)}
                                          className="px-4 py-2 bg-white border-2 border-gray-300 hover:border-blue-deep text-gray-700 hover:text-blue-deep rounded-xl font-chatgpt-medium transition-all duration-300 hover:scale-105 active:scale-95 flex items-center space-x-2 focus:outline-none focus:ring-4 focus:ring-blue-light/30 focus:ring-offset-2"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                          </svg>
                                          <span>Ver menos</span>
                                        </button>
                                      )}
                                    </div>

                                    {/* Mensaje de cantidad restante */}
                                    {visibleActivities < activities.length && (
                                      <p className="text-xs text-gray-500">
                                        +{activities.length - visibleActivities} más sin mostrar
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Estado vacío */}
                                {activities.length === 0 && (
                                  <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                      No hay actividades registradas
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Leyenda de tipos de actividad */}
                              <div className="mt-6 pt-6 border-t border-gray-200">
                                <p className="text-xs font-chatgpt-semibold text-gray-500 uppercase tracking-wide mb-3">
                                  Tipos de eventos
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm">🎯</span>
                                    <span className="text-xs text-gray-600">Proyecto</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm">👤</span>
                                    <span className="text-xs text-gray-600">Miembros</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm">⚡</span>
                                    <span className="text-xs text-gray-600">Epics</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm">🏃</span>
                                    <span className="text-xs text-gray-600">Sprints</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Columna Derecha - Info y Acciones */}
                      <div className="space-y-6">
                        {/* Información del Proyecto */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                          <h3 className="text-lg font-chatgpt-semibold text-gray-900 mb-4 flex items-center space-x-2">
                            <svg className="w-5 h-5 text-[#0264C5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Información</span>
                          </h3>
                          <div className="space-y-4">
                            <div>
                              <label className="text-xs font-chatgpt-medium text-gray-500 uppercase tracking-wide">Descripción</label>
                              <p className="text-sm text-gray-900 mt-1">{project.description || 'Sin descripción'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-chatgpt-medium text-gray-500 uppercase tracking-wide">Estado</label>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                          {getStatusName(project.status)}
                        </span>
                      </div>
                    </div>
                    <div>
                              <label className="text-xs font-chatgpt-medium text-gray-500 uppercase tracking-wide">Fechas</label>
                              <p className="text-sm text-gray-900 mt-1">
                                📅 {formatDate(project.startDate)}
                                {project.endDate && (
                                  <><br />📆 {formatDate(project.endDate)}</>
                                )}
                              </p>
                    </div>
                          </div>
                    </div>
                    
                        {/* Acciones Rápidas */}
                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-sm border border-blue-200 p-6">
                          <h3 className="text-lg font-chatgpt-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
                          <div className="space-y-2">
                            <a
                              href={`/epics/nuevo?projectId=${project.id}`}
                              className="flex items-center space-x-3 p-3 bg-white rounded-xl hover:shadow-md transition-all hover:scale-105 active:scale-95 border border-blue-200"
                            >
                              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                <span className="text-lg">⚡</span>
                              </div>
                              <span className="font-chatgpt-medium text-gray-900 flex-1">Crear Epic</span>
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </a>
                            <a
                              href={`/sprints/nuevo?projectId=${project.id}`}
                              className="flex items-center space-x-3 p-3 bg-white rounded-xl hover:shadow-md transition-all hover:scale-105 active:scale-95 border border-blue-200"
                            >
                              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                <span className="text-lg">🏃</span>
                              </div>
                              <span className="font-chatgpt-medium text-gray-900 flex-1">Crear Sprint</span>
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </a>
                            <button
                              onClick={() => setShowAddMemberModal(true)}
                              className="w-full flex items-center space-x-3 p-3 bg-white rounded-xl hover:shadow-md transition-all hover:scale-105 active:scale-95 border border-blue-200"
                            >
                              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                <span className="text-lg">👥</span>
                              </div>
                              <span className="font-chatgpt-medium text-gray-900 flex-1">Agregar Miembro</span>
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                    </div>

                        {/* Calendario Compacto */}
                        {(() => {
                          const compactMonth = new Date();
                          const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(compactMonth);
                          const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                          const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
                          
                          const today = new Date();
                          const isToday = (day: number) => {
                            return day === today.getDate() && 
                                   month === today.getMonth() && 
                                   year === today.getFullYear();
                          };

                          return (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-chatgpt-semibold text-gray-900 flex items-center space-x-2">
                                  <svg className="w-5 h-5 text-[#0264C5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span>Calendario</span>
                                </h3>
                                <button
                                  onClick={() => setActiveTab('calendario')}
                                  className="text-xs text-blue-deep hover:text-blue-light font-chatgpt-medium flex items-center space-x-1 transition-colors"
                                >
                                  <span>Ver completo</span>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              </div>

                              {/* Mes actual */}
                              <div className="text-center mb-3">
                                <h4 className="text-sm font-chatgpt-semibold bg-gradient-to-r from-blue-deep to-blue-light bg-clip-text text-transparent">
                                  {monthNames[month]} {year}
                                </h4>
                              </div>

                              {/* Días de la semana */}
                              <div className="grid grid-cols-7 gap-1 mb-1">
                                {dayNames.map((day, idx) => (
                                  <div
                                    key={idx}
                                    className="text-center text-[10px] font-chatgpt-semibold text-gray-500 uppercase"
                                  >
                                    {day}
                                  </div>
                                ))}
                              </div>

                              {/* Días del mes */}
                              <div className="grid grid-cols-7 gap-1">
                                {/* Espacios vacíos */}
                                {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                                  <div key={`empty-${index}`} className="aspect-square"></div>
                                ))}

                                {/* Días */}
                                {Array.from({ length: daysInMonth }).map((_, index) => {
                                  const day = index + 1;
                                  const sprintsOnDay = getSprintsForDay(day, month, year);
                                  const hasActiveSprint = sprintsOnDay.some(s => s.status === 'ACTIVE');
                                  
                                  return (
                                    <div
                                      key={day}
                                      className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-chatgpt-medium transition-all duration-200 cursor-pointer relative group ${
                                        isToday(day)
                                          ? 'bg-gradient-to-br from-blue-deep to-blue-light text-white shadow-medium scale-110'
                                          : sprintsOnDay.length > 0
                                          ? hasActiveSprint
                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                          : 'text-gray-600 hover:bg-gray-100'
                                      }`}
                                      onClick={() => setActiveTab('calendario')}
                                    >
                                      {day}
                                      
                                      {/* Indicador de sprints */}
                                      {sprintsOnDay.length > 0 && !isToday(day) && (
                                        <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 flex space-x-0.5">
                                          {sprintsOnDay.slice(0, 3).map((sprint, idx) => (
                                            <div
                                              key={idx}
                                              className={`w-1 h-1 rounded-full ${
                                                sprint.status === 'ACTIVE' ? 'bg-green-600' :
                                                sprint.status === 'COMPLETED' ? 'bg-gray-400' :
                                                sprint.status === 'PLANNING' ? 'bg-blue-600' :
                                                'bg-yellow-500'
                                              }`}
                                            ></div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Tooltip mini */}
                                      {sprintsOnDay.length > 0 && (
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap">
                                          <div className="bg-gray-900 text-white text-[10px] rounded px-2 py-1 shadow-xl">
                                            {sprintsOnDay.length} sprint{sprintsOnDay.length > 1 ? 's' : ''}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Leyenda mini */}
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                  <div className="flex items-center space-x-1">
                                    <div className="w-2 h-2 rounded-full bg-gradient-to-br from-blue-deep to-blue-light"></div>
                                    <span className="text-gray-600">Hoy</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <div className="w-2 h-2 rounded bg-green-500"></div>
                                    <span className="text-gray-600">Activo</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <div className="w-2 h-2 rounded bg-blue-500"></div>
                                    <span className="text-gray-600">Planeado</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <div className="w-2 h-2 rounded bg-gray-400"></div>
                                    <span className="text-gray-600">Completo</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                    
                        {/* Requiere Atención */}
                        {(stats.epics.ready > 0 || stats.healthStatus !== 'healthy') && (
                          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl shadow-sm border-2 border-amber-300 p-6">
                            <h3 className="text-lg font-chatgpt-semibold text-gray-900 mb-4 flex items-center space-x-2">
                              <span className="text-xl">⚠️</span>
                              <span>Requiere Atención</span>
                            </h3>
                            <div className="space-y-3">
                              {stats.activeSprint && stats.activeSprint.daysRemaining < 3 && (
                                <div className="flex items-start space-x-3 p-3 bg-red-100 rounded-lg border border-red-200">
                                  <span className="text-lg">🔥</span>
                                  <div className="flex-1">
                                    <p className="text-sm font-chatgpt-semibold text-red-900">Sprint finaliza en {stats.activeSprint.daysRemaining} días</p>
                                    <p className="text-xs text-red-700 mt-1">Prepara la retrospectiva y planifica el próximo sprint</p>
                    </div>
                                </div>
                              )}
                              {stats.epics.ready > 0 && (
                                <div className="flex items-start space-x-3 p-3 bg-blue-100 rounded-lg border border-blue-200">
                                  <span className="text-lg">📋</span>
                                  <div className="flex-1">
                                    <p className="text-sm font-chatgpt-semibold text-blue-900">{stats.epics.ready} epic{stats.epics.ready > 1 ? 's' : ''} listo{stats.epics.ready > 1 ? 's' : ''} para trabajar</p>
                                    <button
                                      onClick={() => setActiveTab('epics')}
                                      className="text-xs text-blue-700 hover:text-blue-800 font-chatgpt-medium mt-1 flex items-center space-x-1"
                                    >
                                      <span>Ver epics</span>
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </button>
                  </div>
                </div>
              )}
                              {stats.members === 0 && (
                                <div className="flex items-start space-x-3 p-3 bg-yellow-100 rounded-lg border border-yellow-200">
                                  <span className="text-lg">👥</span>
                                  <div className="flex-1">
                                    <p className="text-sm font-chatgpt-semibold text-yellow-900">No hay miembros en el equipo</p>
                                    <button
                                      onClick={() => setActiveTab('miembros')}
                                      className="text-xs text-yellow-700 hover:text-yellow-800 font-chatgpt-medium mt-1 flex items-center space-x-1"
                                    >
                                      <span>Agregar miembros</span>
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              )}
                              {stats.epics.total === 0 && (
                                <div className="flex items-start space-x-3 p-3 bg-purple-100 rounded-lg border border-purple-200">
                                  <span className="text-lg">⚡</span>
                                  <div className="flex-1">
                                    <p className="text-sm font-chatgpt-semibold text-purple-900">El proyecto no tiene epics definidos</p>
                                    <p className="text-xs text-purple-700 mt-1">Comienza definiendo los objetivos principales del proyecto</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {activeTab === 'epics' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-chatgpt-semibold text-gray-900">Epics del Proyecto</h2>
                    <a
                      href={`/epics/nuevo?projectId=${project.id}`}
                      className="bg-blue-deep hover:bg-blue-light text-white px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-300 flex items-center space-x-2 shadow-medium hover:shadow-lg hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-light/30 focus:ring-offset-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-sm">Crear Epic</span>
                    </a>
                  </div>
                  
                  {project.epics && project.epics.length > 0 ? (
                    <div className="space-y-4">
                      {project.epics.map((epic) => (
                        <div key={epic.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow hover:border-blue-deep">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-chatgpt-semibold text-gray-900 flex-1">{epic.title}</h3>
                            <div className="flex items-center space-x-2 ml-4">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                                epic.priority === 'CRITICAL' ? 'bg-red-100 text-red-800 border-red-200' :
                                epic.priority === 'HIGH' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                epic.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                'bg-green-100 text-green-800 border-green-200'
                              }`}>
                                {epic.priority}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                                epic.status === 'COMPLETED' ? 'bg-green-100 text-green-800 border-green-200' :
                                epic.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                epic.status === 'READY' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                epic.status === 'CANCELLED' ? 'bg-red-100 text-red-800 border-red-200' :
                                'bg-gray-100 text-gray-800 border-gray-200'
                              }`}>
                                {epic.status === 'DRAFT' ? 'Borrador' :
                                 epic.status === 'READY' ? 'Listo' :
                                 epic.status === 'IN_PROGRESS' ? 'En Progreso' :
                                 epic.status === 'COMPLETED' ? 'Completado' :
                                 epic.status === 'CANCELLED' ? 'Cancelado' :
                                 epic.status}
                              </span>
                            </div>
                          </div>
                          {epic.description && (
                            <p className="text-sm text-gray-neutral mb-3">{epic.description}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-neutral">Epic #{epic.id} • {formatDate(epic.createdAt)}</span>
                            <div className="flex items-center space-x-2">
                              <a
                                href={`/epics/detalle?id=${epic.id}`}
                                className="text-blue-deep hover:text-blue-light text-xs font-chatgpt-medium transition-colors flex items-center space-x-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span>Ver</span>
                              </a>
                              <a
                                href={`/epics/editar?id=${epic.id}`}
                                className="text-gray-600 hover:text-blue-deep text-xs font-chatgpt-medium transition-colors flex items-center space-x-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>Editar</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-neutral mb-4">No hay epics en este proyecto</p>
                      <a
                        href={`/epics/nuevo?projectId=${project.id}`}
                        className="inline-flex items-center bg-blue-deep hover:bg-blue-light text-white px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-300 space-x-2 shadow-medium hover:shadow-lg hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-light/30 focus:ring-offset-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Crear Primer Epic</span>
                      </a>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'user-stories' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-chatgpt-semibold text-gray-900">User Stories del Proyecto</h2>
                    <a
                      href={`/user-stories/nuevo?projectId=${project.id}`}
                      className="bg-blue-light hover:bg-blue-deep text-white px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-300 flex items-center space-x-2 shadow-medium hover:shadow-lg hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-light/30 focus:ring-offset-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-sm">Crear User Story</span>
                    </a>
                  </div>
                  
                  {project.userStories && project.userStories.length > 0 ? (
                    <div className="space-y-4">
                      {project.userStories.map((story) => (
                        <div key={story.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow hover:border-[#11C0F1]">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-chatgpt-semibold text-gray-900 mb-1">{story.title}</h3>
                              {story.description && (
                                <p className="text-sm text-gray-neutral mb-2">{story.description}</p>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              {story.storyPoints && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                  {story.storyPoints} pts
                                </span>
                              )}
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                                story.priority === 'CRITICAL' ? 'bg-red-100 text-red-800 border-red-200' :
                                story.priority === 'HIGH' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                story.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                'bg-green-100 text-green-800 border-green-200'
                              }`}>
                                {story.priority}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                                story.status === 'COMPLETED' ? 'bg-green-100 text-green-800 border-green-200' :
                                story.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                story.status === 'READY' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                story.status === 'BLOCKED' ? 'bg-red-100 text-red-800 border-red-200' :
                                'bg-gray-100 text-gray-800 border-gray-200'
                              }`}>
                                {story.status === 'BACKLOG' ? 'Backlog' :
                                 story.status === 'READY' ? 'Listo' :
                                 story.status === 'IN_PROGRESS' ? 'En Progreso' :
                                 story.status === 'COMPLETED' ? 'Completado' :
                                 story.status === 'BLOCKED' ? 'Bloqueado' :
                                 story.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-xs text-gray-neutral">
                              <span>Story #{story.id}</span>
                              {story.epic && (
                                <>
                                  <span>•</span>
                                  <span>Epic: {story.epic.title}</span>
                                </>
                              )}
                              {story.sprint && (
                                <>
                                  <span>•</span>
                                  <span>Sprint: {story.sprint.name}</span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <a
                                href={`/user-stories/detalle?id=${story.id}`}
                                className="text-blue-light hover:text-blue-deep text-xs font-chatgpt-medium transition-colors flex items-center space-x-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span>Ver</span>
                              </a>
                              <a
                                href={`/user-stories/editar?id=${story.id}`}
                                className="text-gray-600 hover:text-blue-light text-xs font-chatgpt-medium transition-colors flex items-center space-x-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>Editar</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-neutral mb-4">No hay user stories en este proyecto</p>
                      <a
                        href={`/user-stories/nuevo?projectId=${project.id}`}
                        className="inline-flex items-center bg-blue-light hover:bg-blue-deep text-white px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-300 space-x-2 shadow-medium hover:shadow-lg hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-light/30 focus:ring-offset-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Crear Primera User Story</span>
                      </a>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'sprints' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-chatgpt-semibold text-gray-900">Sprints del Proyecto</h2>
                    <a
                      href={`/sprints/nuevo?projectId=${project.id}`}
                      className="bg-blue-deep hover:bg-blue-light text-white px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-300 shadow-medium hover:shadow-lg flex items-center space-x-2 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-light/30 focus:ring-offset-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Crear Sprint</span>
                    </a>
                  </div>
                  {project.sprints && project.sprints.length > 0 ? (
                    <div className="space-y-4">
                      {project.sprints.map((sprint) => (
                        <div key={sprint.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-chatgpt-semibold text-gray-900 mb-1">{sprint.name}</h3>
                              {sprint.goal && (
                                <p className="text-sm text-gray-neutral mb-2">Objetivo: {sprint.goal}</p>
                              )}
                            </div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ml-4 ${getStatusColor(sprint.status)}`}>
                              {getStatusName(sprint.status)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-xs text-gray-neutral">
                              <span>Inicio: {formatDate(sprint.startDate)}</span>
                              <span>•</span>
                              <span>Fin: {formatDate(sprint.endDate)}</span>
                            </div>
                            <a
                              href={`/sprints/detalle?id=${sprint.id}`}
                              className="bg-blue-deep hover:bg-blue-light text-white px-3 py-1.5 rounded-lg text-xs font-chatgpt-medium transition-all duration-300 flex items-center space-x-1 shadow-sm hover:shadow-md"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span>Ver Detalles</span>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-gray-neutral mb-4">No hay sprints en este proyecto</p>
                      <a
                        href={`/sprints/nuevo?projectId=${project.id}`}
                        className="inline-flex items-center space-x-2 bg-blue-deep hover:bg-blue-light text-white px-6 py-3 rounded-xl font-chatgpt-medium transition-all duration-300 shadow-medium hover:shadow-lg hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-light/30 focus:ring-offset-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Crear primer sprint</span>
                      </a>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'miembros' && (
                <div className="space-y-4">
                  {/* Header con botón agregar */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-xl font-chatgpt-semibold text-gray-900">Miembros del Proyecto</h2>
                        <p className="text-sm text-gray-neutral mt-1">
                          {project.members?.length || 0} miembro{(project.members?.length || 0) !== 1 ? 's' : ''} en el equipo
                        </p>
                      </div>
                      <button
                        onClick={() => setShowAddMemberModal(true)}
                        className="bg-gradient-to-r from-blue-deep to-blue-light hover:shadow-lg text-white px-5 py-3 rounded-xl font-chatgpt-semibold transition-all duration-300 flex items-center space-x-2 hover:scale-105 active:scale-95 shadow-medium focus:outline-none focus:ring-4 focus:ring-blue-light/30 focus:ring-offset-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Agregar Miembro</span>
                      </button>
                    </div>

                  {project.members && project.members.length > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {project.members.map((member) => (
                          <div 
                            key={member.id} 
                            className="group relative border-2 border-gray-200 hover:border-blue-deep rounded-xl p-5 transition-all duration-200 hover:shadow-lg bg-gradient-to-br from-white to-cream/20"
                          >
                            {/* Botón eliminar */}
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              disabled={deletingMemberId === member.id}
                              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 hover:bg-red-100 text-red-600 rounded-lg p-2 disabled:opacity-50"
                              title="Eliminar miembro"
                            >
                              {deletingMemberId === member.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>

                            <div className="flex items-start space-x-4">
                              {/* Avatar */}
                              <div className="relative flex-shrink-0">
                                <div className="w-16 h-16 bg-gradient-to-br from-[#0264C5] to-[#11C0F1] rounded-full flex items-center justify-center shadow-lg">
                                  <span className="text-white font-chatgpt-semibold text-xl">
                                {member.user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                                {/* Icono de rol */}
                                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full border-2 border-gray-200 flex items-center justify-center shadow-sm">
                                  <span className="text-lg">{getRoleIcon(member.role)}</span>
                                </div>
                              </div>

                              {/* Info del miembro */}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-chatgpt-semibold text-gray-900 text-lg mb-1 truncate">
                                  {member.user.name}
                                </h3>
                                <p className="text-sm text-gray-neutral mb-2 truncate">
                                  {member.user.email}
                                </p>
                                
                                {/* Badge de rol */}
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(member.role)}`}>
                                    {getRoleName(member.role)}
                                  </span>
                                </div>

                                {/* Fecha de incorporación */}
                                <div className="flex items-center space-x-2 text-xs text-gray-neutral">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span>Desde {new Date(member.joinedAt).toLocaleDateString('es-PA', { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}</span>
                                </div>
                              </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                      <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-[#F2ECDF] to-gray-100 rounded-full mb-6">
                          <svg className="w-12 h-12 text-gray-neutral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                        </div>
                        <h3 className="text-lg font-chatgpt-semibold text-gray-900 mb-2">
                          No hay miembros en este proyecto
                        </h3>
                        <p className="text-gray-neutral mb-6 max-w-md mx-auto">
                          Comienza agregando miembros al equipo para colaborar en este proyecto
                        </p>
                        <button
                          onClick={() => setShowAddMemberModal(true)}
                          className="inline-flex items-center space-x-2 bg-gradient-to-r from-[#0264C5] to-[#11C0F1] hover:shadow-xl text-white px-6 py-3 rounded-xl font-chatgpt-semibold transition-all duration-300 hover:scale-105 active:scale-95"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span>Agregar Primer Miembro</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'tareas' && project && (() => {
                try {
                  const stats = calculateDashboardStats();
                  const activeSprint = project.sprints?.find(s => s.status === 'ACTIVE');
                  
                  return (
                    <div className="space-y-6">
                      {/* Header mejorado con información del Sprint Actual */}
                      <div className="bg-gradient-to-br from-white via-cream to-white rounded-2xl shadow-medium border-2 border-gray-200 p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-deep to-blue-light rounded-xl flex items-center justify-center shadow-medium">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                              </div>
                              <div>
                                <h2 className="text-2xl sm:text-3xl font-chatgpt-bold text-gray-900">
                                  {activeSprint ? `Tareas del Sprint Actual` : 'Tareas del Proyecto'}
                                </h2>
                                <p className="text-sm sm:text-base text-gray-600 mt-1">
                                  {activeSprint && activeSprint.name
                                    ? `${activeSprint.name} • ${stats?.activeSprint?.tasks?.total || 0} tareas`
                                    : `Vista completa de todas las tareas organizadas por estado`
                                  }
                                </p>
                              </div>
                            </div>
                            
                            {/* Información del Sprint Actual */}
                            {activeSprint && stats?.activeSprint && (
                              <div className="mt-4 p-4 bg-gradient-to-r from-yellow-sun/10 to-yellow-soft/10 rounded-xl border-2 border-yellow-sun/30">
                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="font-chatgpt-semibold text-gray-900">Progreso:</span>
                                    <span className="text-yellow-sun font-chatgpt-bold">{stats.activeSprint.progress || 0}%</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-chatgpt-semibold text-gray-900">Completadas:</span>
                                    <span className="text-green-600 font-chatgpt-bold">{stats.activeSprint.tasks?.completed || 0}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-chatgpt-semibold text-gray-900">En Progreso:</span>
                                    <span className="text-blue-deep font-chatgpt-bold">{stats.activeSprint.tasks?.inProgress || 0}</span>
                                  </div>
                                  {activeSprint.endDate && (
                                    <div className="flex items-center gap-2">
                                      <span className="font-chatgpt-semibold text-gray-900">Finaliza:</span>
                                      <span className="text-gray-700">{formatDate(activeSprint.endDate)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Kanban Board */}
                      <div className="bg-white rounded-2xl shadow-medium border-2 border-gray-200 overflow-hidden">
                        <KanbanBoard 
                          projectId={project.id} 
                          sprintId={activeSprint?.id}
                        />
                      </div>
                    </div>
                  );
                } catch (error) {
                  console.error('Error en sección de tareas:', error);
                  return (
                    <div className="space-y-6">
                      <div className="bg-white rounded-2xl shadow-medium border-2 border-gray-200 p-6">
                        <div className="text-center py-8">
                          <p className="text-red-600 mb-4">Error al cargar la sección de tareas</p>
                          <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-blue-deep text-white rounded-xl hover:bg-blue-light transition-colors"
                          >
                            Recargar página
                          </button>
                        </div>
                      </div>
                      <div className="bg-white rounded-2xl shadow-medium border-2 border-gray-200 overflow-hidden">
                        <KanbanBoard 
                          projectId={project.id} 
                        />
                      </div>
                    </div>
                  );
                }
              })()}

              {activeTab === 'calendario' && (() => {
                const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
                const monthNames = [
                  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                ];
                const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

                const today = new Date();
                const isToday = (day: number) => {
                  return day === today.getDate() && 
                         month === today.getMonth() && 
                         year === today.getFullYear();
                };

                return (
                  <div className="space-y-6">
                    {/* Header del Calendario */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                          <h2 className="text-2xl font-chatgpt-semibold text-gray-900 mb-1">
                            Calendario del Proyecto
                          </h2>
                          <p className="text-sm text-gray-neutral">
                            Visualiza sprints y fechas importantes
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={goToToday}
                            className="px-4 py-2 bg-gradient-to-r from-[#F2ECDF] to-gray-100 hover:from-[#0264C5] hover:to-[#11C0F1] hover:text-white text-gray-700 rounded-xl font-chatgpt-medium transition-all duration-300 shadow-sm hover:shadow-md"
                          >
                            Hoy
                          </button>
                          <button
                            onClick={previousMonth}
                            className="p-2 border-2 border-gray-200 hover:border-[#0264C5] rounded-xl text-gray-600 hover:text-[#0264C5] transition-all duration-200"
                            title="Mes anterior"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={nextMonth}
                            className="p-2 border-2 border-gray-200 hover:border-[#0264C5] rounded-xl text-gray-600 hover:text-[#0264C5] transition-all duration-200"
                            title="Mes siguiente"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Calendario Principal */}
                      <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                          {/* Título del mes */}
                          <div className="text-center mb-6">
                            <h3 className="text-2xl font-chatgpt-semibold bg-gradient-to-r from-[#0264C5] to-[#11C0F1] bg-clip-text text-transparent">
                              {monthNames[month]} {year}
                            </h3>
                          </div>

                          {/* Días de la semana */}
                          <div className="grid grid-cols-7 gap-2 mb-2">
                            {dayNames.map((day) => (
                              <div
                                key={day}
                                className="text-center text-xs font-chatgpt-semibold text-gray-600 uppercase tracking-wide py-2"
                              >
                                {day}
                              </div>
                            ))}
                          </div>

                          {/* Días del mes */}
                          <div className="grid grid-cols-7 gap-2">
                            {/* Espacios vacíos antes del primer día */}
                            {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                              <div key={`empty-${index}`} className="aspect-square"></div>
                            ))}

                            {/* Días del mes */}
                            {Array.from({ length: daysInMonth }).map((_, index) => {
                              const day = index + 1;
                              const sprintsOnDay = getSprintsForDay(day, month, year);
                              const hasActiveSprint = sprintsOnDay.some(s => s.status === 'ACTIVE');
                              
                              return (
                                <div
                                  key={day}
                                  className={`aspect-square p-2 rounded-xl border-2 transition-all duration-200 relative group hover:shadow-md ${
                                    isToday(day)
                                      ? 'bg-gradient-to-br from-[#0264C5] to-[#11C0F1] text-white border-[#0264C5] shadow-lg scale-105'
                                      : sprintsOnDay.length > 0
                                      ? hasActiveSprint
                                        ? 'bg-green-50 border-green-300 hover:border-green-500'
                                        : 'bg-blue-50 border-blue-200 hover:border-blue-400'
                                      : 'bg-white border-gray-200 hover:border-[#0264C5]'
                                  }`}
                                >
                                  <div className="flex flex-col h-full">
                                    <span className={`text-sm font-chatgpt-semibold ${
                                      isToday(day) ? 'text-white' : 'text-gray-900'
                                    }`}>
                                      {day}
                                    </span>
                                    
                                    {/* Indicadores de sprints */}
                                    {sprintsOnDay.length > 0 && (
                                      <div className="flex-1 flex flex-col justify-center items-center space-y-1 mt-1">
                                        {sprintsOnDay.slice(0, 2).map((sprint, idx) => {
                                          const isStart = isSprintStartDate(sprint, day, month, year);
                                          const isEnd = isSprintEndDate(sprint, day, month, year);
                                          
                                          return (
                                            <div
                                              key={idx}
                                              className={`w-full h-1.5 rounded-full ${
                                                sprint.status === 'ACTIVE' ? 'bg-green-500' :
                                                sprint.status === 'COMPLETED' ? 'bg-gray-400' :
                                                sprint.status === 'PLANNING' ? 'bg-blue-500' :
                                                'bg-yellow-500'
                                              }`}
                                              title={sprint.name}
                                            >
                                              {isStart && (
                                                <div className="w-2 h-2 rounded-full bg-white border-2 border-current -mt-0.5"></div>
                                              )}
                                              {isEnd && (
                                                <div className="w-2 h-2 rounded-full bg-white border-2 border-current float-right -mt-0.5"></div>
                                              )}
                                            </div>
                                          );
                                        })}
                                        {sprintsOnDay.length > 2 && (
                                          <span className="text-[10px] font-chatgpt-medium text-gray-600">
                                            +{sprintsOnDay.length - 2}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Tooltip con información de sprints */}
                                  {sprintsOnDay.length > 0 && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                                      <div className="bg-gray-900 text-white text-xs rounded-lg p-2 whitespace-nowrap shadow-xl">
                                        {sprintsOnDay.map((sprint, idx) => (
                                          <div key={idx} className="flex items-center space-x-2">
                                            <span className={`w-2 h-2 rounded-full ${
                                              sprint.status === 'ACTIVE' ? 'bg-green-500' :
                                              sprint.status === 'COMPLETED' ? 'bg-gray-400' :
                                              sprint.status === 'PLANNING' ? 'bg-blue-500' :
                                              'bg-yellow-500'
                                            }`}></span>
                                            <span>{sprint.name}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Panel Lateral - Leyenda y Sprints */}
                      <div className="space-y-6">
                        {/* Leyenda */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                          <h3 className="text-lg font-chatgpt-semibold text-gray-900 mb-4 flex items-center space-x-2">
                            <svg className="w-5 h-5 text-[#0264C5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Leyenda</span>
                          </h3>
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0264C5] to-[#11C0F1] flex items-center justify-center text-white font-chatgpt-semibold text-xs shadow-md">
                                H
                              </div>
                              <span className="text-sm text-gray-700">Día de hoy</span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-lg bg-green-50 border-2 border-green-300"></div>
                              <span className="text-sm text-gray-700">Sprint activo</span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 border-2 border-blue-200"></div>
                              <span className="text-sm text-gray-700">Sprint planificado</span>
                            </div>
                            <div className="border-t border-gray-200 pt-3 mt-3">
                              <p className="text-xs text-gray-600 mb-2 font-chatgpt-medium">Estados de Sprint:</p>
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <div className="w-3 h-1.5 rounded-full bg-green-500"></div>
                                  <span className="text-xs text-gray-600">Activo</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div className="w-3 h-1.5 rounded-full bg-blue-500"></div>
                                  <span className="text-xs text-gray-600">Planificación</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div className="w-3 h-1.5 rounded-full bg-gray-400"></div>
                                  <span className="text-xs text-gray-600">Completado</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Lista de Sprints del Mes */}
                        {project.sprints && project.sprints.length > 0 && (
                          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-chatgpt-semibold text-gray-900 mb-4 flex items-center space-x-2">
                              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Sprints</span>
                            </h3>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                              {project.sprints
                                .filter(sprint => {
                                  if (!sprint.startDate && !sprint.endDate) return true;
                                  const sprintStart = sprint.startDate ? new Date(sprint.startDate) : null;
                                  const sprintEnd = sprint.endDate ? new Date(sprint.endDate) : null;
                                  const monthStart = new Date(year, month, 1);
                                  const monthEnd = new Date(year, month + 1, 0);
                                  
                                  if (sprintStart && sprintEnd) {
                                    return (sprintStart <= monthEnd && sprintEnd >= monthStart);
                                  }
                                  return true;
                                })
                                .map((sprint) => (
                                  <a
                                    key={sprint.id}
                                    href={`/sprints/detalle?id=${sprint.id}`}
                                    className="block p-3 rounded-xl border-2 border-gray-200 hover:border-[#0264C5] hover:shadow-md transition-all duration-200 group"
                                  >
                                    <div className="flex items-start space-x-3">
                                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                        sprint.status === 'ACTIVE' ? 'bg-green-500 animate-pulse' :
                                        sprint.status === 'COMPLETED' ? 'bg-gray-400' :
                                        sprint.status === 'PLANNING' ? 'bg-blue-500' :
                                        'bg-yellow-500'
                                      }`}></div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                          <h4 className="font-chatgpt-semibold text-sm text-gray-900 group-hover:text-[#0264C5] transition-colors truncate">
                                            {sprint.name}
                                          </h4>
                                          <span className={`text-xs px-2 py-0.5 rounded-full font-chatgpt-medium flex-shrink-0 ml-2 ${
                                            sprint.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                            sprint.status === 'COMPLETED' ? 'bg-gray-100 text-gray-700' :
                                            sprint.status === 'PLANNING' ? 'bg-blue-100 text-blue-700' :
                                            'bg-yellow-100 text-yellow-700'
                                          }`}>
                                            {getStatusName(sprint.status)}
                                          </span>
                                        </div>
                                        {sprint.startDate && sprint.endDate && (
                                          <p className="text-xs text-gray-600">
                                            {new Date(sprint.startDate).toLocaleDateString('es-PA', { month: 'short', day: 'numeric' })} - {new Date(sprint.endDate).toLocaleDateString('es-PA', { month: 'short', day: 'numeric' })}
                                          </p>
                                        )}
                                        {sprint.goal && (
                                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                            {sprint.goal}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </a>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Acción rápida */}
                        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl shadow-sm border-2 border-orange-200 p-6">
                          <div className="text-center">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </div>
                            <h4 className="font-chatgpt-semibold text-gray-900 mb-2">
                              Planifica un Sprint
                            </h4>
                            <p className="text-xs text-gray-600 mb-4">
                              Organiza el trabajo en iteraciones cortas
                            </p>
                            <a
                              href={`/sprints/nuevo?projectId=${project.id}`}
                              className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:shadow-xl text-white px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-300 hover:scale-105 active:scale-95"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              <span>Crear Sprint</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Modal para agregar miembros */}
      {project && (
        <AddProjectMemberModal
          projectId={project.id}
          isOpen={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)}
          onMemberAdded={handleMemberAdded}
        />
      )}

      {/* Botón flotante de acciones rápidas */}
      {project && (
        <ScrumFloatingActionButton projectId={project.id} />
      )}
    </AppSidebarLayout>
  );
};

export default ProjectDetailModern;

