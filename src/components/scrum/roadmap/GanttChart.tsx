import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { scrumService } from '../../../services/scrumService';
import type { GanttData, GanttTask, CriticalPath } from '../../../types/roadmap';
import LoadingSpinner from '../common/LoadingSpinner';
import { ErrorState } from '../../ui/ErrorState';
import StatusBadge from '../common/StatusBadge';
import PriorityBadge from '../common/PriorityBadge';

interface GanttChartProps {
  projectId: number;
  sprintId?: number;
  showDependencies?: boolean;
  showCriticalPath?: boolean;
}

const GanttChart: React.FC<GanttChartProps> = ({
  projectId,
  sprintId,
  showDependencies: initialShowDependencies = true,
  showCriticalPath: initialShowCriticalPath = false,
}) => {
  const { t } = useTranslation();
  const [ganttData, setGanttData] = useState<GanttData | null>(null);
  const [criticalPath, setCriticalPath] = useState<CriticalPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showDependencies, setShowDependencies] = useState(initialShowDependencies);
  const [showCriticalPath, setShowCriticalPath] = useState(initialShowCriticalPath);
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadGanttData();
  }, [projectId, sprintId]);

  useEffect(() => {
    if (showCriticalPath) {
      loadCriticalPath();
    }
  }, [showCriticalPath, projectId]);

  const loadGanttData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await scrumService.getGanttData(projectId, sprintId);
      if (response.success && response.data) {
        setGanttData(response.data);
      }
    } catch (err: any) {
      setError(err.message || t('gantt.loadError', 'Error al cargar datos de Gantt'));
    } finally {
      setLoading(false);
    }
  };

  const loadCriticalPath = async () => {
    try {
      const response = await scrumService.getCriticalPath(projectId);
      if (response.success && response.data) {
        setCriticalPath(response.data);
      }
    } catch (err) {
      console.error('Error al cargar critical path:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadGanttData} />;
  }

  if (!ganttData || !ganttData.tasks || ganttData.tasks.length === 0) {
    return (
      <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('gantt.noTasksWithDates', 'No hay tareas con fechas')}</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          {t('gantt.addDatesDesc', 'Agrega fechas de inicio y fin a las tareas para visualizarlas en el diagrama de Gantt.')}
        </p>
      </div>
    );
  }

  // Calcular rango de fechas
  const allDates = [
    ...ganttData.tasks.flatMap((t) => [t.startDate, t.dueDate]),
    ...(ganttData.sprints || []).flatMap((s) => [s.startDate, s.endDate]),
  ].filter(Boolean) as string[];

  const minDate = allDates.length > 0
    ? new Date(Math.min(...allDates.map((d) => new Date(d).getTime())))
    : new Date();
  const maxDate = allDates.length > 0
    ? new Date(Math.max(...allDates.map((d) => new Date(d).getTime())))
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Extender un poco el rango para mejor visualización
  minDate.setDate(minDate.getDate() - 3);
  maxDate.setDate(maxDate.getDate() + 3);

  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
  const baseWidth = 1400;
  const dayWidth = (baseWidth * zoom) / totalDays;

  const getXPosition = (date: string | undefined) => {
    if (!date) return 0;
    const dateObj = new Date(date);
    const daysFromStart = Math.ceil((dateObj.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysFromStart * dayWidth);
  };

  const getWidth = (start: string | undefined, end: string | undefined) => {
    if (!start || !end) return dayWidth * 2;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(dayWidth * 0.5, days * dayWidth);
  };

  const isCritical = (taskId: number) => {
    return showCriticalPath && criticalPath
      ? criticalPath.criticalPath.some((item) => item.id === taskId)
      : false;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500';
      case 'IN_PROGRESS':
        return 'bg-blue-500';
      case 'IN_REVIEW':
        return 'bg-yellow-500';
      case 'TESTING':
        return 'bg-purple-500';
      default:
        return 'bg-gray-400';
    }
  };

  // Generar semanas para el header
  const weeks: Array<{ start: Date; end: Date; label: string }> = [];
  const currentWeek = new Date(minDate);
  while (currentWeek <= maxDate) {
    const weekStart = new Date(currentWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const weekNum = getWeekNumber(weekStart);
    weeks.push({
      start: new Date(weekStart),
      end: weekEnd,
      label: `${t('gantt.week', 'Sem')} ${weekNum}`,
    });
    
    currentWeek.setDate(currentWeek.getDate() + 7);
  }

  function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  const taskRowHeight = 50;
  const sidebarWidth = 300;

  return (
    <div className="space-y-4">
      {/* Header con controles */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t('gantt.title', 'Diagrama de Gantt')}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('gantt.subtitle', 'Visualización temporal de tareas y dependencias')}
            </p>
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDependencies}
                  onChange={(e) => setShowDependencies(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-sm text-gray-700 font-medium">{t('gantt.dependencies', 'Dependencias')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCriticalPath}
                  onChange={(e) => {
                    setShowCriticalPath(e.target.checked);
                    if (e.target.checked && !criticalPath) {
                      loadCriticalPath();
                    }
                  }}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-sm text-gray-700 font-medium">{t('gantt.criticalPath', 'Critical Path')}</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">{t('gantt.zoom', 'Zoom')}:</label>
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                  className="px-3 py-1.5 bg-white hover:bg-gray-50 rounded text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={zoom <= 0.5}
                >
                  −
                </button>
                <span className="text-sm text-gray-700 w-16 text-center font-medium">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                  className="px-3 py-1.5 bg-white hover:bg-gray-50 rounded text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={zoom >= 3}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Diagrama de Gantt */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div 
          ref={scrollContainerRef}
          className="overflow-x-auto overflow-y-auto"
          style={{ maxHeight: '600px' }}
        >
          <div style={{ width: `${sidebarWidth + baseWidth * zoom}px`, minHeight: '400px' }}>
            {/* Timeline header */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-indigo-200 z-20" style={{ marginLeft: `${sidebarWidth}px` }}>
              <div className="flex border-b border-gray-300">
                {weeks.map((week, idx) => {
                  const weekWidth = Math.ceil((week.end.getTime() - week.start.getTime()) / (1000 * 60 * 60 * 24) + 1) * dayWidth;
                  return (
                    <div
                      key={idx}
                      className="border-r border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 bg-white/50"
                      style={{ width: `${weekWidth}px`, minWidth: `${weekWidth}px` }}
                    >
                      <div className="text-center">{week.label}</div>
                      <div className="text-center text-xs text-gray-500 mt-1">
                        {week.start.toLocaleDateString(t('common.locale', 'es-ES') as string, { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tareas */}
            <div className="relative">
              {ganttData.tasks.map((task, index) => {
                const x = getXPosition(task.startDate);
                const width = getWidth(task.startDate, task.dueDate);
                const critical = isCritical(task.id);
                const isSelected = selectedTask === task.id;

                return (
                  <div
                    key={task.id}
                    className="relative border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    style={{ height: `${taskRowHeight}px` }}
                  >
                    {/* Sidebar con nombre de tarea */}
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-white border-r border-gray-200 flex items-center px-4 z-10"
                      style={{ width: `${sidebarWidth}px` }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 text-sm truncate">
                            {task.title}
                          </h4>
                          {critical && (
                            <span className="flex-shrink-0 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                              CP
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={task.status as any} type="task" size="sm" />
                          {task.priority && (
                            <PriorityBadge priority={task.priority} size="sm" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Barra de tarea en el timeline */}
                    <div
                      className="absolute top-0 bottom-0 flex items-center"
                      style={{ left: `${sidebarWidth}px`, right: 0 }}
                    >
                      {task.startDate && task.dueDate ? (
                        <div
                          className={`absolute rounded-lg ${getStatusColor(task.status)} ${
                            critical ? 'ring-2 ring-red-500 ring-offset-1' : ''
                          } ${
                            isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
                          } flex items-center px-3 text-white text-xs font-medium shadow-md hover:shadow-lg transition-all cursor-pointer h-8`}
                          style={{
                            left: `${x}px`,
                            width: `${width}px`,
                            minWidth: '60px',
                          }}
                          onClick={() => setSelectedTask(isSelected ? null : task.id)}
                          title={`${task.title}\n${task.startDate ? new Date(task.startDate).toLocaleDateString(t('common.locale', 'es-ES') as string) : t('gantt.noDate', 'Sin fecha')} - ${task.dueDate ? new Date(task.dueDate).toLocaleDateString(t('common.locale', 'es-ES') as string) : t('gantt.noDate', 'Sin fecha')}`}
                        >
                          <span className="truncate flex-1">{task.title}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 italic px-4">
                          {t('gantt.noDatesAssigned', 'Sin fechas asignadas')}
                        </div>
                      )}

                      {/* Dependencias */}
                      {showDependencies && task.dependencies && task.dependencies.length > 0 && (
                        <svg
                          className="absolute inset-0 pointer-events-none"
                          style={{ height: `${taskRowHeight}px`, width: `${baseWidth * zoom}px` }}
                        >
                          {task.dependencies.map((dep, depIndex) => {
                            const depTask = ganttData.tasks.find((t) => t.id === dep.dependsOnId);
                            if (!depTask || !depTask.dueDate || !task.startDate) return null;

                            const startX = getXPosition(depTask.dueDate);
                            const endX = getXPosition(task.startDate);
                            const midY = taskRowHeight / 2;

                            if (startX >= endX) return null; // Solo mostrar si hay espacio

                            return (
                              <g key={depIndex}>
                                <line
                                  x1={startX}
                                  y1={midY}
                                  x2={endX}
                                  y2={midY}
                                  stroke="#6366f1"
                                  strokeWidth="2"
                                  strokeDasharray="4,4"
                                  markerEnd="url(#arrowhead)"
                                />
                              </g>
                            );
                          })}
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Definir arrowhead marker para dependencias */}
              <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill="#6366f1" />
                  </marker>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Leyenda */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="font-semibold text-gray-700">{t('gantt.legend', 'Leyenda')}:</div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded shadow-sm"></div>
            <span className="text-gray-700">{t('gantt.completed', 'Completada')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded shadow-sm"></div>
            <span className="text-gray-700">{t('gantt.inProgress', 'En Progreso')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded shadow-sm"></div>
            <span className="text-gray-700">{t('gantt.inReview', 'En Revisión')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded shadow-sm"></div>
            <span className="text-gray-700">{t('gantt.testing', 'Testing')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-400 rounded shadow-sm"></div>
            <span className="text-gray-700">{t('gantt.pending', 'Pendiente')}</span>
          </div>
          {showDependencies && (
            <div className="flex items-center gap-2">
              <svg width="20" height="4" className="text-indigo-600">
                <line x1="0" y1="2" x2="20" y2="2" stroke="#6366f1" strokeWidth="2" strokeDasharray="4,4" />
              </svg>
              <span className="text-gray-700">{t('gantt.dependencies', 'Dependencias')}</span>
            </div>
          )}
          {showCriticalPath && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-red-500 rounded shadow-sm"></div>
              <span className="text-gray-700">{t('gantt.criticalPath', 'Critical Path')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GanttChart;

