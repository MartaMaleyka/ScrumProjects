import React, { useState, useEffect } from 'react';
import { scrumService } from '../../../services/scrumService';
import type { UserStory, Task } from '../../../types/scrum';
import StatusBadge from '../common/StatusBadge';
import PriorityBadge from '../common/PriorityBadge';
import ProgressBar from '../common/ProgressBar';

interface UserStoryCardProps {
  story: UserStory;
  viewMode?: 'backlog' | 'cards';
  priority?: number;
  onUpdate?: () => void;
  isDragging?: boolean;
}

const UserStoryCard: React.FC<UserStoryCardProps> = ({ 
  story, 
  viewMode = 'cards', 
  priority,
  onUpdate,
  isDragging = false
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

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
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getProgressData = () => {
    const totalTasks = story._count?.tasks || tasks.length || 0;
    const completedTasks = tasks.filter(task => task.status === 'DONE').length;
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

  // Vista Backlog (lista priorizada)
  if (viewMode === 'backlog') {
    return (
      <div className={`bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 hover:bg-white/15 transition-all duration-200 cursor-grab ${isDragging ? 'opacity-50 rotate-2' : ''}`}>
        <div className="flex items-start space-x-4">
          {/* Número de prioridad */}
          {priority && (
            <div className="w-8 h-8 bg-gradient-to-r from-[#0EA5E9] to-[#0264C5] rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {priority}
            </div>
          )}

          {/* Icono de la historia */}
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
            {getStoryIcon(story.status)}
          </div>

          {/* Contenido principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-3 flex-1">
                <h3 className="text-white font-medium line-clamp-1">{story.title}</h3>
                <StatusBadge status={story.status} type="story" size="sm" />
                <PriorityBadge priority={story.priority} size="sm" />
                {story.storyPoints && (
                  <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0">
                    {story.storyPoints} pts
                  </span>
                )}
              </div>
            </div>

            <p className="text-blue-200 text-sm line-clamp-2 mb-3">{story.description}</p>

            {/* Información adicional */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-xs text-blue-300">
                <span>📋 {story._count?.tasks || 0} tareas</span>
                {story.epic && <span>📦 {story.epic.title}</span>}
                {story.sprint && <span>🏃 {story.sprint.name}</span>}
              </div>

              {/* Acciones */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-blue-300 hover:text-white transition-colors p-1 rounded hover:bg-blue-500/20"
                  title={isExpanded ? "Contraer" : "Expandir"}
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
                
                <button className="text-green-300 hover:text-white transition-colors p-1 rounded hover:bg-green-500/20">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
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
          <div className="mt-4 pt-4 border-t border-white/20">
            {/* Criterios de aceptación */}
            {story.acceptanceCriteria && (
              <div className="mb-4">
                <h4 className="text-white font-medium mb-2">Criterios de Aceptación:</h4>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-blue-200 text-sm whitespace-pre-line">{story.acceptanceCriteria}</p>
                </div>
              </div>
            )}

            {/* Lista de tareas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-medium">Tareas ({tasks.length})</h4>
                <button className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs flex items-center space-x-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Agregar</span>
                </button>
              </div>

              {isLoadingTasks ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-blue-200 text-xs">Cargando tareas...</p>
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-blue-200 text-sm">No hay tareas creadas</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div key={task.id} className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-1">
                          <StatusBadge status={task.status} type="task" size="sm" />
                          <span className="text-white font-medium line-clamp-1">{task.title}</span>
                          {task.estimatedHours && (
                            <span className="text-blue-300 text-xs">
                              ⏱️ {task.estimatedHours}h
                            </span>
                          )}
                        </div>
                        {task.assignee && (
                          <span className="text-blue-300 text-xs">
                            👤 {task.assignee.name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Vista Cards (tarjetas)
  return (
    <div className={`bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 hover:bg-white/15 transition-all duration-200 transform hover:scale-105 animate-fade-in ${isDragging ? 'opacity-50' : ''}`}>
      {/* Header de la tarjeta */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white ring-2 ring-[#FFCD00]/30">
            {getStoryIcon(story.status)}
          </div>
          {story.storyPoints && (
            <div className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm font-bold">
              {story.storyPoints} pts
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
        <h3 className="text-lg font-semibold text-white line-clamp-2 mb-2">{story.title}</h3>
        <p className="text-blue-200 text-sm line-clamp-3">{story.description}</p>
      </div>

      {/* Criterios de aceptación (resumidos) */}
      {story.acceptanceCriteria && (
        <div className="mb-4">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-white text-sm font-medium">Criterios de Aceptación</span>
            </div>
            <p className="text-blue-200 text-xs line-clamp-3">{story.acceptanceCriteria}</p>
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
            label="Progreso de tareas"
            size="md"
            color="purple"
            showPercentage={true}
            showNumbers={true}
          />
        </div>
      )}

      {/* Información adicional */}
      <div className="text-xs text-blue-300 space-y-1 mb-4">
        {story.epic && (
          <div className="flex items-center space-x-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>Épica: {story.epic.title}</span>
          </div>
        )}
        
        {story.sprint && (
          <div className="flex items-center space-x-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Sprint: {story.sprint.name}</span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span>Tareas: {story._count?.tasks || 0}</span>
          <span>Creado: {formatDate(story.createdAt)}</span>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between pt-4 border-t border-white/20">
        <div className="text-xs text-blue-300">
          Actualizado: {formatDate(story.updatedAt)}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            className="text-blue-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-blue-500/20"
            title="Ver detalles"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          
          <button
            className="text-green-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-green-500/20"
            title="Editar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          
          <button
            className="text-purple-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-purple-500/20"
            title="Agregar tarea"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserStoryCard;
