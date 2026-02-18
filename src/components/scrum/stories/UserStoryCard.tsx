import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { scrumService } from '../../../services/scrumService';
import type { UserStory, Task } from '../../../types/scrum';
import StatusBadge from '../common/StatusBadge';
import PriorityBadge from '../common/PriorityBadge';
import ProgressBar from '../common/ProgressBar';
import TaskFormImproved from '../tasks/TaskFormImproved';
import KanbanBoard from '../tasks/KanbanBoard';

interface UserStoryCardProps {
  story: UserStory;
  viewMode?: 'backlog' | 'cards';
  priority?: number;
  onUpdate?: () => void;
  isDragging?: boolean;
  onEdit?: (story: UserStory) => void;
}

const UserStoryCard: React.FC<UserStoryCardProps> = ({ 
  story, 
  viewMode = 'cards', 
  priority,
  onUpdate,
  isDragging = false,
  onEdit
}) => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [isLoadingEpic, setIsLoadingEpic] = useState(false);

  // Cargar tareas cuando se expande la historia
  useEffect(() => {
    if (isExpanded && story.id) {
      const fetchTasks = async () => {
        try {
          setIsLoadingTasks(true);
          const response = await scrumService.getUserStoryTasks(story.id);
          
          if (response.success && response.data) {
            setTasks(response.data.tasks || []);
          }
        } catch (err) {
        } finally {
          setIsLoadingTasks(false);
        }
      };

      fetchTasks();
    }
  }, [isExpanded, story.id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(t('common.locale', 'es-ES') as string, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getProgressData = () => {
    const totalTasks = story._count?.tasks || tasks.length || 0;
    const completedTasks = tasks.filter(task => task.status === 'COMPLETED').length;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    return { progress, completed: completedTasks, total: totalTasks };
  };

  const getStoryIcon = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        );
      case 'READY':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'IN_PROGRESS':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'TESTING':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'COMPLETED':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const { progress, completed, total } = getProgressData();

  // Cargar el epic completo para obtener projectId cuando se necesita
  const loadEpicProjectId = useCallback(async () => {
    if (story.epic?.id) {
      // Si ya tenemos projectId, usarlo
      if (story.epic.projectId) {
        console.log('Usando projectId del epic:', story.epic.projectId);
        setProjectId(story.epic.projectId);
        return;
      }
      
      // Si no, cargar el epic completo
      try {
        console.log('Cargando epic completo, id:', story.epic.id);
        setIsLoadingEpic(true);
        const response = await scrumService.getEpicById(story.epic.id);
        console.log('Respuesta del epic:', response);
        if (response.success && response.data?.epic) {
          console.log('ProjectId obtenido del epic:', response.data.epic.projectId);
          setProjectId(response.data.epic.projectId);
        } else {
          console.error('Error en la respuesta del epic:', response);
        }
      } catch (err) {
        console.error('Error al cargar el epic:', err);
      } finally {
        setIsLoadingEpic(false);
      }
    }
  }, [story.epic?.id, story.epic?.projectId]);

  // Cargar projectId cuando se abre el modal o cuando cambia el epic
  useEffect(() => {
    if (showTaskForm && !projectId && story.epic?.id) {
      console.log('Cargando projectId para epic:', story.epic.id);
      loadEpicProjectId();
    }
  }, [showTaskForm, projectId, story.epic?.id, loadEpicProjectId]);

  // Cargar projectId inicial si el epic ya lo tiene
  useEffect(() => {
    if (story.epic?.projectId && !projectId) {
      console.log('ProjectId encontrado en epic:', story.epic.projectId);
      setProjectId(story.epic.projectId);
    }
  }, [story.epic?.projectId]);

  // Cargar projectId automáticamente si no está disponible pero hay epic
  useEffect(() => {
    if (!projectId && !story.epic?.projectId && story.epic?.id) {
      loadEpicProjectId();
    }
  }, [projectId, story.epic?.id, story.epic?.projectId, loadEpicProjectId]);

  // Debug: Log cuando projectId cambia
  useEffect(() => {
    if (projectId) {
      console.log('ProjectId actualizado:', projectId);
    }
  }, [projectId]);

  // Calcular projectId final para el modal
  const finalProjectId = projectId || story.epic?.projectId;
  
  // Debug: Log del estado actual
  useEffect(() => {
    if (showTaskForm) {
      console.log('Estado del modal:', {
        showTaskForm,
        isLoadingEpic,
        projectId,
        epicProjectId: story.epic?.projectId,
        finalProjectId,
        epicId: story.epic?.id
      });
      
      // Verificar condiciones de renderizado
      const shouldRender = showTaskForm && !isLoadingEpic && finalProjectId;
      console.log('¿Debería renderizar TaskForm?', shouldRender, {
        showTaskForm,
        isLoadingEpic,
        finalProjectId
      });
    }
  }, [showTaskForm, isLoadingEpic, projectId, story.epic?.projectId, finalProjectId]);

  // Función helper para renderizar el modal de tareas
  const renderTaskModal = () => {
    const shouldRender = showTaskForm && !isLoadingEpic && finalProjectId;
    console.log('🔍 Evaluando renderizado del modal:', {
      shouldRender,
      showTaskForm,
      isLoadingEpic,
      finalProjectId,
      projectId,
      epicProjectId: story.epic?.projectId
    });
    
    return (
      <>
        {/* Loading state mientras se carga el epic */}
        {showTaskForm && isLoadingEpic && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-gray-700">{t('stories.loadingProjectInfo', 'Cargando información del proyecto...')}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal del Formulario de Tarea */}
        {shouldRender && (
          <TaskFormImproved
            key={`task-form-${story.id}-${showTaskForm}-${finalProjectId}`}
            projectId={finalProjectId}
            userStoryId={story.id}
            sprintId={story.sprintId || undefined}
            mode="create"
            asModal={true}
            isOpen={showTaskForm}
            onSuccess={(task) => {
              console.log('Tarea creada exitosamente:', task);
              setShowTaskForm(false);
              // Refrescar tareas
              if (isExpanded) {
                const fetchTasks = async () => {
                  try {
                    setIsLoadingTasks(true);
                    const response = await scrumService.getUserStoryTasks(story.id);
                    if (response.success && response.data) {
                      setTasks(response.data.tasks || []);
                    }
                  } catch (err) {
                  } finally {
                    setIsLoadingTasks(false);
                  }
                };
                fetchTasks();
              }
              if (onUpdate) {
                onUpdate();
              }
            }}
            onClose={() => {
              console.log('Cerrando TaskFormImproved');
              setShowTaskForm(false);
            }}
          />
        )}
        
        {/* Mensaje de error si no hay projectId después de cargar */}
        {showTaskForm && !isLoadingEpic && !projectId && !story.epic?.projectId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('common.error', 'Error')}</h3>
                <button
                  onClick={() => setShowTaskForm(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600 mb-4">
                {t('stories.cannotCreateTask', 'No se puede crear la tarea porque no se encontró la información del proyecto asociado a esta historia de usuario.')}
              </p>
              <button
                onClick={() => setShowTaskForm(false)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {t('common.close', 'Cerrar')}
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  // Vista Backlog (lista priorizada)
  if (viewMode === 'backlog') {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 ${isDragging ? 'opacity-50' : ''}`}>
        <div className="flex items-start gap-4">
          {/* Contenido principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2 gap-3">
              <div className="flex items-center flex-wrap gap-2 flex-1 min-w-0">
                <h3 className="text-gray-900 font-semibold line-clamp-1">{story.title}</h3>
                <StatusBadge status={story.status} type="story" size="sm" />
                <PriorityBadge priority={story.priority} size="sm" />
                {story.storyPoints && (
                  <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 border border-indigo-200">
                    {story.storyPoints} {t('stories.points', 'pts')}
                  </span>
                )}
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors p-1.5 rounded-lg"
                  title={isExpanded ? t('stories.collapse', 'Contraer') : t('stories.expand', 'Expandir')}
                >
                  <svg 
                    className={`w-4 h-4 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {onEdit && (
                  <button 
                    onClick={() => onEdit(story)}
                    className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors p-1.5 rounded-lg"
                    title={t('common.edit', 'Editar')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <p className="text-gray-600 text-sm line-clamp-2 mb-3">{story.description}</p>

            {/* Información adicional */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center flex-wrap gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {story._count?.tasks || 0} {t('tasks.title', 'tareas')}
                </span>
                {story.epic && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    {story.epic.title}
                  </span>
                )}
                {story.sprint && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {story.sprint.name}
                  </span>
                )}
              </div>
            </div>

            {/* Progreso de tareas */}
            {total > 0 && (
              <div className="mt-3">
                <ProgressBar 
                  progress={progress} 
                  completed={completed}
                  total={total}
                  size="sm"
                  color="purple"
                  showPercentage={false}
                  showNumbers={true}
                />
              </div>
            )}
          </div>
        </div>

        {/* Contenido expandido */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            {/* Criterios de aceptación */}
            {story.acceptanceCriteria && (
              <div className="mb-4">
                <h4 className="text-gray-900 font-semibold mb-2">{t('stories.acceptanceCriteria', 'Criterios de Aceptación')}:</h4>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-gray-700 text-sm whitespace-pre-line">{story.acceptanceCriteria}</p>
                </div>
              </div>
            )}

            {/* Lista de tareas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-gray-900 font-semibold">{t('tasks.title', 'Tareas')} ({tasks.length})</h4>
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!projectId && story.epic?.id) {
                      await loadEpicProjectId();
                    }
                    setShowTaskForm(true);
                  }}
                  disabled={isLoadingEpic}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>{t('stories.add', 'Agregar')}</span>
                </button>
              </div>

              {isLoadingTasks ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500 mx-auto mb-2"></div>
                  <p className="text-gray-600 text-xs">{t('stories.loadingTasks', 'Cargando tareas...')}</p>
                </div>
              ) : (
                <div className="mt-4 -mx-4 -mb-4">
                  {(() => {
                    const finalProjectId = projectId || story.epic?.projectId;
                    console.log('🔍 Renderizando KanbanBoard:', {
                      tasksLength: tasks.length,
                      projectId,
                      epicProjectId: story.epic?.projectId,
                      finalProjectId,
                      storyId: story.id,
                      isExpanded,
                      epicId: story.epic?.id
                    });
                    
                    if (finalProjectId) {
                      console.log('✅ Mostrando KanbanBoard con projectId:', finalProjectId);
                      return (
                        <KanbanBoard 
                          projectId={finalProjectId} 
                          userStoryId={story.id}
                        />
                      );
                    } else {
                      console.log('⏳ No hay projectId, intentando cargar...');
                      // Si no hay projectId, intentar cargarlo
                      if (story.epic?.id && !isLoadingEpic) {
                        console.log('🔄 Llamando loadEpicProjectId para epic:', story.epic.id);
                        loadEpicProjectId();
                      }
                      return (
                        <div className="text-center py-4">
                          <p className="text-gray-500 text-sm mb-2">{t('stories.loadingProjectInfo', 'Cargando información del proyecto...')}</p>
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500 mx-auto"></div>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Modal de tareas */}
        {renderTaskModal()}
      </div>
    );
  }

  // Vista Cards (tarjetas)
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-200 animate-fade-in ${isDragging ? 'opacity-50' : ''}`}>
      {/* Header de la tarjeta */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white shadow-sm">
            {getStoryIcon(story.status)}
          </div>
          {story.storyPoints && (
            <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold border border-indigo-200">
              {story.storyPoints} {t('stories.points', 'pts')}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <StatusBadge status={story.status} type="story" size="sm" />
          <PriorityBadge priority={story.priority} size="sm" />
        </div>
      </div>

      {/* Título y descripción */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 mb-2">{story.title}</h3>
        <p className="text-gray-600 text-sm line-clamp-3">{story.description}</p>
      </div>

      {/* Criterios de aceptación (resumidos) */}
      {story.acceptanceCriteria && (
        <div className="mb-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-gray-900 text-sm font-medium">{t('stories.acceptanceCriteria', 'Criterios de Aceptación')}</span>
            </div>
            <p className="text-gray-700 text-xs line-clamp-3">{story.acceptanceCriteria}</p>
          </div>
        </div>
      )}

      {/* Progreso de tareas */}
      {total > 0 && (
        <div className="mb-4">
          <ProgressBar 
            progress={progress} 
            completed={completed}
            total={total}
            label={t('stories.taskProgress', 'Progreso de tareas')}
            size="md"
            color="purple"
            showPercentage={true}
            showNumbers={true}
          />
        </div>
      )}

      {/* Información adicional */}
      <div className="text-xs text-gray-600 space-y-1 mb-4">
        {story.epic && (
          <div className="flex items-center space-x-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>{t('epics.title', 'Épica')}: {story.epic.title}</span>
          </div>
        )}
        
        {story.sprint && (
          <div className="flex items-center space-x-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>{t('sprints.title', 'Sprint')}: {story.sprint.name}</span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span>{t('tasks.title', 'Tareas')}: {story._count?.tasks || 0}</span>
          <span>{t('projects.detail.created', 'Creado')}: {formatDate(story.createdAt)}</span>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          {t('projects.updated', 'Actualizado')}: {formatDate(story.updatedAt)}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors p-2 rounded-lg"
            title={t('common.view', 'Ver detalles')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          
          {onEdit && (
            <button
              onClick={() => onEdit(story)}
              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors p-2 rounded-lg"
              title={t('common.edit', 'Editar')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (!projectId && story.epic?.id) {
                await loadEpicProjectId();
              }
              setShowTaskForm(true);
            }}
            disabled={isLoadingEpic}
            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 transition-colors p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('stories.addTask', 'Agregar tarea')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Modal de tareas */}
      {renderTaskModal()}
    </div>
  );
};

export default UserStoryCard;
