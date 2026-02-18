import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import AppSidebarLayout from '../../layout/AppSidebarLayout';
import { API_BASE_URL, authenticatedRequest } from '../../../config/api';
import ScrumBreadcrumbs from '../common/ScrumBreadcrumbs';
import { exportService } from '../../../services/exportService';
import TaskForm from './TaskForm';

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
  externalLinks?: Array<{
    id: number;
    provider: string;
    externalType: string;
    externalId: string;
    url: string;
    title?: string | null;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface TaskDetailModernProps {
  taskId: string;
  asModal?: boolean;
  onClose?: () => void;
}

const TaskDetailModern: React.FC<TaskDetailModernProps> = ({ taskId, asModal = false, onClose }) => {
  const { t } = useTranslation();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Función para manejar el cierre del modal de forma segura
  const handleClose = React.useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (!taskId) {
      setError(t('tasks.detail.invalidId', 'ID de tarea no válido'));
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
        setError(error.message || t('tasks.detail.loadError', 'Error al cargar la tarea'));
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
    switch (status) {
      case 'TODO':
        return t('tasks.status.todoWithIcon', '📋 Por Hacer');
      case 'IN_PROGRESS':
        return t('tasks.status.inProgressWithIcon', '🚧 En Progreso');
      case 'IN_REVIEW':
        return t('tasks.status.inReviewWithIcon', '👀 En Revisión');
      case 'DONE':
        return t('tasks.status.completedWithIcon', '✅ Completado');
      case 'CANCELLED':
        return t('tasks.status.cancelledWithIcon', '❌ Cancelado');
      default:
        return status;
    }
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
    switch (priority) {
      case 'LOW':
        return t('tasks.priority.lowWithIcon', '🟢 Baja');
      case 'MEDIUM':
        return t('tasks.priority.mediumWithIcon', '🟡 Media');
      case 'HIGH':
        return t('tasks.priority.highWithIcon', '🟠 Alta');
      case 'CRITICAL':
        return t('tasks.priority.criticalWithIcon', '🔴 Crítica');
      default:
        return priority;
    }
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
    switch (type) {
      case 'DEVELOPMENT':
        return t('tasks.types.development', 'Desarrollo');
      case 'TESTING':
        return t('tasks.types.testing', 'Testing');
      case 'DESIGN':
        return t('tasks.types.design', 'Diseño');
      case 'DOCUMENTATION':
        return t('tasks.types.documentation', 'Documentación');
      case 'BUG_FIX':
        return t('tasks.types.bugFix', 'Corrección de Errores');
      case 'RESEARCH':
        return t('tasks.types.research', 'Investigación');
      case 'REFACTORING':
        return t('tasks.types.refactoring', 'Refactorización');
      default:
        return type;
    }
  };

  const renderContent = (): JSX.Element => (
    <>
      {/* Breadcrumbs mejorados - Solo mostrar si no es modal */}
      {!asModal && task && (
        <ScrumBreadcrumbs
          items={[
            {
              label: t('projects.titlePlural', 'Proyectos'),
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
              label: `${t('sprints.title', 'Sprint')}: ${task.sprint.name}`,
              href: `/sprints/detalle?id=${task.sprint.id}`,
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ),
            }] : []),
            ...(task.userStory ? [{
              label: `${t('stories.title', 'Historia')}: ${task.userStory.title}`,
              href: `/user-stories/detalle?id=${task.userStory.id}`,
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ),
            }] : []),
            {
              label: `${t('tasks.title', 'Tarea')}: ${task.title || `#${task.id}`}`,
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              ),
            },
          ]}
        />
      )}
      
      <div className={asModal ? 'p-6' : 'min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4'}>
        <div className={asModal ? '' : 'max-w-7xl mx-auto'}>
            {/* Loading State */}
            {loading && (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 font-medium">
                  {t('tasks.detail.loading', 'Cargando tarea...')}
                </p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="text-center">
                  <div className="text-6xl mb-4">❌</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {t('tasks.detail.errorTitle', 'Error al cargar la tarea')}
                  </h2>
                  <p className="text-gray-600 mb-6">{error}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (asModal && onClose) {
                        handleClose();
                      } else {
                        window.history.back();
                      }
                    }}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    ← {t('common.back', 'Volver')}
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
                            const taskForExport = {
                              ...task,
                              description: task.description || undefined,
                              sprintId: task.sprintId || undefined
                            } as any;
                            await exportService.exportTasksToPDF(
                              [taskForExport],
                              t('tasks.detail.reportTitle', 'Reporte de Tarea'),
                              {
                              userStoryTitle: task.userStory?.title,
                              projectName: task.userStory?.epic?.project?.name,
                              sprintName: task.sprint?.name
                              }
                            );
                          } catch (error: any) {
                            alert(
                              `${t('tasks.detail.exportPdfError', 'Error al exportar PDF: ')}${error.message}`
                            );
                          } finally {
                            setIsExporting(false);
                          }
                        }}
                        disabled={isExporting || !task}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2 disabled:cursor-not-allowed text-sm"
                        title={t('tasks.detail.exportPdfTitle', 'Exportar Tarea a PDF')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="hidden sm:inline">
                          {isExporting ? '...' : 'PDF'}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          if (!task) return;
                          try {
                            setIsExporting(true);
                            const taskForExport = {
                              ...task,
                              description: task.description || undefined,
                              sprintId: task.sprintId || undefined
                            } as any;
                            exportService.exportTasksToExcel(
                              [taskForExport],
                              t('tasks.detail.reportTitle', 'Reporte de Tarea'),
                              {
                              userStoryTitle: task.userStory?.title,
                              projectName: task.userStory?.epic?.project?.name,
                              sprintName: task.sprint?.name
                              }
                            );
                          } catch (error: any) {
                            alert(
                              `${t('tasks.detail.exportExcelError', 'Error al exportar Excel: ')}${error.message}`
                            );
                          } finally {
                            setIsExporting(false);
                          }
                        }}
                        disabled={isExporting || !task}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2 disabled:cursor-not-allowed text-sm"
                        title={t('tasks.detail.exportExcelTitle', 'Exportar Tarea a Excel')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="hidden sm:inline">
                          {isExporting ? '...' : 'Excel'}
                        </span>
                      </button>
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        {t('common.edit', 'Editar')}
                      </button>
                      {asModal && onClose ? (
                        <button
                          onClick={onClose}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          ← {t('common.close', 'Cerrar')}
                        </button>
                      ) : (
                        <button
                          onClick={() => window.history.back()}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          ← {t('common.back', 'Volver')}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Context Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t">
                    {task.userStory && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">
                          {t('stories.fullTitle', 'Historia de Usuario')}
                        </p>
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
                        <p className="text-sm text-gray-500 mb-1">
                          {t('projects.title', 'Proyecto')}
                        </p>
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
                        <p className="text-sm text-gray-500 mb-1">
                          {t('sprints.title', 'Sprint')}
                        </p>
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
                        {t('common.description', 'Descripción')}
                      </h2>
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {task.description || t('common.noDescription', 'Sin descripción')}
                      </p>
                    </div>

                    {/* Time Tracking */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {t('tasks.detail.time', 'Tiempo')}
                      </h2>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <p className="text-sm text-blue-600 mb-1">
                            {t('tasks.detail.estimatedHours', 'Horas Estimadas')}
                          </p>
                          <p className="text-2xl font-bold text-blue-900">{task.estimatedHours || 0} {t('tasks.detail.hours', 'hrs')}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                          <p className="text-sm text-green-600 mb-1">
                            {t('tasks.detail.actualHours', 'Horas Reales')}
                          </p>
                          <p className="text-2xl font-bold text-green-900">{task.actualHours || 0} {t('tasks.detail.hours', 'hrs')}</p>
                        </div>
                      </div>
                    </div>

                    {/* GitHub Commits Linked */}
                    {task.externalLinks && task.externalLinks.filter(link => link.externalType === 'COMMIT').length > 0 && (
                      <div className="bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
                          </svg>
                          {t('tasks.detail.linkedCommits', 'Commits Vinculados')}
                        </h2>
                        <div className="space-y-3">
                          {task.externalLinks
                            .filter(link => link.externalType === 'COMMIT')
                            .map((link) => (
                              <a
                                key={link.id}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all group"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-900 font-medium line-clamp-2 group-hover:text-indigo-600">
                                      {link.title || `Commit ${link.externalId.substring(0, 7)}`}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                      <span className="text-xs text-gray-500 font-mono">
                                        {link.externalId.substring(0, 7)}
                                      </span>
                                      <span className="text-xs text-gray-400">•</span>
                                      <span className="text-xs text-gray-500">
                                        {new Date(link.createdAt).toLocaleDateString('es-ES', {
                                          day: '2-digit',
                                          month: 'short',
                                          year: 'numeric'
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                  <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </div>
                              </a>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Metadata */}
                  <div className="space-y-6">
                    {/* Assignee */}
                    {task.assignee && (
                      <div className="bg-white rounded-xl shadow-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          {t('tasks.detail.assignedTo', 'Asignado a')}
                        </h3>
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
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        {t('tasks.detail.info', 'Información')}
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-500">
                            {t('tasks.detail.created', 'Creado')}
                          </p>
                          <p className="text-sm font-medium text-gray-900">{formatDate(task.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">
                            {t('tasks.detail.updated', 'Actualizado')}
                          </p>
                          <p className="text-sm font-medium text-gray-900">{formatDate(task.updatedAt)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">{t('tasks.detail.id', 'ID')}</p>
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
    </>
  );

  const handleEditSuccess = (updatedTask: Task) => {
    setShowEditModal(false);
    // Recargar la tarea para mostrar los cambios
    if (taskId) {
      const loadTaskData = async () => {
        try {
          setLoading(true);
          setError(null);
          const response = await authenticatedRequest(`${API_BASE_URL}/scrum/tasks/${taskId}`);
          const taskData = response.task || response.data?.task || response;
          setTask(taskData);
        } catch (error: any) {
          setError(error.message || t('tasks.detail.loadError', 'Error al cargar la tarea'));
        } finally {
          setLoading(false);
        }
      };
      loadTaskData();
    }
  };

  const handleEditClose = () => {
    setShowEditModal(false);
  };

  const getProjectId = (): number | null => {
    if (!task) return null;
    return task.userStory?.epic?.project?.id || null;
  };

  // Si es modal, renderizar con overlay
  if (asModal) {
    // No renderizar si no hay taskId válido
    if (!taskId) {
      return null;
    }

    return (
      <>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 sm:p-4">
          <div className="w-full h-full sm:h-[95vh] sm:max-w-[98vw] sm:max-h-[95vh] overflow-hidden bg-white rounded-2xl shadow-2xl flex flex-col">
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-xl font-bold text-white">
                {t('tasks.detail.title', 'Detalle de la tarea')}
              </h2>
              {onClose && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderContent()}
            </div>
          </div>
        </div>
        {/* Modal de Edición de Tarea - Renderizado fuera del componente usando Portal */}
        {showEditModal && task && getProjectId() && typeof document !== 'undefined' && createPortal(
          <TaskForm
            projectId={getProjectId()!}
            sprintId={task.sprintId || undefined}
            userStoryId={task.userStoryId}
            task={{
              ...task,
              description: task.description || undefined
            } as any}
            isOpen={true}
            onClose={handleEditClose}
            onSuccess={handleEditSuccess}
          />,
          document.body
        )}
      </>
    );
  }

  return (
    <AppSidebarLayout>
      {renderContent()}
      {/* Modal de Edición de Tarea - Renderizado fuera del componente usando Portal */}
      {showEditModal && task && getProjectId() && typeof document !== 'undefined' && createPortal(
        <TaskForm
          projectId={getProjectId()!}
          sprintId={task.sprintId || undefined}
          userStoryId={task.userStoryId}
          task={{
            ...task,
            description: task.description || undefined
          } as any}
          isOpen={true}
          onClose={handleEditClose}
          onSuccess={handleEditSuccess}
        />,
        document.body
      )}
    </AppSidebarLayout>
  );
};

export default TaskDetailModern;
