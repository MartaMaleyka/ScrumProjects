import React, { useState, useEffect, useRef } from 'react';
import { scrumService } from '../../../services/scrumService';
import { exportService } from '../../../services/exportService';
import type { Task, TaskStatus, TaskFilters, TaskType } from '../../../types/scrum';
import TaskCard from './TaskCard';
import LoadingSpinner from '../common/LoadingSpinner';

interface KanbanBoardProps {
  projectId?: number;
  sprintId?: number;
  userStoryId?: number;
}

interface KanbanColumn {
  id: TaskStatus;
  title: string;
  color: string;
  icon: React.ReactElement;
  tasks: Task[];
}

interface DragState {
  task: Task;
  sourceColumn: TaskStatus;
  targetColumn: TaskStatus | null;
  targetIndex: number | null;
  isOverColumn: boolean;
  isOverTask: boolean;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ projectId, sprintId, userStoryId }) => {
  // Debug: Log props on mount and updates
  useEffect(() => {
  }, [projectId, sprintId, userStoryId]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dragImageRef = useRef<HTMLDivElement | null>(null);

  // Definir columnas del Kanban con paleta IMHPA
  const columns: Omit<KanbanColumn, 'tasks'>[] = [
    {
      id: 'TODO' as TaskStatus,
      title: 'Por Hacer',
      color: 'bg-gray-50 border-2 border-gray-200',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )
    },
    {
      id: 'IN_PROGRESS' as TaskStatus,
      title: 'En Progreso',
      color: 'bg-blue-50 border-2 border-blue-deep/30',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      id: 'IN_REVIEW' as TaskStatus,
      title: 'En Revisión',
      color: 'bg-purple-50 border-2 border-purple-400/30',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )
    },
    {
      id: 'COMPLETED' as TaskStatus,
      title: 'Completado',
      color: 'bg-green-50 border-2 border-green-400/30',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  // Función para cargar tareas
  const fetchTasks = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      let tasksData: Task[] = [];
      
      if (userStoryId) {
        // Cargar tareas de una historia específica
        const response = await scrumService.getUserStoryTasks(userStoryId, filters);
        if (response.success && response.data) {
          tasksData = response.data.tasks || [];
        }
      } else if (sprintId) {
        // Cargar tareas de un sprint específico
        const response = await scrumService.getSprintTasks(sprintId, filters);
        if (response.success && response.data) {
          tasksData = response.data.tasks || [];
        }
      } else if (projectId) {
        // Cargar todas las tareas del proyecto
        const response = await scrumService.getProjectTasks(projectId, filters);
        if (response.success && response.data) {
          tasksData = response.data.tasks || [];
        }
      }
      
      setTasks(tasksData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las tareas');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, sprintId, userStoryId, filters]);

  // Cargar tareas al montar o cambiar dependencias
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Actualización automática cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTasks();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [fetchTasks]);

  // Escuchar eventos de actualización desde otras partes de la aplicación
  useEffect(() => {
    let refreshTimeout: NodeJS.Timeout | null = null;
    
    const handleRefresh = () => {
      // Debounce: evitar múltiples refrescos muy seguidos
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      refreshTimeout = setTimeout(() => {
        fetchTasks();
      }, 100); // Esperar 100ms antes de refrescar para evitar llamadas duplicadas
    };

    // Escuchar eventos personalizados de actualización
    window.addEventListener('scrum:refresh', handleRefresh);
    window.addEventListener('task:created', handleRefresh);
    window.addEventListener('task:updated', handleRefresh);
    window.addEventListener('sprint:created', handleRefresh);
    window.addEventListener('sprint:updated', handleRefresh);
    window.addEventListener('userStory:created', handleRefresh);
    window.addEventListener('userStory:updated', handleRefresh);

    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      window.removeEventListener('scrum:refresh', handleRefresh);
      window.removeEventListener('task:created', handleRefresh);
      window.removeEventListener('task:updated', handleRefresh);
      window.removeEventListener('sprint:created', handleRefresh);
      window.removeEventListener('sprint:updated', handleRefresh);
      window.removeEventListener('userStory:created', handleRefresh);
      window.removeEventListener('userStory:updated', handleRefresh);
    };
  }, [fetchTasks]);

  // Organizar tareas por columnas (mantener orden)
  const kanbanColumns: KanbanColumn[] = columns.map(column => ({
    ...column,
    tasks: tasks
      .filter(task => task.status === column.id)
      .sort((a, b) => {
        // Ordenar por prioridad y luego por ID (para mantener orden relativo)
        const priorityOrder: Record<string, number> = {
          'CRITICAL': 4,
          'HIGH': 3,
          'MEDIUM': 2,
          'LOW': 1
        };
        const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        return priorityDiff !== 0 ? priorityDiff : a.id - b.id;
      })
  }));

  // Manejar inicio de drag
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setIsDragging(true);
    setDragState({
      task,
      sourceColumn: task.status,
      targetColumn: null,
      targetIndex: null,
      isOverColumn: false,
      isOverTask: false
    });

    // Crear imagen personalizada para el drag
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.opacity = '0.8';
    dragImage.style.transform = 'rotate(5deg)';
    dragImage.style.width = `${e.currentTarget.clientWidth}px`;
    document.body.appendChild(dragImage);
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    e.dataTransfer.setDragImage(dragImage, e.currentTarget.clientWidth / 2, 20);
    
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id.toString());
  };

  // Manejar fin de drag
  const handleDragEnd = () => {
    setIsDragging(false);
    setDragState(null);
  };

  // Manejar drag sobre columna
  const handleDragOverColumn = (e: React.DragEvent, columnId: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (dragState && dragState.task.status !== columnId) {
      setDragState(prev => prev ? {
        ...prev,
        targetColumn: columnId,
        isOverColumn: true,
        targetIndex: null
      } : null);
    }
  };

  // Manejar drag fuera de columna
  const handleDragLeaveColumn = () => {
    if (dragState) {
      setDragState(prev => prev ? {
        ...prev,
        isOverColumn: false,
        targetColumn: null
      } : null);
    }
  };

  // Manejar drop en columna
  const handleDropColumn = async (e: React.DragEvent, columnId: TaskStatus) => {
    e.preventDefault();
    
    if (!dragState || dragState.task.status === columnId) {
      setDragState(null);
      setIsDragging(false);
      return;
    }

    const previousTasks = [...tasks];
    
    // Actualizar inmediatamente en la UI
    setTasks(prev => 
      prev.map(task => 
        task.id === dragState.task.id 
          ? { ...task, status: columnId }
          : task
      )
    );

    try {
      const updateData = {
        status: columnId
      };
      
      const response = await scrumService.updateTask(dragState.task.id, updateData);
      
      if (response.success && response.data?.task) {
        // Disparar evento para actualizar otros componentes
        window.dispatchEvent(new CustomEvent('task:updated', { detail: { task: response.data.task } }));
        // Refrescar datos desde el servidor inmediatamente para asegurar sincronización
        // Esperar un momento para que el servidor procese la actualización y la base de datos se sincronice
        setTimeout(async () => {
          await fetchTasks();
        }, 300);
      } else {
        // Si la respuesta no fue exitosa, revertir cambios
        setTasks(previousTasks);
        alert(`Error al actualizar la tarea: ${response.message || 'Error desconocido'}`);
      }
      
    } catch (err: any) {
      setTasks(previousTasks);
      alert(`Error al actualizar la tarea: ${err.message || 'Error desconocido'}`);
    } finally {
      setDragState(null);
      setIsDragging(false);
    }
  };

  // Manejar drag sobre tarea (para reordenamiento)
  const handleDragOverTask = (e: React.DragEvent, taskId: number, columnId: TaskStatus) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    if (dragState && dragState.task.id !== taskId) {
      const column = kanbanColumns.find(col => col.id === columnId);
      const taskIndex = column?.tasks.findIndex(t => t.id === taskId) ?? -1;
      
      setDragState(prev => prev ? {
        ...prev,
        targetColumn: columnId,
        targetIndex: taskIndex >= 0 ? taskIndex : null,
        isOverTask: true,
        isOverColumn: false
      } : null);
    }
  };

  // Manejar drop sobre tarea (reordenamiento)
  const handleDropTask = async (e: React.DragEvent, targetTaskId: number, columnId: TaskStatus) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!dragState || dragState.task.id === targetTaskId) {
      setDragState(null);
      setIsDragging(false);
      return;
    }

    // Si es la misma columna, solo reordenamos (por ahora mantenemos el orden actual)
    // Si es diferente columna, movemos
    if (dragState.task.status !== columnId) {
      handleDropColumn(e, columnId);
    } else {
      // Reordenamiento dentro de la misma columna
      // Por ahora solo actualizamos el estado visualmente
      // TODO: Implementar orden de prioridad en backend si es necesario
      setDragState(null);
      setIsDragging(false);
    }
  };

  const getColumnStats = () => {
    const COMPLETED_STATUS: TaskStatus = 'COMPLETED' as TaskStatus;
    const stats = {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'TODO').length,
      inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      inReview: tasks.filter(t => t.status === 'IN_REVIEW').length,
      completed: tasks.filter(t => t.status === COMPLETED_STATUS).length,
      totalHours: tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0),
      completedHours: tasks
        .filter(task => task.status === COMPLETED_STATUS)
        .reduce((sum, task) => sum + (task.actualHours || task.estimatedHours || 0), 0),
    };
    return stats;
  };

  const stats = getColumnStats();

  // Mostrar estado de carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" text="Cargando tablero..." />
      </div>
    );
  }

  // Mostrar error
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar tablero</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Estilos globales para animaciones */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .kanban-task-enter {
          animation: slideIn 0.3s ease-out;
        }
        
        .kanban-column-drag-over {
          background-color: rgba(2, 100, 197, 0.1) !important;
          border-color: #0264C5 !important;
          transform: scale(1.02);
          transition: all 0.2s ease;
        }
        
        .kanban-task-dragging {
          opacity: 0.5;
          transform: scale(0.95);
          transition: all 0.2s ease;
        }
        
        .kanban-drop-indicator {
          height: 3px;
          background: linear-gradient(90deg, transparent, #0264C5, transparent);
          border-radius: 2px;
          margin: 4px 0;
          animation: pulse 1s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Header mejorado */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b-2 border-gray-100">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-deep to-blue-light rounded-xl flex items-center justify-center shadow-medium">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-chatgpt-bold text-gray-900">
                  Tablero Kanban
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Arrastra y suelta las tareas para cambiar su estado
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center flex-wrap gap-2 sm:gap-3">
            {/* Botón de refrescar */}
            <button
              onClick={() => fetchTasks()}
              disabled={isLoading}
              className="px-4 py-2.5 bg-white border-2 border-gray-300 hover:border-blue-deep text-gray-700 hover:text-blue-deep rounded-xl font-chatgpt-medium transition-all duration-300 hover:scale-105 active:scale-95 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              title="Refrescar tablero"
            >
              <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline text-sm">{isLoading ? 'Actualizando...' : 'Refrescar'}</span>
            </button>
            
            {/* Botones de exportación */}
            {tasks.length > 0 && (
              <>
                <button
                  onClick={async () => {
                    try {
                      setIsExporting(true);
                      const context: any = {};
                      await exportService.exportTasksToPDF(tasks, 'Reporte de Tareas', context);
                    } catch (error: any) {
                      alert(`Error al exportar PDF: ${error.message}`);
                    } finally {
                      setIsExporting(false);
                    }
                  }}
                  disabled={isExporting}
                  className="px-4 py-2.5 bg-red-50 border-2 border-red-200 hover:border-red-400 text-red-700 hover:text-red-900 rounded-xl font-chatgpt-medium transition-all duration-300 hover:scale-105 active:scale-95 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                  title="Exportar a PDF"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline text-sm">{isExporting ? 'Exportando...' : 'PDF'}</span>
                </button>
                <button
                  onClick={() => {
                    try {
                      setIsExporting(true);
                      const context: any = {};
                      exportService.exportTasksToExcel(tasks, 'Reporte de Tareas', context);
                    } catch (error: any) {
                      alert(`Error al exportar Excel: ${error.message}`);
                    } finally {
                      setIsExporting(false);
                    }
                  }}
                  disabled={isExporting}
                  className="px-4 py-2.5 bg-green-50 border-2 border-green-200 hover:border-green-400 text-green-700 hover:text-green-900 rounded-xl font-chatgpt-medium transition-all duration-300 hover:scale-105 active:scale-95 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                  title="Exportar a Excel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden sm:inline text-sm">{isExporting ? 'Exportando...' : 'Excel'}</span>
                </button>
              </>
            )}
            <a
              href={sprintId ? `/tasks/nuevo?sprintId=${sprintId}` : userStoryId ? `/tasks/nuevo?userStoryId=${userStoryId}` : projectId ? `/tasks/nuevo?projectId=${projectId}` : '#'}
              onClick={(e) => {
                if (!projectId && !userStoryId && !sprintId) {
                  e.preventDefault();
                  alert('No hay contexto disponible para crear una tarea');
                }
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-deep to-blue-light hover:from-blue-light hover:to-blue-deep text-white rounded-xl font-chatgpt-semibold transition-all duration-300 hover:scale-105 active:scale-95 flex items-center space-x-2 shadow-medium hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-sm sm:text-base">Nueva Tarea</span>
            </a>
          </div>
        </div>

        {/* Estadísticas mejoradas con paleta IMHPA */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-5 text-center shadow-soft hover:shadow-medium transition-all duration-300 hover:scale-105 group">
            <div className="text-3xl font-chatgpt-bold text-gray-900 mb-2 group-hover:text-blue-deep transition-colors">{stats.total}</div>
            <div className="text-sm font-chatgpt-medium text-gray-600">Total</div>
          </div>
          <div className="bg-gray-50 border-2 border-gray-300 rounded-2xl p-5 text-center shadow-soft hover:shadow-medium transition-all duration-300 hover:scale-105 group">
            <div className="text-3xl font-chatgpt-bold text-gray-700 mb-2 group-hover:text-gray-900 transition-colors">{stats.todo}</div>
            <div className="text-sm font-chatgpt-medium text-gray-600">Por Hacer</div>
          </div>
          <div className="bg-blue-50 border-2 border-blue-deep/30 rounded-2xl p-5 text-center shadow-soft hover:shadow-medium transition-all duration-300 hover:scale-105 group">
            <div className="text-3xl font-chatgpt-bold text-blue-deep mb-2 group-hover:text-blue-light transition-colors">{stats.inProgress}</div>
            <div className="text-sm font-chatgpt-medium text-blue-700">En Progreso</div>
          </div>
          <div className="bg-purple-50 border-2 border-purple-400/30 rounded-2xl p-5 text-center shadow-soft hover:shadow-medium transition-all duration-300 hover:scale-105 group">
            <div className="text-3xl font-chatgpt-bold text-purple-700 mb-2 group-hover:text-purple-900 transition-colors">{stats.inReview}</div>
            <div className="text-sm font-chatgpt-medium text-purple-600">En Revisión</div>
          </div>
          <div className="bg-green-50 border-2 border-green-400/30 rounded-2xl p-5 text-center shadow-soft hover:shadow-medium transition-all duration-300 hover:scale-105 group">
            <div className="text-3xl font-chatgpt-bold text-green-700 mb-2 group-hover:text-green-900 transition-colors">{stats.completed}</div>
            <div className="text-sm font-chatgpt-medium text-green-600">Completado</div>
          </div>
          <div className="bg-yellow-50 border-2 border-yellow-sun/30 rounded-2xl p-5 text-center shadow-soft hover:shadow-medium transition-all duration-300 hover:scale-105 group">
            <div className="text-3xl font-chatgpt-bold text-yellow-sun mb-2 group-hover:text-yellow-soft transition-colors">{stats.totalHours}h</div>
            <div className="text-sm font-chatgpt-medium text-yellow-700">Estimadas</div>
            {stats.completedHours > 0 && (
              <div className="text-xs text-gray-500 mt-1">{stats.completedHours}h completadas</div>
            )}
          </div>
        </div>

        {/* Filtros mejorados */}
        <div className="bg-gradient-to-br from-cream/50 to-white border-2 border-gray-200 rounded-2xl p-5 sm:p-6 shadow-soft">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtro de Tipo */}
            <div>
              <label className="block text-sm font-chatgpt-semibold text-gray-900 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Tipo
              </label>
              <select
                value={filters.type || 'all'}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value === 'all' ? undefined : e.target.value as any }))}
                className="w-full bg-white border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-light/30 focus:border-blue-deep transition-all duration-300 text-sm font-chatgpt-normal appearance-none cursor-pointer hover:border-blue-deep"
              >
                <option value="all">Todos los tipos</option>
                <option value="DEVELOPMENT">Desarrollo</option>
                <option value="TESTING">Testing</option>
                <option value="DESIGN">Diseño</option>
                <option value="DOCUMENTATION">Documentación</option>
                <option value="BUG_FIX">Corrección de Errores</option>
                <option value="RESEARCH">Investigación</option>
                <option value="REFACTORING">Refactorización</option>
              </select>
            </div>

            {/* Filtro de Asignado */}
            <div>
              <label className="block text-sm font-chatgpt-semibold text-gray-900 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Asignado
              </label>
              <select
                value={filters.assigneeId || 'all'}
                onChange={(e) => setFilters(prev => ({ ...prev, assigneeId: e.target.value === 'all' ? undefined : Number(e.target.value) }))}
                className="w-full bg-white border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-light/30 focus:border-blue-deep transition-all duration-300 text-sm font-chatgpt-normal appearance-none cursor-pointer hover:border-blue-deep"
              >
                <option value="all">Todos los usuarios</option>
                <option value="unassigned">Sin asignar</option>
                {/* Aquí se cargarían los usuarios del proyecto */}
              </select>
            </div>

            {/* Resumen de horas mejorado */}
            <div className="sm:col-span-2 lg:col-span-2 flex items-end">
              <div className="w-full bg-gradient-to-r from-blue-deep/10 to-blue-light/10 border-2 border-blue-deep/20 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-chatgpt-medium text-gray-600 mb-1">Progreso de Horas</div>
                    <div className="text-lg font-chatgpt-bold text-gray-900">
                      <span className="text-green-600">{stats.completedHours}h</span>
                      <span className="text-gray-500 mx-2">de</span>
                      <span className="text-blue-deep">{stats.totalHours}h</span>
                    </div>
                  </div>
                  {stats.totalHours > 0 && (
                    <div className="text-right">
                      <div className="text-2xl font-chatgpt-bold text-blue-deep">
                        {Math.round((stats.completedHours / stats.totalHours) * 100)}%
                      </div>
                      <div className="text-xs text-gray-500">completado</div>
                    </div>
                  )}
                </div>
                {stats.totalHours > 0 && (
                  <div className="mt-3 w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-deep to-blue-light h-2.5 rounded-full transition-all duration-500 shadow-sm"
                      style={{ width: `${Math.min((stats.completedHours / stats.totalHours) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tablero Kanban */}
        {tasks.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-2 border-blue-200 rounded-2xl p-8 sm:p-10 max-w-lg mx-auto shadow-soft">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-deep to-blue-light rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-medium">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-chatgpt-bold text-gray-900 mb-3">
                {sprintId 
                  ? 'No hay tareas en el sprint actual' 
                  : projectId && !userStoryId 
                    ? 'Selecciona un sprint para ver tareas' 
                    : 'No hay tareas disponibles'
                }
              </h3>
              <p className="text-gray-600 mb-6 text-sm sm:text-base">
                {sprintId
                  ? 'Comienza creando tu primera tarea para este sprint.'
                  : projectId && !userStoryId
                    ? 'Las tareas se organizan por sprint. Selecciona un sprint activo para ver sus tareas.'
                    : 'Comienza creando tu primera tarea.'
                }
              </p>
              <a
                href={sprintId ? `/tasks/nuevo?sprintId=${sprintId}` : userStoryId ? `/tasks/nuevo?userStoryId=${userStoryId}` : projectId ? `/tasks/nuevo?projectId=${projectId}` : '#'}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-deep to-blue-light hover:from-blue-light hover:to-blue-deep text-white rounded-xl font-chatgpt-semibold transition-all duration-300 shadow-medium hover:shadow-lg hover:scale-105 active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Crear Primera Tarea</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {kanbanColumns.map((column) => {
              const isDragOver = dragState?.targetColumn === column.id && dragState?.isOverColumn;
              
              return (
                <div
                  key={column.id}
                  className={`bg-white border-2 rounded-2xl p-5 sm:p-6 min-h-[500px] transition-all duration-300 ${
                    column.color
                  } ${
                    isDragOver ? 'kanban-column-drag-over shadow-xl scale-[1.02]' : 'hover:shadow-lg'
                  }`}
                  onDragOver={(e) => handleDragOverColumn(e, column.id)}
                  onDragLeave={handleDragLeaveColumn}
                  onDrop={(e) => handleDropColumn(e, column.id)}
                >
                  {/* Header de la columna mejorado */}
                  <div className="flex items-center justify-between mb-5 pb-4 border-b-2 border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-soft ${
                        column.id === 'TODO' ? 'bg-gray-100 text-gray-700' :
                        column.id === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-deep' :
                        column.id === 'IN_REVIEW' ? 'bg-purple-100 text-purple-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {column.icon}
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-chatgpt-bold text-gray-900">{column.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {column.tasks.length === 1 ? '1 tarea' : `${column.tasks.length} tareas`}
                        </p>
                      </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl text-sm font-chatgpt-bold shadow-soft ${
                      column.id === 'TODO' ? 'bg-gray-200 text-gray-800' :
                      column.id === 'IN_PROGRESS' ? 'bg-blue-deep text-white' :
                      column.id === 'IN_REVIEW' ? 'bg-purple-600 text-white' :
                      'bg-green-600 text-white'
                    }`}>
                      {column.tasks.length}
                    </div>
                  </div>

                  {/* Botón para agregar tarea mejorado */}
                  <a 
                    href={sprintId ? `/tasks/nuevo?sprintId=${sprintId}` : userStoryId ? `/tasks/nuevo?userStoryId=${userStoryId}` : projectId ? `/tasks/nuevo?projectId=${projectId}` : '#'}
                    className="w-full mb-4 p-3.5 border-2 border-dashed border-gray-300 hover:border-blue-deep hover:bg-blue-50 rounded-xl text-gray-600 hover:text-blue-deep transition-all duration-300 flex items-center justify-center gap-2 group"
                  >
                    <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="text-sm font-chatgpt-medium">Agregar tarea</span>
                  </a>

                  {/* Lista de tareas */}
                  <div className="space-y-3">
                    {column.tasks.map((task, index) => {
                      const isDraggingThis = dragState?.task.id === task.id;
                      const isDropTarget = dragState?.targetIndex === index && dragState?.targetColumn === column.id;
                      
                      return (
                        <React.Fragment key={task.id}>
                          {/* Indicador de drop */}
                          {isDropTarget && dragState && dragState.task.id !== task.id && (
                            <div className="kanban-drop-indicator" />
                          )}
                          
                          <div
                            className={`kanban-task-enter ${
                              isDraggingThis ? 'kanban-task-dragging' : ''
                            }`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOverTask(e, task.id, column.id)}
                            onDrop={(e) => handleDropTask(e, task.id, column.id)}
                          >
                            <TaskCard
                              task={task}
                              isDragging={isDraggingThis}
                              onUpdate={() => {
                                // Refrescar las tareas después de una actualización
                                setFilters(prev => ({ ...prev }));
                              }}
                            />
                          </div>
                        </React.Fragment>
                      );
                    })}
                    
                    {/* Indicador de drop al final de la columna */}
                    {dragState?.targetColumn === column.id && 
                     dragState?.isOverColumn && 
                     dragState?.targetIndex === null && 
                     column.tasks.length > 0 && (
                      <div className="kanban-drop-indicator" />
                    )}
                  </div>

                  {/* Estadísticas de la columna mejoradas */}
                  {column.tasks.length > 0 && (
                    <div className="mt-5 pt-4 border-t-2 border-gray-200">
                      <div className="text-xs font-chatgpt-medium text-gray-600 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Tareas:
                          </span>
                          <span className="font-chatgpt-bold text-gray-900">{column.tasks.length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Horas:
                          </span>
                          <span className="font-chatgpt-bold text-gray-900">
                            {column.tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0)}h
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default KanbanBoard;
