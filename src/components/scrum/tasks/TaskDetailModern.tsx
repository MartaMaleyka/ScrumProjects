import React, { useState, useEffect } from 'react';
import AppSidebarLayout from '../../layout/AppSidebarLayout';
import { API_BASE_URL, authenticatedRequest } from '../../../config/api';
import ScrumBreadcrumbs from '../common/ScrumBreadcrumbs';
import { exportService } from '../../../services/exportService';

interface Task {
  id: number;
  title: string;
  description?: string | null;
  type: string;
  status: string;
  priority: string;
  estimatedHours?: number | null;
  actualHours?: number | null;
  userStoryId: number;
  sprintId?: number | null;
  assigneeId?: number | null;
  assignee?: {
    id: number;
    name: string;
    email: string;
  } | null;
  userStory?: {
    id: number;
    title: string;
    epic?: {
      id: number;
      title: string;
      project?: {
        id: number;
        name: string;
      };
    };
  };
  sprint?: {
    id: number;
    name: string;
    status: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface TaskDetailModernProps {
  taskId: string;
}

const TaskDetailModern: React.FC<TaskDetailModernProps> = ({ taskId }) => {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!taskId) {
      setError('ID de tarea no válido');
      setLoading(false);
      return;
    }

    const loadTaskData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await authenticatedRequest(`${API_BASE_URL}/scrum/tasks/${taskId}`);
        const taskData = response.task || response.data?.task || response;

        setTask(taskData);
      } catch (error: any) {
        setError(error.message || 'Error al cargar la tarea');
      } finally {
        setLoading(false);
      }
    };

    loadTaskData();
  }, [taskId]);

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
      case 'DONE': return 'bg-green-100 text-green-800 border-green-200';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'IN_REVIEW': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'TODO': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'TODO': '📋 Por Hacer',
      'IN_PROGRESS': '🚧 En Progreso',
      'IN_REVIEW': '👀 En Revisión',
      'DONE': '✅ Completado',
      'CANCELLED': '❌ Cancelado'
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
      'LOW': '🟢 Baja',
      'MEDIUM': '🟡 Media',
      'HIGH': '🟠 Alta',
      'CRITICAL': '🔴 Crítica'
    };
    return labels[priority] || priority;
  };

  const getTaskTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      'DEVELOPMENT': '💻',
      'TESTING': '🧪',
      'DESIGN': '🎨',
      'DOCUMENTATION': '📝',
      'BUG_FIX': '🐛',
      'RESEARCH': '🔍',
      'REFACTORING': '♻️'
    };
    return icons[type] || '📋';
  };

  const getTaskTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'DEVELOPMENT': 'Desarrollo',
      'TESTING': 'Testing',
      'DESIGN': 'Diseño',
      'DOCUMENTATION': 'Documentación',
      'BUG_FIX': 'Corrección de Errores',
      'RESEARCH': 'Investigación',
      'REFACTORING': 'Refactorización'
    };
    return labels[type] || type;
  };

  return (
    <AppSidebarLayout>
      <div className="h-full flex flex-col">
        {/* Breadcrumbs mejorados */}
        {task && (
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
              ...(task.userStory?.epic?.project ? [{
                label: task.userStory.epic.project.name,
                href: `/proyectos/detalle?id=${task.userStory.epic.project.id}`,
              }] : []),
              ...(task.sprint ? [{
                label: `Sprint: ${task.sprint.name}`,
                href: `/sprints/detalle?id=${task.sprint.id}`,
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
              }] : []),
              ...(task.userStory ? [{
                label: `Historia: ${task.userStory.title}`,
                href: `/user-stories/detalle?id=${task.userStory.id}`,
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
              }] : []),
              {
                label: `Tarea: ${task.title || `#${task.id}`}`,
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                ),
              },
            ]}
          />
        )}
        
        <div className="flex-1 overflow-y-auto">
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4">
            <div className="max-w-7xl mx-auto">
              {/* Loading State */}
              {loading && (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 font-medium">Cargando tarea...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-center">
                <div className="text-6xl mb-4">❌</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Error al cargar la tarea</h2>
                <p className="text-gray-600 mb-6">{error}</p>
                <button
                  onClick={() => window.history.back()}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  ← Volver
                </button>
              </div>
            </div>
          )}

          {/* Task Content */}
          {task && !loading && !error && (
            <>
              {/* Header */}
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{getTaskTypeIcon(task.type)}</span>
                      <h1 className="text-3xl font-bold text-gray-900">{task.title}</h1>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(task.status)}`}>
                        {getStatusLabel(task.status)}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(task.priority)}`}>
                        {getPriorityLabel(task.priority)}
                      </span>
                      <span className="px-3 py-1 rounded-full text-sm font-medium border bg-indigo-100 text-indigo-800 border-indigo-200">
                        {getTaskTypeIcon(task.type)} {getTaskTypeLabel(task.type)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {/* Botones de exportación */}
                    <button
                      onClick={async () => {
                        if (!task) return;
                        try {
                          setIsExporting(true);
                          await exportService.exportTaskToPDF(task);
                        } catch (error: any) {
                          alert(`Error al exportar PDF: ${error.message}`);
                        } finally {
                          setIsExporting(false);
                        }
                      }}
                      disabled={isExporting || !task}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2 disabled:cursor-not-allowed text-sm"
                      title="Exportar Tarea a PDF"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="hidden sm:inline">{isExporting ? '...' : 'PDF'}</span>
                    </button>
                    <button
                      onClick={() => {
                        if (!task) return;
                        try {
                          setIsExporting(true);
                          exportService.exportTaskToExcel(task);
                        } catch (error: any) {
                          alert(`Error al exportar Excel: ${error.message}`);
                        } finally {
                          setIsExporting(false);
                        }
                      }}
                      disabled={isExporting || !task}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2 disabled:cursor-not-allowed text-sm"
                      title="Exportar Tarea a Excel"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="hidden sm:inline">{isExporting ? '...' : 'Excel'}</span>
                    </button>
                    <button
                      onClick={() => window.location.href = `/tasks/editar?id=${task.id}`}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>
                    <button
                      onClick={() => window.history.back()}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      ← Volver
                    </button>
                  </div>
                </div>

                {/* Context Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t">
                  {task.userStory && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Historia de Usuario</p>
                      <a 
                        href={`/user-stories/detalle?id=${task.userStory.id}`}
                        className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                      >
                        {task.userStory.title}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}
                  {task.userStory?.epic?.project && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Proyecto</p>
                      <a 
                        href={`/proyectos/detalle?id=${task.userStory.epic.project.id}`}
                        className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                      >
                        {task.userStory.epic.project.name}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}
                  {task.sprint && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Sprint</p>
                      <a 
                        href={`/sprints/detalle?id=${task.sprint.id}`}
                        className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                      >
                        {task.sprint.name}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Main Content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Details */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Description */}
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                      Descripción
                    </h2>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {task.description || 'Sin descripción'}
                    </p>
                  </div>

                  {/* Time Tracking */}
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Tiempo
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-blue-600 mb-1">Horas Estimadas</p>
                        <p className="text-2xl font-bold text-blue-900">{task.estimatedHours || 0} hrs</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-green-600 mb-1">Horas Reales</p>
                        <p className="text-2xl font-bold text-green-900">{task.actualHours || 0} hrs</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Metadata */}
                <div className="space-y-6">
                  {/* Assignee */}
                  {task.assignee && (
                    <div className="bg-white rounded-xl shadow-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Asignado a</h3>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                          {task.assignee.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{task.assignee.name}</p>
                          <p className="text-sm text-gray-600">{task.assignee.email}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Información</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">Creado</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(task.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Actualizado</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(task.updatedAt)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">ID</p>
                        <p className="text-sm font-medium text-gray-900">#{task.id}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppSidebarLayout>
  );
};

export default TaskDetailModern;

