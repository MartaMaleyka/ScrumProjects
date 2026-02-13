import React, { useState, useEffect } from 'react';
import { scrumService } from '../../../services/scrumService';
import type { Sprint, SprintStats, UserStory } from '../../../types/scrum';
import StatusBadge from '../common/StatusBadge';
import ProgressBar from '../common/ProgressBar';
import LoadingSpinner from '../common/LoadingSpinner';

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
  const [sprintStats, setSprintStats] = useState<SprintStats | null>(null);
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Cargar estadísticas detalladas cuando es vista detallada
  useEffect(() => {
    if (isDetailed && sprint.id) {
      const fetchSprintData = async () => {
        try {
          setIsLoadingStats(true);
          
          // TODO: El endpoint /sprints/:id/stats no existe en la API
          // Por ahora, generamos stats básicas desde los datos del sprint
          
          // Usar datos básicos del sprint para mostrar información
          setSprintStats({
            sprint: sprint,
            calculatedStats: {
              totalStoryPoints: 0,
              completedStoryPoints: 0,
              remainingStoryPoints: 0,
              completionPercentage: '0%',
              totalTasks: 0,
              completedTasks: 0,
              taskCompletionPercentage: '0%'
            }
          });

          // También podríamos cargar las historias del sprint aquí
          // const storiesResponse = await scrumService.getSprintUserStories(sprint.id);
          
        } catch (err) {
        } finally {
          setIsLoadingStats(false);
        }
      };

      fetchSprintData();
    }
  }, [isDetailed, sprint.id]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No definida';
    return new Date(dateString).toLocaleDateString('es-ES', {
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

  if (!isDetailed) {
    // Vista de tarjeta simple
    return (
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 hover:bg-white/15 transition-all duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white">
              {getSprintIcon(sprint.status)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{sprint.name}</h3>
              <div className="text-xs text-blue-300">
                {duration ? `${duration} días` : 'Duración no definida'}
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
              <span className="text-blue-300 text-sm font-medium">Objetivo del Sprint:</span>
            </div>
            <p className="text-blue-200 text-sm">{sprint.goal}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <div className="text-lg font-bold text-white">{sprint._count?.userStories || 0}</div>
            <div className="text-xs text-blue-300">Historias</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-white">{sprint._count?.tasks || 0}</div>
            <div className="text-xs text-blue-300">Tareas</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-white">{sprint.velocity || 0}</div>
            <div className="text-xs text-blue-300">Velocity</div>
          </div>
        </div>

        <div className="text-xs text-blue-300 space-y-1">
          <div className="flex justify-between">
            <span>Inicio:</span>
            <span>{formatDate(sprint.startDate)}</span>
          </div>
          <div className="flex justify-between">
            <span>Fin:</span>
            <span>{formatDate(sprint.endDate)}</span>
          </div>
        </div>
      </div>
    );
  }

  // Vista detallada
  return (
    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 space-y-6">
      {/* Header del Sprint */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white">
            {getSprintIcon(sprint.status)}
          </div>
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h2 className="text-2xl font-bold text-white">{sprint.name}</h2>
              <StatusBadge status={sprint.status} type="sprint" />
            </div>
            <div className="flex items-center space-x-6 text-sm text-blue-300">
              <div>Inicio: {formatDate(sprint.startDate)}</div>
              <div>Fin: {formatDate(sprint.endDate)}</div>
              {duration && <div>Duración: {duration} días</div>}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {onViewTasks && (
            <button 
              onClick={onViewTasks}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
               </svg>
              <span>Ver Tareas</span>
            </button>
          )}
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Editar</span>
          </button>
        </div>
      </div>

      {/* Descripción y objetivo */}
      {(sprint.description || sprint.goal) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sprint.description && (
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Descripción</h3>
              <p className="text-blue-200 text-sm">{sprint.description}</p>
            </div>
          )}
          
          {sprint.goal && (
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Objetivo del Sprint</h3>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-blue-200 text-sm">{sprint.goal}</p>
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
            label="Progreso temporal del sprint"
            size="lg"
            color="green"
            showPercentage={true}
          />
        </div>
      )}

      {/* Estadísticas del Sprint */}
      {isLoadingStats ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" text="Cargando estadísticas..." />
        </div>
      ) : sprintStats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Progreso de Story Points */}
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="text-lg font-medium text-white mb-4">Story Points</h3>
            <ProgressBar 
              progress={Number(sprintStats.calculatedStats.completionPercentage)} 
              completed={sprintStats.calculatedStats.completedStoryPoints}
              total={sprintStats.calculatedStats.totalStoryPoints}
              label="Progreso de story points"
              size="md"
              color="blue"
              showPercentage={true}
              showNumbers={true}
            />
          </div>

          {/* Progreso de Tareas */}
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="text-lg font-medium text-white mb-4">Tareas</h3>
            <ProgressBar 
              progress={Number(sprintStats.calculatedStats.taskCompletionPercentage)} 
              completed={sprintStats.calculatedStats.completedTasks}
              total={sprintStats.calculatedStats.totalTasks}
              label="Progreso de tareas"
              size="md"
              color="purple"
              showPercentage={true}
              showNumbers={true}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white mb-1">{sprint._count?.userStories || 0}</div>
            <div className="text-blue-200 text-sm">Historias</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white mb-1">{sprint._count?.tasks || 0}</div>
            <div className="text-blue-200 text-sm">Tareas</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white mb-1">{sprint._count?.members || 0}</div>
            <div className="text-blue-200 text-sm">Miembros</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white mb-1">{sprint.velocity || 0}</div>
            <div className="text-blue-200 text-sm">Velocity</div>
          </div>
        </div>
      )}

      {/* Acciones del Sprint */}
      <div className="flex items-center justify-between pt-6 border-t border-white/20">
        <div className="flex items-center space-x-4">
          {sprint.status === 'PLANNING' && (
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15" />
              </svg>
              <span>Iniciar Sprint</span>
            </button>
          )}
          
          {sprint.status === 'ACTIVE' && (
            <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Finalizar Sprint</span>
            </button>
          )}
          
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Ver Burndown</span>
          </button>
        </div>
        
        <div className="text-xs text-blue-300">
          Actualizado: {formatDate(sprint.updatedAt)}
        </div>
      </div>

      {/* Ceremonias del Sprint */}
      <div className="bg-white/5 rounded-lg p-4">
        <h3 className="text-lg font-medium text-white mb-4">Ceremonias del Sprint</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <button className="p-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg transition-colors text-left">
            <div className="flex items-center space-x-2 mb-1">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-blue-300 text-sm font-medium">Planning</span>
            </div>
            <p className="text-blue-200 text-xs">Planificación del sprint</p>
          </button>
          
          <button className="p-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg transition-colors text-left">
            <div className="flex items-center space-x-2 mb-1">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-green-300 text-sm font-medium">Daily</span>
            </div>
            <p className="text-green-200 text-xs">Reuniones diarias</p>
          </button>
          
          <button className="p-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg transition-colors text-left">
            <div className="flex items-center space-x-2 mb-1">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-purple-300 text-sm font-medium">Review</span>
            </div>
            <p className="text-purple-200 text-xs">Revisión del sprint</p>
          </button>
          
          <button className="p-3 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-lg transition-colors text-left">
            <div className="flex items-center space-x-2 mb-1">
              <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-orange-300 text-sm font-medium">Retrospective</span>
            </div>
            <p className="text-orange-200 text-xs">Retrospectiva del sprint</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SprintCard;
