import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { scrumService } from '../../../services/scrumService';
import type { RoadmapItem } from '../../../types/roadmap';
import LoadingSpinner from '../common/LoadingSpinner';
import { ErrorState } from '../../ui/ErrorState';
import StatusBadge from '../common/StatusBadge';
import PriorityBadge from '../common/PriorityBadge';

interface RoadmapViewProps {
  projectId: number;
  startDate?: Date;
  endDate?: Date;
  viewMode?: 'month' | 'quarter' | 'year';
}

const RoadmapView: React.FC<RoadmapViewProps> = ({
  projectId,
  startDate,
  endDate,
  viewMode: initialViewMode = 'quarter',
}) => {
  const { t } = useTranslation();
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'quarter' | 'year'>(initialViewMode);
  const [zoom, setZoom] = useState(1);
  const [selectedEpic, setSelectedEpic] = useState<number | null>(null);
  const [hoveredEpic, setHoveredEpic] = useState<number | null>(null);

  useEffect(() => {
    loadRoadmap();
  }, [projectId]);

  const loadRoadmap = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await scrumService.getRoadmap(projectId);
      if (response.success && response.data) {
        setRoadmap(response.data.roadmap);
      }
    } catch (err: any) {
      setError(err.message || t('roadmap.loadError', 'Error al cargar roadmap'));
    } finally {
      setLoading(false);
    }
  };

  // Calcular rango de fechas del timeline
  const timelineRange = useMemo(() => {
    const allDates = roadmap
      .flatMap((item) => [item.estimatedStart, item.estimatedEnd])
      .filter(Boolean) as string[];

    if (allDates.length === 0) {
      const today = new Date();
      return {
        start: startDate || new Date(today.getFullYear(), today.getMonth(), 1),
        end: endDate || new Date(today.getFullYear(), today.getMonth() + 3, 0),
      };
    }

    const minDate = new Date(Math.min(...allDates.map((d) => new Date(d).getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => new Date(d).getTime())));

    // Extender el rango un poco para mejor visualización
    const paddingDays = 7;
    const timelineStart = startDate || new Date(minDate);
    timelineStart.setDate(timelineStart.getDate() - paddingDays);
    
    const timelineEnd = endDate || new Date(maxDate);
    timelineEnd.setDate(timelineEnd.getDate() + paddingDays);

    return { start: timelineStart, end: timelineEnd };
  }, [roadmap, startDate, endDate]);

  const totalDays = Math.ceil(
    (timelineRange.end.getTime() - timelineRange.start.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calcular posición y ancho de una épica en el timeline
  const getEpicPosition = (epic: RoadmapItem) => {
    if (!epic.estimatedStart || !epic.estimatedEnd) {
      return null;
    }

    const startDate = new Date(epic.estimatedStart);
    const endDate = new Date(epic.estimatedEnd);
    
    const daysFromStart = Math.ceil(
      (startDate.getTime() - timelineRange.start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const duration = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const leftPercent = Math.max(0, (daysFromStart / totalDays) * 100);
    const widthPercent = Math.max(2, (duration / totalDays) * 100);

    return { left: leftPercent, width: widthPercent };
  };

  // Generar marcadores de tiempo para el header
  const timeMarkers = useMemo(() => {
    const markers: Array<{ date: Date; label: string; position: number }> = [];
    const current = new Date(timelineRange.start);
    const end = new Date(timelineRange.end);

    // Agregar marcador inicial
    markers.push({
      date: new Date(current),
      label: current.toLocaleDateString(t('common.locale', 'es-ES') as string, { day: 'numeric', month: 'short' }),
      position: 0,
    });

    // Generar marcadores según el modo de vista
    while (current <= end) {
      const daysFromStart = Math.ceil(
        (current.getTime() - timelineRange.start.getTime()) / (1000 * 60 * 60 * 24)
      );
      const position = (daysFromStart / totalDays) * 100;

      let label = '';
      let shouldAdd = false;

      if (viewMode === 'month') {
        // Cada semana o inicio de mes
        if (current.getDay() === 1 || current.getDate() === 1) {
          label = current.toLocaleDateString(t('common.locale', 'es-ES') as string, { day: 'numeric', month: 'short' });
          shouldAdd = true;
        }
      } else if (viewMode === 'quarter') {
        // Cada mes o cada 2 semanas
        if (current.getDate() === 1) {
          label = current.toLocaleDateString(t('common.locale', 'es-ES') as string, { month: 'long', year: 'numeric' });
          shouldAdd = true;
        } else if (current.getDate() === 15) {
          label = current.toLocaleDateString(t('common.locale', 'es-ES') as string, { day: 'numeric', month: 'short' });
          shouldAdd = true;
        }
      } else {
        // Vista anual: cada mes o cada trimestre dependiendo del rango
        const monthsDiff = (end.getFullYear() - timelineRange.start.getFullYear()) * 12 + 
                          (end.getMonth() - timelineRange.start.getMonth());
        
        if (monthsDiff <= 6) {
          // Si el rango es menor a 6 meses, mostrar cada mes
          if (current.getDate() === 1) {
            label = current.toLocaleDateString(t('common.locale', 'es-ES') as string, { month: 'long', year: 'numeric' });
            shouldAdd = true;
          }
        } else if (monthsDiff <= 12) {
          // Si el rango es menor a 12 meses, mostrar cada mes o cada 2 meses
          if (current.getDate() === 1 && (current.getMonth() % 2 === 0 || current.getMonth() === timelineRange.start.getMonth())) {
            label = current.toLocaleDateString(t('common.locale', 'es-ES') as string, { month: 'long', year: 'numeric' });
            shouldAdd = true;
          }
        } else {
          // Si el rango es mayor a 12 meses, mostrar cada trimestre
          if (current.getMonth() % 3 === 0 && current.getDate() === 1) {
            label = current.toLocaleDateString(t('common.locale', 'es-ES') as string, { month: 'long', year: 'numeric' });
            shouldAdd = true;
          }
        }
      }

      if (shouldAdd && label) {
        // Evitar duplicados muy cercanos
        const existing = markers.find(m => Math.abs(m.position - position) < 2);
        if (!existing) {
          markers.push({ date: new Date(current), label, position });
        }
      }

      current.setDate(current.getDate() + 1);
    }

    // Agregar marcador final
    const endDaysFromStart = Math.ceil(
      (end.getTime() - timelineRange.start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const endPosition = Math.min(100, (endDaysFromStart / totalDays) * 100);
    markers.push({
      date: new Date(end),
      label: end.toLocaleDateString(t('common.locale', 'es-ES') as string, { day: 'numeric', month: 'short' }),
      position: endPosition,
    });

    // Ordenar por posición y eliminar duplicados muy cercanos
    return markers
      .sort((a, b) => a.position - b.position)
      .filter((marker, idx, arr) => {
        if (idx === 0 || idx === arr.length - 1) return true;
        const prev = arr[idx - 1];
        return Math.abs(marker.position - prev.position) >= 3;
      });
  }, [timelineRange, totalDays, viewMode]);

  // Obtener color según estado y prioridad
  const getEpicColor = (epic: RoadmapItem) => {
    if (epic.status === 'COMPLETED') {
      return 'bg-green-500';
    }
    if (epic.status === 'IN_PROGRESS') {
      return 'bg-blue-500';
    }
    if (epic.status === 'READY') {
      return 'bg-indigo-500';
    }
    return 'bg-gray-400';
  };

  // Obtener color de borde según prioridad
  const getEpicBorderColor = (epic: RoadmapItem) => {
    switch (epic.priority) {
      case 'CRITICAL':
        return 'border-red-500';
      case 'HIGH':
        return 'border-orange-500';
      case 'MEDIUM':
        return 'border-yellow-500';
      default:
        return 'border-gray-300';
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
    return <ErrorState message={error} onRetry={loadRoadmap} />;
  }

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t('roadmap.projectRoadmap', 'Roadmap del Proyecto')}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('roadmap.viewOf', 'Vista de')} {viewMode === 'month' ? t('roadmap.monthly', 'mensual') : viewMode === 'quarter' ? t('roadmap.quarterly', 'trimestral') : t('roadmap.yearly', 'anual')}
            </p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">{t('roadmap.view', 'Vista')}:</label>
              <select
                value={viewMode}
                onChange={(e) => {
                  setViewMode(e.target.value as 'month' | 'quarter' | 'year');
                }}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="month">{t('roadmap.monthly', 'Mensual')}</option>
                <option value="quarter">{t('roadmap.quarterly', 'Trimestral')}</option>
                <option value="year">{t('roadmap.yearly', 'Anual')}</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">{t('roadmap.zoom', 'Zoom')}:</label>
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                  className="px-3 py-1.5 bg-white hover:bg-gray-50 rounded text-sm font-medium transition-colors shadow-sm"
                  disabled={zoom <= 0.5}
                >
                  −
                </button>
                <span className="text-sm text-gray-700 w-16 text-center font-medium">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                  className="px-3 py-1.5 bg-white hover:bg-gray-50 rounded text-sm font-medium transition-colors shadow-sm"
                  disabled={zoom >= 3}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Container */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {/* Timeline Header con fechas */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-4 sticky top-0 z-20">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {t('roadmap.projectTimeline', 'Línea de Tiempo del Proyecto')}
            </h3>
            <p className="text-xs text-gray-600 ml-6">
              {t('roadmap.from', 'Desde')} <span className="font-semibold text-indigo-700">{timelineRange.start.toLocaleDateString(t('common.locale', 'es-ES') as string, { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}</span> {t('roadmap.to', 'hasta')} <span className="font-semibold text-indigo-700">{timelineRange.end.toLocaleDateString(t('common.locale', 'es-ES') as string, { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}</span>
            </p>
          </div>
          
          {/* Línea de tiempo visual */}
          <div 
            className="relative bg-white rounded-lg border-2 border-indigo-200 p-3 shadow-inner overflow-x-auto" 
            style={{ height: '60px' }}
          >
            <div 
              className="relative min-w-full"
              style={{ 
                width: `${100 * zoom}%`,
                transform: zoom > 1 ? 'scale(1)' : 'scale(1)',
              }}
            >
            {/* Línea de tiempo base */}
            <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-300 via-purple-300 to-indigo-300 rounded-full transform -translate-y-1/2"></div>
            
            {/* Marcadores de tiempo */}
            {timeMarkers.map((marker, idx) => (
              <div
                key={idx}
                className="absolute top-0 bottom-0 flex flex-col items-center justify-center"
                style={{ left: `${marker.position}%`, transform: 'translateX(-50%)' }}
              >
                {/* Línea vertical */}
                <div className="w-0.5 h-full bg-gray-300 opacity-50"></div>
                {/* Punto en la línea */}
                <div className="absolute top-1/2 w-3 h-3 bg-indigo-600 rounded-full border-2 border-white shadow-md transform -translate-y-1/2 z-10"></div>
                {/* Etiqueta de fecha */}
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-700 font-bold whitespace-nowrap bg-white px-2 py-1 rounded-md border border-indigo-200 shadow-sm">
                  {marker.label}
                </div>
              </div>
            ))}
            
            {/* Indicador de "Hoy" */}
            {(() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const timelineStart = new Date(timelineRange.start);
              timelineStart.setHours(0, 0, 0, 0);
              const timelineEnd = new Date(timelineRange.end);
              timelineEnd.setHours(23, 59, 59, 999);
              
              if (today >= timelineStart && today <= timelineEnd) {
                const daysFromStart = Math.ceil(
                  (today.getTime() - timelineRange.start.getTime()) / (1000 * 60 * 60 * 24)
                );
                const position = Math.max(0, Math.min(100, (daysFromStart / totalDays) * 100));
                return (
                  <div
                    className="absolute top-0 bottom-0 flex flex-col items-center justify-center z-20"
                    style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                  >
                    <div className="w-1 h-full bg-red-500 shadow-lg"></div>
                    <div className="absolute top-1/2 w-4 h-4 bg-red-500 rounded-full border-3 border-white shadow-xl transform -translate-y-1/2 animate-pulse"></div>
                    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 text-xs text-red-600 font-bold whitespace-nowrap bg-white px-2 py-1 rounded-md border-2 border-red-300 shadow-lg">
                      ⚡ {t('roadmap.today', 'Hoy')}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            </div>
          </div>
          
          {/* Explicación */}
          <div className="mt-3 text-xs text-gray-500 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-indigo-600 rounded-full border border-white shadow-sm"></div>
              <span>{t('roadmap.timeMarkers', 'Marcadores de tiempo')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
              <span>{t('roadmap.currentDate', 'Fecha actual')}</span>
            </div>
            <div className="text-gray-400">|</div>
            <div className="text-gray-600">
              {t('roadmap.colorBarsDesc', 'Las barras de colores abajo representan las épicas del proyecto')}
            </div>
          </div>
        </div>

        {/* Timeline Body con épicas */}
        <div className="p-6" style={{ overflowX: zoom > 1 ? 'auto' : 'visible' }}>
          <div style={{ width: `${100 * zoom}%`, minWidth: '100%' }}>
            {roadmap.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 18.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V5.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('roadmap.noEpicsWithDates', 'No hay épicas con fechas')}</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                {t('roadmap.addDatesDesc', 'Agrega fechas de inicio y fin a las tareas para visualizarlas en el roadmap.')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {roadmap.map((epic) => {
                const position = getEpicPosition(epic);
                const progress = epic.storyCount > 0
                  ? (epic.completedStories / epic.storyCount) * 100
                  : 0;
                const isSelected = selectedEpic === epic.id;
                const isHovered = hoveredEpic === epic.id;

                if (!position) {
                  // Épica sin fechas - mostrar como lista
                  return (
                    <div
                      key={epic.id}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedEpic(selectedEpic === epic.id ? null : epic.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-3 h-3 rounded-full ${getEpicColor(epic)} flex-shrink-0`}></div>
                          <h4 className="font-semibold text-gray-900 truncate">{epic.title}</h4>
                          <StatusBadge status={epic.status} type="epic" size="sm" />
                          <PriorityBadge priority={epic.priority} size="sm" />
                        </div>
                        <div className="text-sm text-gray-500 ml-4">
                          {epic.completedStories}/{epic.storyCount} {t('roadmap.stories', 'historias')}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 ml-6">
                        {t('roadmap.noEstimatedDates', 'Sin fechas estimadas')}
                      </p>
                    </div>
                  );
                }

                return (
                  <div
                    key={epic.id}
                    className="relative"
                    style={{ height: '80px' }}
                    onMouseEnter={() => setHoveredEpic(epic.id)}
                    onMouseLeave={() => setHoveredEpic(null)}
                  >
                    {/* Barra de épica en el timeline */}
                    <div
                      className={`absolute top-0 rounded-lg border-2 ${getEpicBorderColor(epic)} ${
                        isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
                      } ${isHovered ? 'shadow-lg scale-105' : 'shadow-md'} transition-all duration-200 cursor-pointer overflow-hidden`}
                      style={{
                        left: `${position.left}%`,
                        width: `${position.width}%`,
                        height: '64px',
                        minWidth: '120px',
                      }}
                      onClick={() => setSelectedEpic(selectedEpic === epic.id ? null : epic.id)}
                    >
                      {/* Barra de progreso de fondo */}
                      <div className={`absolute inset-0 ${getEpicColor(epic)} opacity-20`}></div>
                      
                      {/* Progreso completado */}
                      <div
                        className={`absolute bottom-0 left-0 ${getEpicColor(epic)} transition-all duration-300`}
                        style={{
                          height: `${progress}%`,
                          width: '100%',
                        }}
                      ></div>

                      {/* Contenido de la épica */}
                      <div className="absolute inset-0 p-3 flex flex-col justify-between z-10">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-white text-sm truncate drop-shadow-lg">
                              {epic.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <StatusBadge status={epic.status} type="epic" size="sm" />
                              <PriorityBadge priority={epic.priority} size="sm" />
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-white drop-shadow-lg">
                          <span className="font-medium">
                            {epic.completedStories}/{epic.storyCount} {t('roadmap.stories', 'historias')}
                          </span>
                          <span className="opacity-90">
                            {Math.round(progress)}%
                          </span>
                        </div>
                      </div>

                      {/* Tooltip en hover */}
                      {isHovered && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-30">
                          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-xl whitespace-nowrap">
                            <div className="font-semibold mb-1">{epic.title}</div>
                            <div className="text-gray-300">
                              {epic.estimatedStart
                                ? new Date(epic.estimatedStart).toLocaleDateString(t('common.locale', 'es-ES') as string)
                                : t('roadmap.noDate', 'Sin fecha')} -{' '}
                              {epic.estimatedEnd
                                ? new Date(epic.estimatedEnd).toLocaleDateString(t('common.locale', 'es-ES') as string)
                                : t('roadmap.noDate', 'Sin fecha')}
                            </div>
                            <div className="text-gray-400 mt-1">
                              {epic.completedStories} {t('roadmap.of', 'de')} {epic.storyCount} {t('roadmap.storiesCompleted', 'historias completadas')}
                            </div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                              <div className="border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Línea de tiempo de referencia */}
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200"></div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Leyenda */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-gray-700">{t('roadmap.completed', 'Completada')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-gray-700">{t('roadmap.inProgress', 'En Progreso')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-indigo-500 rounded"></div>
            <span className="text-gray-700">{t('roadmap.ready', 'Lista')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-400 rounded"></div>
            <span className="text-gray-700">{t('roadmap.draft', 'Borrador')}</span>
          </div>
          <div className="ml-auto flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 border-2 border-red-500 rounded"></div>
              <span>{t('roadmap.critical', 'Crítica')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 border-2 border-orange-500 rounded"></div>
              <span>{t('roadmap.high', 'Alta')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 border-2 border-yellow-500 rounded"></div>
              <span>{t('roadmap.medium', 'Media')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detalle de épica seleccionada */}
      {selectedEpic && (() => {
        const epic = roadmap.find((e) => e.id === selectedEpic);
        if (!epic) return null;
        
        return (
          <div className="bg-white border border-indigo-200 rounded-lg p-6 shadow-lg">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{epic.title}</h3>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={epic.status} type="epic" />
                    <PriorityBadge priority={epic.priority} />
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEpic(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {epic.description && (
                <p className="text-gray-600 mb-4">{epic.description}</p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">{t('roadmap.dates', 'Fechas')}</div>
                  <div className="text-sm font-medium text-gray-900">
                    {epic.estimatedStart && epic.estimatedEnd
                      ? `${new Date(epic.estimatedStart).toLocaleDateString(t('common.locale', 'es-ES') as string)} - ${new Date(epic.estimatedEnd).toLocaleDateString(t('common.locale', 'es-ES') as string)}`
                      : t('roadmap.noDates', 'Sin fechas')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">{t('roadmap.stories', 'Historias')}</div>
                  <div className="text-sm font-medium text-gray-900">
                    {epic.completedStories} / {epic.storyCount}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">{t('roadmap.progress', 'Progreso')}</div>
                  <div className="text-sm font-medium text-gray-900">
                    {Math.round((epic.completedStories / epic.storyCount) * 100) || 0}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">{t('roadmap.estimatedDuration', 'Duración estimada')}</div>
                  <div className="text-sm font-medium text-gray-900">
                    {epic.estimatedStart && epic.estimatedEnd
                      ? `${Math.ceil((new Date(epic.estimatedEnd).getTime() - new Date(epic.estimatedStart).getTime()) / (1000 * 60 * 60 * 24))} ${t('roadmap.days', 'días')}`
                      : t('roadmap.notAvailable', 'N/A')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default RoadmapView;
