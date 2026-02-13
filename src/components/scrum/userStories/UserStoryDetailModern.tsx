import React, { useState, useEffect, useRef } from 'react';
import AppSidebarLayout from '../../layout/AppSidebarLayout';
import { API_BASE_URL, authenticatedRequest } from '../../../config/api';
import KanbanBoard from '../tasks/KanbanBoard';
import ScrumFloatingActionButton from '../common/ScrumFloatingActionButton';
import ScrumBreadcrumbs from '../common/ScrumBreadcrumbs';
import { exportService } from '../../../services/exportService';

interface UserStory {
  id: number;
  title: string;
  description?: string | null;
  acceptanceCriteria?: string | null;
  storyPoints?: number | null;
  status: string;
  priority: string;
  epicId: number;
  sprintId?: number | null;
  createdAt: string;
  updatedAt: string;
  epic?: {
    id: number;
    title: string;
    project?: {
      id: number;
      name: string;
    };
  };
  sprint?: {
    id: number;
    name: string;
    status: string;
  } | null;
  tasks?: Task[];
  _count?: {
    tasks: number;
  };
}

interface Task {
  id: number;
  title: string;
  description?: string | null;
  type: string;
  status: string;
  priority: string;
  estimatedHours?: number | null;
  actualHours?: number | null;
  assignee?: {
    id: number;
    name: string;
    avatar?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

const UserStoryDetailModern: React.FC = () => {
  const [userStory, setUserStory] = useState<UserStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('detalles');
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const getUserStoryId = (): string => {
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
    const id = getUserStoryId();
    
    if (!id) {
      setError('ID de historia de usuario no válido');
      setLoading(false);
      return;
    }
    
    const loadUserStoryData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Cargar datos de la historia de usuario
        const response = await authenticatedRequest(`${API_BASE_URL}/scrum/user-stories/${id}`);
        const storyData = response.userStory || response.data?.userStory || response;
        
        // Cargar tareas de la historia
        const tasksResponse = await authenticatedRequest(`${API_BASE_URL}/scrum/user-stories/${id}/tasks`);
        const tasksData = tasksResponse.tasks || tasksResponse.data?.tasks || [];
        
        setUserStory({ ...storyData, tasks: tasksData });
        
      } catch (error: any) {
        setError(error.message || 'Error al cargar la historia de usuario');
      } finally {
        setLoading(false);
      }
    };

    loadUserStoryData();
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'TESTING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'READY': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'DRAFT': 'Borrador',
      'READY': 'Listo',
      'IN_PROGRESS': 'En Progreso',
      'TESTING': 'En Pruebas',
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

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'IN_REVIEW': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'TESTING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'TODO': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTaskStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'TODO': 'Por Hacer',
      'IN_PROGRESS': 'En Progreso',
      'IN_REVIEW': 'En Revisión',
      'TESTING': 'En Pruebas',
      'COMPLETED': 'Completado',
      'CANCELLED': 'Cancelado'
    };
    return labels[status] || status;
  };

  const getTaskTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'DEVELOPMENT': 'Desarrollo',
      'TESTING': 'Pruebas',
      'DESIGN': 'Diseño',
      'DOCUMENTATION': 'Documentación',
      'BUG_FIX': 'Corrección de Bug',
      'RESEARCH': 'Investigación',
      'REFACTORING': 'Refactorización'
    };
    return labels[type] || type;
  };

  const calculateProgress = () => {
    if (!userStory?.tasks || userStory.tasks.length === 0) return 0;
    const completedTasks = userStory.tasks.filter(task => task.status === 'COMPLETED').length;
    return Math.round((completedTasks / userStory.tasks.length) * 100);
  };

  const calculateTotalHours = () => {
    if (!userStory?.tasks) return { estimated: 0, actual: 0 };
    
    const estimated = userStory.tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
    const actual = userStory.tasks.reduce((sum, task) => sum + (task.actualHours || 0), 0);
    
    return { estimated, actual };
  };

  if (loading) {
    return (
      <AppSidebarLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0264C5] mx-auto mb-4"></div>
            <p className="text-[#777777]">Cargando historia de usuario...</p>
          </div>
        </div>
      </AppSidebarLayout>
    );
  }

  if (error || !userStory) {
    return (
      <AppSidebarLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-chatgpt-semibold text-gray-900 mb-2">Error</h2>
            <p className="text-[#777777] mb-6">{error || 'Historia de usuario no encontrada'}</p>
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
  const { estimated, actual } = calculateTotalHours();
  const projectId = userStory.epic?.project?.id;

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
            ...(projectId ? [{
              label: userStory.epic?.project?.name || `Proyecto #${projectId}`,
              href: `/proyectos/detalle?id=${projectId}`,
            }] : []),
            {
              label: userStory.epic?.title || `Epic #${userStory.epicId}`,
              href: `/epics/detalle?id=${userStory.epicId}`,
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ),
            },
            {
              label: `Historia: ${userStory.title || `#${userStory.id}`}`,
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
                      {userStory.title}
                    </h1>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(userStory.status)}`}>
                      {getStatusLabel(userStory.status)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[#777777]">
                    <span className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span>US-{userStory.id}</span>
                    </span>
                    {userStory.storyPoints && (
                      <span className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span>{userStory.storyPoints} Story Points</span>
                      </span>
                    )}
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(userStory.priority)}`}>
                      Prioridad: {getPriorityLabel(userStory.priority)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Grupo 1: Acciones secundarias (Exportar) */}
                  <div className="flex items-center gap-2">
                    {/* Botón de exportación con menú desplegable */}
                    <div className="relative" ref={exportMenuRef}>
                      <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        disabled={isExporting || !userStory}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-300 flex items-center space-x-2 disabled:cursor-not-allowed text-sm shadow-sm hover:shadow-md"
                        title="Exportar Historia"
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
                              if (!userStory) return;
                              try {
                                setIsExporting(true);
                                setShowExportMenu(false);
                                await exportService.exportUserStoryToPDF(
                                  userStory as any,
                                  userStory.tasks as any
                                );
                              } catch (error: any) {
                                alert(`Error al exportar PDF: ${error.message}`);
                              } finally {
                                setIsExporting(false);
                              }
                            }}
                            disabled={isExporting || !userStory}
                            className="w-full text-left px-4 py-3 hover:bg-red-50 text-gray-700 hover:text-red-700 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span>Exportar a PDF</span>
                          </button>
                          <button
                            onClick={() => {
                              if (!userStory) return;
                              try {
                                setIsExporting(true);
                                setShowExportMenu(false);
                                exportService.exportUserStoryToExcel(
                                  userStory as any,
                                  userStory.tasks as any
                                );
                              } catch (error: any) {
                                alert(`Error al exportar Excel: ${error.message}`);
                              } finally {
                                setIsExporting(false);
                              }
                            }}
                            disabled={isExporting || !userStory}
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
                      href={`/user-stories/editar?id=${userStory.id}`}
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
                    onClick={() => setActiveTab('tareas')}
                    className={`flex-1 px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-200 ${
                      activeTab === 'tareas'
                        ? 'bg-[#0264C5] text-white shadow-md'
                        : 'text-[#777777] hover:bg-gray-50'
                    }`}
                  >
                    ✅ Tareas ({userStory.tasks?.length || 0})
                  </button>
                </div>
              </div>

              {/* Contenido de los Tabs */}
              <div className="bg-white rounded-b-2xl shadow-sm border border-gray-200 p-6">
                {activeTab === 'detalles' && (
                  <div className="space-y-6">
                    {/* Descripción */}
                    <div>
                      <h3 className="text-lg font-chatgpt-semibold text-gray-900 mb-3">Descripción</h3>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <p className="text-[#777777] whitespace-pre-wrap">
                          {userStory.description || 'Sin descripción'}
                        </p>
                      </div>
                    </div>

                    {/* Criterios de Aceptación */}
                    {userStory.acceptanceCriteria && (
                      <div>
                        <h3 className="text-lg font-chatgpt-semibold text-gray-900 mb-3">Criterios de Aceptación</h3>
                        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                          <p className="text-gray-700 whitespace-pre-wrap">
                            {userStory.acceptanceCriteria}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Información Adicional */}
                    <div>
                      <h3 className="text-lg font-chatgpt-semibold text-gray-900 mb-3">Información</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Epic */}
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <svg className="w-5 h-5 text-[#0264C5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            <span className="text-sm font-chatgpt-medium text-gray-700">Epic</span>
                          </div>
                          <a 
                            href={`/epics/detalle?id=${userStory.epicId}`}
                            className="text-[#0264C5] hover:underline"
                          >
                            {userStory.epic?.title || `Epic #${userStory.epicId}`}
                          </a>
                        </div>

                        {/* Sprint */}
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <svg className="w-5 h-5 text-[#0264C5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="text-sm font-chatgpt-medium text-gray-700">Sprint</span>
                          </div>
                          {userStory.sprint ? (
                            <span className="text-gray-900">
                              {userStory.sprint.name}
                            </span>
                          ) : (
                            <span className="text-[#777777] italic">Sin asignar</span>
                          )}
                        </div>

                        {/* Fechas */}
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <svg className="w-5 h-5 text-[#0264C5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm font-chatgpt-medium text-gray-700">Creada</span>
                          </div>
                          <span className="text-gray-900 text-sm">
                            {formatDate(userStory.createdAt)}
                          </span>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <svg className="w-5 h-5 text-[#0264C5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span className="text-sm font-chatgpt-medium text-gray-700">Última actualización</span>
                          </div>
                          <span className="text-gray-900 text-sm">
                            {formatDate(userStory.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progreso */}
                    <div>
                      <h3 className="text-lg font-chatgpt-semibold text-gray-900 mb-3">Progreso de Tareas</h3>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-chatgpt-medium text-gray-700">
                            Completadas: {userStory.tasks?.filter(t => t.status === 'COMPLETED').length || 0} / {userStory.tasks?.length || 0}
                          </span>
                          <span className="text-sm font-chatgpt-semibold text-[#0264C5]">
                            {progress}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[#0264C5] to-[#11C0F1] transition-all duration-500 rounded-full"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Horas */}
                    {(estimated > 0 || actual > 0) && (
                      <div>
                        <h3 className="text-lg font-chatgpt-semibold text-gray-900 mb-3">Horas de Trabajo</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                            <div className="text-sm text-[#777777] mb-1">Estimadas</div>
                            <div className="text-2xl font-chatgpt-semibold text-[#0264C5]">
                              {estimated.toFixed(1)}h
                            </div>
                          </div>
                          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                            <div className="text-sm text-[#777777] mb-1">Reales</div>
                            <div className="text-2xl font-chatgpt-semibold text-green-600">
                              {actual.toFixed(1)}h
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'tareas' && (
                  <div className="space-y-4">
                    <KanbanBoard userStoryId={userStory.id} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botón flotante de acciones rápidas */}
      {userStory && projectId && (
        <ScrumFloatingActionButton 
          projectId={projectId}
          userStoryId={userStory.id}
          sprintId={userStory.sprintId || undefined}
        />
      )}
    </AppSidebarLayout>
  );
};

export default UserStoryDetailModern;

