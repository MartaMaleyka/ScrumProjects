import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { scrumService } from '../../../services/scrumService';
import type { Sprint, SprintStats, UserStory, Task } from '../../../types/scrum';
import StatusBadge from '../common/StatusBadge';
import ProgressBar from '../common/ProgressBar';
import LoadingSpinner from '../common/LoadingSpinner';
import UserStorySelector from './UserStorySelector';
import BurndownChart from './BurndownChart';

interface SprintCardProps {
  sprint: Sprint;
  isDetailed?: boolean;
  onUpdate?: () => void;
  onViewTasks?: () => void;
}

const SprintCard: React.FC<SprintCardProps> = ({ 
  sprint, 
  isDetailed = false,
  onUpdate,
  onViewTasks 
}) => {
  const { t } = useTranslation();
  const [sprintStats, setSprintStats] = useState<SprintStats | null>(null);
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [showStorySelector, setShowStorySelector] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showBurndownChart, setShowBurndownChart] = useState(false);

  // Cargar estadísticas detalladas cuando es vista detallada
  useEffect(() => {
    if (isDetailed && sprint.id) {
      const fetchSprintData = async () => {
        try {
          setIsLoadingStats(true);
          
          // Inicializar con valores por defecto (se actualizarán con los cálculos reales)
          setSprintStats({
            sprint: sprint,
            calculatedStats: {
              totalStoryPoints: 0,
              completedStoryPoints: 0,
              remainingStoryPoints: 0,
              completionPercentage: '0',
              totalTasks: 0,
              completedTasks: 0,
              taskCompletionPercentage: '0'
            }
          });

          // Cargar las historias del sprint
          const epicsResponse = await scrumService.getProjectEpics(sprint.projectId);
          let sprintStories: UserStory[] = [];
          let sprintTasks: Task[] = [];
          
          if (epicsResponse.success && epicsResponse.data) {
            const allEpics = epicsResponse.data.epics || [];
            const storyPromises = allEpics.map(epic => 
              scrumService.getEpicUserStories(epic.id, { sprintId: sprint.id })
            );
            
            const storyResponses = await Promise.all(storyPromises);
            sprintStories = storyResponses
              .filter(response => response.success && response.data)
              .flatMap(response => response.data!.userStories || [])
              .filter(story => story.sprintId === sprint.id);
            
            setUserStories(sprintStories);
          }

          // Cargar las tareas del sprint
          try {
            const tasksResponse = await scrumService.getSprintTasks(sprint.id);
            if (tasksResponse.success && tasksResponse.data) {
              sprintTasks = tasksResponse.data.tasks || [];
            }
          } catch (taskErr) {
            console.error('Error al cargar tareas del sprint:', taskErr);
          }

          // Calcular estadísticas reales
          const totalStoryPoints = sprintStories.reduce((sum, story) => sum + (story.storyPoints || 0), 0);
          const completedStoryPoints = sprintStories
            .filter(story => story.status === 'COMPLETED')
            .reduce((sum, story) => sum + (story.storyPoints || 0), 0);
          
          const totalTasks = sprintTasks.length;
          const completedTasks = sprintTasks.filter(task => task.status === 'COMPLETED').length;
          
          const storyPointsProgress = totalStoryPoints > 0 
            ? Math.round((completedStoryPoints / totalStoryPoints) * 100) 
            : 0;
          
          const tasksProgress = totalTasks > 0 
            ? Math.round((completedTasks / totalTasks) * 100) 
            : 0;

          // Actualizar estadísticas con valores calculados
          setSprintStats({
            sprint: sprint,
            calculatedStats: {
              totalStoryPoints,
              completedStoryPoints,
              remainingStoryPoints: totalStoryPoints - completedStoryPoints,
              completionPercentage: storyPointsProgress.toString(),
              totalTasks,
              completedTasks,
              taskCompletionPercentage: tasksProgress.toString()
            }
          });
          
        } catch (err) {
          console.error('Error al cargar datos del sprint:', err);
        } finally {
          setIsLoadingStats(false);
        }
      };

      fetchSprintData();
    }
  }, [isDetailed, sprint.id, sprint.projectId]);

  const handleStartSprint = async () => {
    try {
      setIsUpdatingStatus(true);
      
      // Preparar datos de actualización con todos los campos requeridos
      const updateData: any = {
        name: sprint.name,
        projectId: sprint.projectId,
        status: 'ACTIVE'
      };
      
      // Incluir campos opcionales si existen
      if (sprint.description) {
        updateData.description = sprint.description;
      }
      if (sprint.goal) {
        updateData.goal = sprint.goal;
      }
      if (sprint.velocity !== null && sprint.velocity !== undefined) {
        updateData.velocity = sprint.velocity;
      }
      
      // Si no tiene fecha de inicio, establecerla a hoy
      if (!sprint.startDate) {
        updateData.startDate = new Date().toISOString();
      } else {
        updateData.startDate = sprint.startDate;
      }
      
      // Incluir fecha de fin si existe
      if (sprint.endDate) {
        updateData.endDate = sprint.endDate;
      }
      
      const response = await scrumService.updateSprint(sprint.id, updateData);
      
      if (response.success) {
        // Refrescar la vista
        onUpdate?.();
        // Disparar evento personalizado para actualizar otros componentes
        window.dispatchEvent(new CustomEvent('sprint:updated', { 
          detail: { sprintId: sprint.id, status: 'ACTIVE' } 
        }));
      } else {
        alert(response.message || t('sprints.startError', 'Error al iniciar el sprint'));
      }
    } catch (err: any) {
      console.error('Error al iniciar el sprint:', err);
      alert(err.message || t('sprints.startError', 'Error al iniciar el sprint'));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleFinishSprint = async () => {
    if (!confirm('¿Estás seguro de que deseas finalizar este sprint? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setIsUpdatingStatus(true);
      
      // Preparar datos de actualización con todos los campos requeridos
      const updateData: any = {
        name: sprint.name,
        projectId: sprint.projectId,
        status: 'COMPLETED'
      };
      
      // Incluir campos opcionales si existen
      if (sprint.description) {
        updateData.description = sprint.description;
      }
      if (sprint.goal) {
        updateData.goal = sprint.goal;
      }
      if (sprint.velocity !== null && sprint.velocity !== undefined) {
        updateData.velocity = sprint.velocity;
      }
      
      // Incluir fecha de inicio si existe
      if (sprint.startDate) {
        updateData.startDate = sprint.startDate;
      }
      
      // Si no tiene fecha de fin, establecerla a hoy
      if (!sprint.endDate) {
        updateData.endDate = new Date().toISOString();
      } else {
        updateData.endDate = sprint.endDate;
      }
      
      const response = await scrumService.updateSprint(sprint.id, updateData);
      
      if (response.success) {
        // Refrescar la vista
        onUpdate?.();
        // Disparar evento personalizado para actualizar otros componentes
        window.dispatchEvent(new CustomEvent('sprint:updated', { 
          detail: { sprintId: sprint.id, status: 'COMPLETED' } 
        }));
      } else {
        alert(response.message || t('sprints.finishError', 'Error al finalizar el sprint'));
      }
    } catch (err: any) {
      console.error('Error al finalizar el sprint:', err);
      alert(err.message || t('sprints.finishError', 'Error al finalizar el sprint'));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('common.notDefined', 'No definida');
    return new Date(dateString).toLocaleDateString(t('common.locale', 'es-ES') as string, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getSprintDuration = () => {
    if (!sprint.startDate || !sprint.endDate) return null;
    
    const start = new Date(sprint.startDate);
    const end = new Date(sprint.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const getSprintProgress = () => {
    if (!sprint.startDate || !sprint.endDate) return null;
    
    const start = new Date(sprint.startDate);
    const end = new Date(sprint.endDate);
    const now = new Date();
    
    if (now < start) return 0; // Sprint no ha comenzado
    if (now > end) return 100; // Sprint terminado
    
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    
    return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
  };

  const getSprintIcon = (status: string) => {
    switch (status) {
      case 'PLANNING':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case 'ACTIVE':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'COMPLETED':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
    }
  };

  const duration = getSprintDuration();
  const timeProgress = getSprintProgress();

  // Vista de tarjeta simple
  const simpleView = !isDetailed ? (
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 hover:bg-white/15 transition-all duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white">
              {getSprintIcon(sprint.status)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{sprint.name}</h3>
              <div className="text-xs text-blue-300">
                {duration ? `${duration} ${t('sprints.days', 'días')}` : t('sprints.durationNotDefined', 'Duración no definida')}
              </div>
            </div>
          </div>
          
          <StatusBadge status={sprint.status} type="sprint" size="sm" />
        </div>

        {sprint.description && (
          <p className="text-blue-200 text-sm line-clamp-2 mb-4">{sprint.description}</p>
        )}

        {sprint.goal && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2 mb-1">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-blue-300 text-sm font-medium">{t('sprints.goal', 'Objetivo del Sprint')}:</span>
            </div>
            <p className="text-blue-200 text-sm">{sprint.goal}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <div className="text-lg font-bold text-white">{sprint._count?.userStories || 0}</div>
            <div className="text-xs text-blue-300">{t('stories.title', 'Historias')}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-white">{sprint._count?.tasks || 0}</div>
            <div className="text-xs text-blue-300">{t('tasks.title', 'Tareas')}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-white">{sprint.velocity || 0}</div>
            <div className="text-xs text-blue-300">{t('sprints.velocity', 'Velocity')}</div>
          </div>
        </div>

        <div className="text-xs text-blue-300 space-y-1">
          <div className="flex justify-between">
            <span>{t('projects.start', 'Inicio')}:</span>
            <span>{formatDate(sprint.startDate)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('projects.end', 'Fin')}:</span>
            <span>{formatDate(sprint.endDate)}</span>
          </div>
        </div>
      </div>
  ) : null;

  // Vista detallada
  const detailedView = isDetailed ? (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6 shadow-sm">
      {/* Header del Sprint */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white shadow-sm">
            {getSprintIcon(sprint.status)}
          </div>
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">{sprint.name}</h2>
              <StatusBadge status={sprint.status} type="sprint" />
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div>{t('projects.start', 'Inicio')}: {formatDate(sprint.startDate)}</div>
              <div>{t('projects.end', 'Fin')}: {formatDate(sprint.endDate)}</div>
              {duration && <div>{t('sprints.duration', 'Duración')}: {duration} {t('sprints.days', 'días')}</div>}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {onViewTasks && (
            <button 
              onClick={onViewTasks}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
               </svg>
              <span>{t('sprints.viewTasks', 'Ver Tareas')}</span>
            </button>
          )}
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>{t('common.edit', 'Editar')}</span>
          </button>
        </div>
      </div>

      {/* Descripción y objetivo */}
      {(sprint.description || sprint.goal) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sprint.description && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('sprints.description', 'Descripción')}</h3>
              <p className="text-gray-600 text-sm">{sprint.description}</p>
            </div>
          )}
          
          {sprint.goal && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('sprints.goal', 'Objetivo del Sprint')}</h3>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                <p className="text-gray-700 text-sm">{sprint.goal}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progreso temporal */}
      {timeProgress !== null && sprint.status === 'ACTIVE' && (
        <div>
          <ProgressBar 
            progress={timeProgress} 
            label={t('sprints.temporalProgress', 'Progreso temporal del sprint')}
            size="lg"
            color="purple"
            showPercentage={true}
          />
        </div>
      )}

      {/* Estadísticas del Sprint */}
      {isLoadingStats ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" text={t('sprints.loadingStats', 'Cargando estadísticas...')} />
        </div>
      ) : sprintStats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Progreso de Story Points */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Story Points</h3>
            <ProgressBar 
              progress={parseInt(sprintStats.calculatedStats.completionPercentage) || 0} 
              completed={sprintStats.calculatedStats.completedStoryPoints}
              total={sprintStats.calculatedStats.totalStoryPoints}
              label={t('sprints.storyPointsProgress', 'Progreso de story points')}
              size="md"
              color="blue"
              showPercentage={true}
              showNumbers={true}
            />
          </div>

          {/* Progreso de Tareas */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('tasks.title', 'Tareas')}</h3>
            <ProgressBar 
              progress={parseInt(sprintStats.calculatedStats.taskCompletionPercentage) || 0} 
              completed={sprintStats.calculatedStats.completedTasks}
              total={sprintStats.calculatedStats.totalTasks}
              label={t('stories.taskProgress', 'Progreso de tareas')}
              size="md"
              color="purple"
              showPercentage={true}
              showNumbers={true}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600 mb-1">{sprint._count?.userStories || 0}</div>
            <div className="text-gray-600 text-sm">{t('stories.title', 'Historias')}</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600 mb-1">{sprint._count?.tasks || 0}</div>
            <div className="text-gray-600 text-sm">{t('tasks.title', 'Tareas')}</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600 mb-1">{sprint._count?.members || 0}</div>
            <div className="text-gray-600 text-sm">Miembros</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600 mb-1">{sprint.velocity || 0}</div>
            <div className="text-gray-600 text-sm">Velocity</div>
          </div>
        </div>
      )}

      {/* Acciones del Sprint */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowStorySelector(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>{t('sprints.associateStories', 'Asociar Historias de Usuario')}</span>
          </button>

          {sprint.status === 'PLANNING' && (
            <button 
              onClick={handleStartSprint}
              disabled={isUpdatingStatus}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 shadow-sm"
            >
              {isUpdatingStatus ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Iniciando...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15" />
                  </svg>
                  <span>{t('sprints.startSprint', 'Iniciar Sprint')}</span>
                </>
              )}
            </button>
          )}
          
          {sprint.status === 'ACTIVE' && (
            <button 
              onClick={handleFinishSprint}
              disabled={isUpdatingStatus}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 shadow-sm"
            >
              {isUpdatingStatus ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Finalizando...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{t('sprints.finishSprint', 'Finalizar Sprint')}</span>
                </>
              )}
            </button>
          )}
          
          <button 
            onClick={() => setShowBurndownChart(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>{t('sprints.viewBurndown', 'Ver Burndown')}</span>
          </button>
        </div>
        
        <div className="text-xs text-gray-500">
          Actualizado: {formatDate(sprint.updatedAt)}
        </div>
      </div>

      {/* Ceremonias del Sprint */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{t('sprints.ceremonies.title', 'Ceremonias del Sprint')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <button className="p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors text-left">
            <div className="flex items-center space-x-2 mb-1">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-blue-700 text-sm font-medium">{t('sprints.ceremonies.planning', 'Planning')}</span>
            </div>
            <p className="text-blue-600 text-xs">{t('sprints.ceremonies.planningDesc', 'Planificación del sprint')}</p>
          </button>
          
          <button className="p-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors text-left">
            <div className="flex items-center space-x-2 mb-1">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-green-700 text-sm font-medium">{t('sprints.ceremonies.daily', 'Daily')}</span>
            </div>
            <p className="text-green-600 text-xs">{t('sprints.ceremonies.dailyDesc', 'Reuniones diarias')}</p>
          </button>
          
          <button className="p-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors text-left">
            <div className="flex items-center space-x-2 mb-1">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-purple-700 text-sm font-medium">{t('sprints.ceremonies.review', 'Review')}</span>
            </div>
            <p className="text-purple-600 text-xs">{t('sprints.ceremonies.reviewDesc', 'Revisión del sprint')}</p>
          </button>
          
          <button className="p-3 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors text-left">
            <div className="flex items-center space-x-2 mb-1">
              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-orange-700 text-sm font-medium">{t('sprints.ceremonies.retrospective', 'Retrospective')}</span>
            </div>
            <p className="text-orange-600 text-xs">{t('sprints.ceremonies.retrospectiveDesc', 'Retrospectiva del sprint')}</p>
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {!isDetailed ? simpleView : detailedView}
      
      {/* Modal de Selección de Historias de Usuario */}
      {ReactDOM.createPortal(
        <UserStorySelector
          projectId={sprint.projectId}
          sprintId={sprint.id}
          currentSprintStories={userStories}
          isOpen={showStorySelector}
          onClose={() => setShowStorySelector(false)}
          onSuccess={() => {
            // Refrescar los datos del sprint
            if (onUpdate) {
              onUpdate();
            }
            // Recargar las historias del sprint
            const fetchSprintData = async () => {
              try {
                const epicsResponse = await scrumService.getProjectEpics(sprint.projectId);
                if (epicsResponse.success && epicsResponse.data) {
                  const allEpics = epicsResponse.data.epics || [];
                  const storyPromises = allEpics.map(epic => 
                    scrumService.getEpicUserStories(epic.id, { sprintId: sprint.id })
                  );
                  
                  const storyResponses = await Promise.all(storyPromises);
                  const sprintStories = storyResponses
                    .filter(response => response.success && response.data)
                    .flatMap(response => response.data!.userStories || [])
                    .filter(story => story.sprintId === sprint.id);
                  
                  setUserStories(sprintStories);
                }
              } catch (err) {
                console.error('Error al recargar historias:', err);
              }
            };
            fetchSprintData();
          }}
        />,
        document.body
      )}

      {/* Modal de Burndown Chart */}
      {ReactDOM.createPortal(
        <BurndownChart
          sprintId={sprint.id}
          isOpen={showBurndownChart}
          onClose={() => setShowBurndownChart(false)}
        />,
        document.body
      )}
    </>
  );
};

export default SprintCard;
