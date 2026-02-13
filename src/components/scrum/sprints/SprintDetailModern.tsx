import React, { useState, useEffect, useRef } from 'react';
import AppSidebarLayout from '../../layout/AppSidebarLayout';
import { API_BASE_URL, authenticatedRequest } from '../../../config/api';
import ScrumFloatingActionButton from '../common/ScrumFloatingActionButton';
import ScrumBreadcrumbs from '../common/ScrumBreadcrumbs';
import { exportService } from '../../../services/exportService';

interface Sprint {
  id: number;
  name: string;
  goal?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  projectId: number;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: number;
    name: string;
  };
  userStories?: UserStory[];
  tasks?: Task[];
  _count?: {
    userStories: number;
    tasks: number;
  };
}

interface UserStory {
  id: number;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  storyPoints?: number;
  epic?: {
    id: number;
    title: string;
  };
}

interface Task {
  id: number;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  type: string;
  estimatedHours?: number | null;
  actualHours?: number | null;
  assignee?: {
    id: number;
    name: string;
    avatar?: string;
  } | null;
}

const SprintDetailModern: React.FC = () => {
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('detalles');
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const getSprintId = (): string => {
    if (typeof window === 'undefined') return '';
    
    const urlParams = new URLSearchParams(window.location.search);
    let id = urlParams.get('id');
    
    if (!id) {
      const pathParts = window.location.pathname.split('/');
      id = pathParts[pathParts.length - 1];
    }
    return id || '';
  };

  useEffect(() => {
    const id = getSprintId();
    
    if (!id) {
      setError('ID de sprint no válido');
      setLoading(false);
      return;
    }
    
    const loadSprintData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Cargar datos del sprint
        const response = await authenticatedRequest(`${API_BASE_URL}/scrum/sprints/${id}`);
        const sprintData = response.sprint || response.data?.sprint || response;
        
        // Cargar tareas del sprint (a través de userStory.sprintId)
        const tasksResponse = await authenticatedRequest(`${API_BASE_URL}/scrum/sprints/${id}/tasks`);
        const tasksData = tasksResponse.tasks || tasksResponse.data?.tasks || [];
        
        // Cargar historias de usuario del sprint
        const userStoriesResponse = await authenticatedRequest(`${API_BASE_URL}/scrum/user-stories?sprintId=${id}`);
        const userStoriesData = userStoriesResponse.userStories || userStoriesResponse.data?.userStories || [];
        
        // Combinar los datos
        setSprint({ 
          ...sprintData, 
          tasks: tasksData,
          userStories: userStoriesData,
          _count: {
            ...sprintData._count,
            tasks: tasksData.length,
            userStories: userStoriesData.length
          }
        });
        
      } catch (error: any) {
        setError(error.message || 'Error al cargar el sprint');
      } finally {
        setLoading(false);
      }
    };

    loadSprintData();
  }, []);

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

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Sin fecha';
    return new Date(dateString).toLocaleDateString('es-PA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
      case 'ACTIVE': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PLANNING': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'PLANNING': 'Planificación',
      'ACTIVE': 'Activo',
      'COMPLETED': 'Completado',
      'CANCELLED': 'Cancelado'
    };
    return labels[status] || status;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'LOW': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      'LOW': 'Baja',
      'MEDIUM': 'Media',
      'HIGH': 'Alta',
      'CRITICAL': 'Crítica'
    };
    return labels[priority] || priority;
  };

  const calculateProgress = () => {
    if (!sprint?.tasks || sprint.tasks.length === 0) return 0;
    const completedTasks = sprint.tasks.filter(task => task.status === 'COMPLETED').length;
    return Math.round((completedTasks / sprint.tasks.length) * 100);
  };

  const calculateStoryPoints = () => {
    if (!sprint?.userStories) return 0;
    return sprint.userStories.reduce((sum, story) => sum + (story.storyPoints || 0), 0);
  };

  const getDaysRemaining = () => {
    if (!sprint?.endDate) return null;
    const today = new Date();
    const end = new Date(sprint.endDate);
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <AppSidebarLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0264C5] mx-auto mb-4"></div>
            <p className="text-[#777777]">Cargando sprint...</p>
          </div>
        </div>
      </AppSidebarLayout>
    );
  }

  if (error || !sprint) {
    return (
      <AppSidebarLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-chatgpt-semibold text-gray-900 mb-2">Error</h2>
            <p className="text-[#777777] mb-6">{error || 'Sprint no encontrado'}</p>
            <a
              href="/proyectos"
              className="inline-flex items-center space-x-2 bg-[#0264C5] hover:bg-[#11C0F1] text-white px-6 py-3 rounded-xl font-chatgpt-medium transition-all duration-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Volver a Proyectos</span>
            </a>
          </div>
        </div>
      </AppSidebarLayout>
    );
  }

  const progress = calculateProgress();
  const totalStoryPoints = calculateStoryPoints();
  const daysRemaining = getDaysRemaining();

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
            ...(sprint.project ? [{
              label: sprint.project.name,
              href: `/proyectos/detalle?id=${sprint.project.id}`,
            }] : []),
            {
              label: `Sprint: ${sprint.name || `#${sprint.id}`}`,
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ),
            },
          ]}
        />

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex justify-center">
            <div className="max-w-7xl w-full">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h1 className="text-2xl font-chatgpt-semibold text-gray-900">
                      {sprint.name}
                    </h1>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(sprint.status)}`}>
                      {getStatusLabel(sprint.status)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[#777777]">
                    <span className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}</span>
                    </span>
                    {daysRemaining !== null && sprint.status === 'ACTIVE' && (
                      <span className={`flex items-center space-x-1 ${daysRemaining < 0 ? 'text-red-600' : daysRemaining <= 3 ? 'text-orange-600' : 'text-green-600'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{daysRemaining < 0 ? 'Retrasado' : `${daysRemaining} días restantes`}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Grupo 1: Acciones secundarias (Exportar) */}
                  <div className="flex items-center gap-2">
                    {/* Botón de exportación con menú desplegable */}
                    <div className="relative" ref={exportMenuRef}>
                      <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        disabled={isExporting || !sprint}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-300 flex items-center space-x-2 disabled:cursor-not-allowed text-sm shadow-sm hover:shadow-md"
                        title="Exportar Sprint"
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
                              if (!sprint) return;
                              try {
                                setIsExporting(true);
                                setShowExportMenu(false);
                                await exportService.exportSprintToPDF(
                                  sprint as any,
                                  sprint.tasks || [],
                                  sprint.userStories || []
                                );
                              } catch (error: any) {
                                alert(`Error al exportar PDF: ${error.message}`);
                              } finally {
                                setIsExporting(false);
                              }
                            }}
                            disabled={isExporting || !sprint}
                            className="w-full text-left px-4 py-3 hover:bg-red-50 text-gray-700 hover:text-red-700 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span>Exportar a PDF</span>
                          </button>
                          <button
                            onClick={() => {
                              if (!sprint) return;
                              try {
                                setIsExporting(true);
                                setShowExportMenu(false);
                                exportService.exportSprintToExcel(
                                  sprint as any,
                                  sprint.tasks || [],
                                  sprint.userStories || []
                                );
                              } catch (error: any) {
                                alert(`Error al exportar Excel: ${error.message}`);
                              } finally {
                                setIsExporting(false);
                              }
                            }}
                            disabled={isExporting || !sprint}
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
                  </div>

                  {/* Separador visual */}
                  <div className="hidden sm:block w-px h-8 bg-gray-300"></div>

                  {/* Grupo 2: Acciones principales (Editar) */}
                  <div className="flex items-center gap-2">
                    <a
                      href={`/sprints/editar?id=${sprint.id}`}
                      className="bg-[#0264C5] hover:bg-[#11C0F1] text-white px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Editar</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="flex-1 bg-gradient-to-br from-[#F2ECDF] to-gray-50 px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto">
          <div className="flex justify-center">
            <div className="max-w-7xl w-full">
              {/* Tabs */}
              <div className="bg-white rounded-t-2xl shadow-sm border border-gray-200 border-b-0">
                <div className="flex space-x-1 p-2">
                  <button
                    onClick={() => setActiveTab('detalles')}
                    className={`flex-1 px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-200 ${
                      activeTab === 'detalles'
                        ? 'bg-[#0264C5] text-white shadow-md'
                        : 'text-[#777777] hover:bg-gray-50'
                    }`}
                  >
                    📋 Detalles
                  </button>
                  <button
                    onClick={() => setActiveTab('historias')}
                    className={`flex-1 px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-200 ${
                      activeTab === 'historias'
                        ? 'bg-[#0264C5] text-white shadow-md'
                        : 'text-[#777777] hover:bg-gray-50'
                    }`}
                  >
                    📖 User Stories ({sprint.userStories?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('tareas')}
                    className={`flex-1 px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-200 ${
                      activeTab === 'tareas'
                        ? 'bg-[#0264C5] text-white shadow-md'
                        : 'text-[#777777] hover:bg-gray-50'
                    }`}
                  >
                    ✅ Tareas ({sprint.tasks?.length || 0})
                  </button>
                </div>
              </div>

              {/* Contenido de los Tabs */}
              <div className="bg-white rounded-b-2xl shadow-sm border border-gray-200 p-6">
                {activeTab === 'detalles' && (
                  <div className="space-y-6">
                    {/* Objetivo */}
                    <div>
                      <h3 className="text-lg font-chatgpt-semibold text-gray-900 mb-3">Objetivo del Sprint</h3>
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {sprint.goal || 'Sin objetivo definido'}
                        </p>
                      </div>
                    </div>

                    {/* Métricas */}
                    <div>
                      <h3 className="text-lg font-chatgpt-semibold text-gray-900 mb-3">Métricas</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Progreso */}
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-chatgpt-medium text-gray-700">Progreso</span>
                            <span className="text-2xl font-chatgpt-semibold text-[#0264C5]">{progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-[#0264C5] to-[#11C0F1] transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Story Points */}
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                          <div className="text-sm text-[#777777] mb-1">Story Points</div>
                          <div className="text-2xl font-chatgpt-semibold text-purple-600">
                            {totalStoryPoints}
                          </div>
                          <div className="text-xs text-[#777777] mt-1">
                            {sprint.userStories?.length || 0} historias
                          </div>
                        </div>

                        {/* Tareas */}
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                          <div className="text-sm text-[#777777] mb-1">Tareas</div>
                          <div className="text-2xl font-chatgpt-semibold text-green-600">
                            {sprint.tasks?.filter(t => t.status === 'COMPLETED').length || 0}/{sprint.tasks?.length || 0}
                          </div>
                          <div className="text-xs text-[#777777] mt-1">Completadas</div>
                        </div>
                      </div>
                    </div>

                    {/* Fechas */}
                    <div>
                      <h3 className="text-lg font-chatgpt-semibold text-gray-900 mb-3">Cronograma</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <svg className="w-5 h-5 text-[#0264C5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm font-chatgpt-medium text-gray-700">Fecha de Inicio</span>
                          </div>
                          <span className="text-gray-900">{formatDate(sprint.startDate)}</span>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <svg className="w-5 h-5 text-[#0264C5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm font-chatgpt-medium text-gray-700">Fecha de Fin</span>
                          </div>
                          <span className="text-gray-900">{formatDate(sprint.endDate)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'historias' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-chatgpt-semibold text-gray-900">
                        User Stories del Sprint
                      </h3>
                    </div>

                    {sprint.userStories && sprint.userStories.length > 0 ? (
                      <div className="space-y-4">
                        {sprint.userStories.map((story) => (
                          <div key={story.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-chatgpt-semibold text-gray-900 flex-1">{story.title}</h4>
                              <div className="flex items-center space-x-2 ml-4">
                                {story.storyPoints && (
                                  <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                                    {story.storyPoints} pts
                                  </span>
                                )}
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(story.priority)}`}>
                                  {getPriorityLabel(story.priority)}
                                </span>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(story.status)}`}>
                                  {story.status}
                                </span>
                              </div>
                            </div>
                            {story.description && (
                              <p className="text-sm text-[#777777] mb-3">{story.description}</p>
                            )}
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-[#777777]">
                                {story.epic && (
                                  <span>Epic: {story.epic.title}</span>
                                )}
                              </div>
                              <a
                                href={`/user-stories/detalle?id=${story.id}`}
                                className="bg-[#0264C5] hover:bg-[#11C0F1] text-white px-3 py-1.5 rounded-lg text-xs font-chatgpt-medium transition-all duration-300 flex items-center space-x-1"
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
                      <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                        <svg className="w-16 h-16 text-[#777777] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-[#777777]">No hay user stories en este sprint</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'tareas' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-chatgpt-semibold text-gray-900">
                        Tareas del Sprint
                      </h3>
                    </div>

                    {sprint.tasks && sprint.tasks.length > 0 ? (
                      <div className="space-y-4">
                        {sprint.tasks.map((task) => (
                          <div key={task.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-chatgpt-semibold text-gray-900 mb-1">{task.title}</h4>
                                {task.description && (
                                  <p className="text-sm text-[#777777] mb-2">{task.description}</p>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 ml-4">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                                  {task.status}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-xs text-[#777777]">
                              <span>Tipo: {task.type}</span>
                              {task.estimatedHours && <span>Est: {task.estimatedHours}h</span>}
                              {task.actualHours && <span>Real: {task.actualHours}h</span>}
                              {task.assignee && <span>Asignado: {task.assignee.name}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-gray-700 font-semibold mb-3">No hay tareas en este sprint</p>
                        <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                          Las tareas se crean para <span className="font-semibold text-indigo-600">Historias de Usuario</span>.
                          <br />Ve a la pestaña "User Stories" y crea tareas desde allí.
                        </p>
                        <div className="flex flex-col gap-2 max-w-sm mx-auto">
                          <div className="text-xs text-left bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="font-medium text-blue-900 mb-2">💡 ¿Cómo crear tareas?</p>
                            <ol className="space-y-1 text-blue-700">
                              <li>1. Ve a la pestaña <span className="font-semibold">"User Stories"</span></li>
                              <li>2. Haz clic en una historia de usuario</li>
                              <li>3. Crea tareas para esa historia</li>
                            </ol>
                          </div>
                          {sprint.userStories && sprint.userStories.length > 0 && (
                            <div className="text-xs text-left bg-green-50 border border-green-200 rounded-lg p-3">
                              <p className="font-medium text-green-900 mb-2">✅ Este sprint tiene historias disponibles</p>
                              <p className="text-green-700">Puedes crear tareas para {sprint.userStories.length} historia{sprint.userStories.length > 1 ? 's' : ''} de usuario.</p>
                            </div>
                          )}
                          {(!sprint.userStories || sprint.userStories.length === 0) && (
                            <div className="text-xs text-left bg-amber-50 border border-amber-200 rounded-lg p-3">
                              <p className="font-medium text-amber-900 mb-2">⚠️ Sin historias asignadas</p>
                              <p className="text-amber-700">Primero asigna Historias de Usuario a este sprint.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botón flotante de acciones rápidas */}
      {sprint && (
        <ScrumFloatingActionButton 
          projectId={sprint.projectId} 
          sprintId={sprint.id}
        />
      )}
    </AppSidebarLayout>
  );
};

export default SprintDetailModern;


