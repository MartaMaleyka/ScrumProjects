import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectMetrics } from '../../../types/scrum';
import LoadingSpinner from '../common/LoadingSpinner';

interface ProjectAnalyticsProps {
  metrics: ProjectMetrics | null;
  isLoading?: boolean;
}

type TimeFilter = 'all' | 'week' | 'month' | 'quarter' | 'year';
type ViewMode = 'summary' | 'detailed' | 'comparative';
type ChartVisibility = {
  epics: boolean;
  stories: boolean;
  tasks: boolean;
  priority: boolean;
  velocity: boolean;
  hours: boolean;
};

const ProjectAnalytics: React.FC<ProjectAnalyticsProps> = ({ metrics, isLoading }) => {
  const { t } = useTranslation();
  const [animatedValues, setAnimatedValues] = useState<Record<string, number>>({});
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [hoveredPieSegment, setHoveredPieSegment] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [chartVisibility, setChartVisibility] = useState<ChartVisibility>({
    epics: true,
    stories: true,
    tasks: true,
    priority: true,
    velocity: true,
    hours: true
  });
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  // Animación de entrada para valores
  useEffect(() => {
    if (!metrics) return;

    const timer = setTimeout(() => {
      const newValues: Record<string, number> = {};
      
      // Animar barras
      Object.entries(metrics.epics.byStatus).forEach(([key, value]) => {
        newValues[`epic-${key}`] = value;
      });
      Object.entries(metrics.userStories.byStatus).forEach(([key, value]) => {
        newValues[`story-${key}`] = value;
      });
      Object.entries(metrics.tasks.byStatus).forEach(([key, value]) => {
        newValues[`task-${key}`] = value;
      });
      Object.entries(metrics.userStories.byPriority).forEach(([key, value]) => {
        newValues[`priority-${key}`] = value;
      });

      setAnimatedValues(newValues);
    }, 100);

    return () => clearTimeout(timer);
  }, [metrics]);
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" text={t('analytics.loading', 'Cargando analíticas...')} />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 max-w-md mx-auto">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('analytics.noData', 'No hay datos disponibles')}</h3>
          <p className="text-gray-500">{t('analytics.noDataDesc', 'Las analíticas se mostrarán cuando haya datos del proyecto')}</p>
        </div>
      </div>
    );
  }

  // Gráfico de barras para distribución por estado
  const renderStatusBarChart = (
    title: string,
    data: Record<string, number>,
    colors: Record<string, string>,
    labels: Record<string, string>,
    prefix: string = ''
  ) => {
    const entries = Object.entries(data).filter(([_, value]) => value > 0);
    if (entries.length === 0) return null;

    const maxValue = Math.max(...entries.map(([_, value]) => value), 1);
    const chartHeight = 240;
    const total = entries.reduce((sum, [_, value]) => sum + value, 0);

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-[1.01] overflow-visible">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          {title}
        </h3>
        <div className="space-y-4 overflow-visible">
          <div className="flex items-end gap-4 justify-center overflow-visible" style={{ height: `${chartHeight + 60}px`, paddingTop: '60px' }}>
            {entries.map(([key, value], index) => {
              const animatedValue = animatedValues[`${prefix}-${key}`] || 0;
              const barHeight = maxValue > 0 ? (animatedValue / maxValue) * chartHeight : 0;
              const color = colors[key] || '#6366f1';
              const label = labels[key] || key;
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
              const isHovered = hoveredBar === `${prefix}-${key}`;

              return (
                <div 
                  key={key} 
                  className="flex flex-col items-center gap-3 flex-1 group"
                  onMouseEnter={() => setHoveredBar(`${prefix}-${key}`)}
                  onMouseLeave={() => setHoveredBar(null)}
                  style={{ 
                    animationDelay: `${index * 100}ms`,
                    animation: 'fadeInUp 0.6s ease-out forwards'
                  }}
                >
                  <div className="relative w-full flex items-end justify-center overflow-visible" style={{ height: `${chartHeight}px` }}>
                    {/* Tooltip mejorado */}
                    {isHovered && (
                      <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 z-20 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap animate-fadeIn pointer-events-none">
                        <div className="font-bold">{label}</div>
                        <div className="text-gray-300">{value} {value !== 1 ? t('analytics.elements', 'elementos') : t('analytics.element', 'elemento')} ({percentage}%)</div>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    )}
                    {/* Valor sobre la barra */}
                    <div
                      className={`absolute -top-10 left-1/2 transform -translate-x-1/2 text-sm font-bold text-gray-900 transition-all duration-200 whitespace-nowrap z-10 pointer-events-none ${
                        isHovered ? 'opacity-100 scale-110' : 'opacity-0'
                      }`}
                    >
                      {value}
                    </div>
                    {/* Barra animada */}
                    <div
                      className="w-full rounded-t-xl transition-all duration-300 cursor-pointer relative overflow-hidden transform hover:scale-105 active:scale-95"
                      style={{
                        height: `${Math.max(barHeight, 8)}px`,
                        backgroundColor: isHovered ? color : color,
                        minHeight: '8px',
                        boxShadow: isHovered ? `0 10px 25px -5px ${color}40` : 'none',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      title={`${label}: ${value} (${percentage}%)`}
                      onClick={() => setSelectedMetric(`${prefix}-${key}`)}
                    >
                      {/* Efecto de gradiente animado */}
                      <div
                        className="absolute inset-0 transition-opacity duration-300"
                        style={{
                          background: `linear-gradient(to top, rgba(0,0,0,${isHovered ? 0.3 : 0.1}), transparent)`,
                          opacity: isHovered ? 1 : 0.5
                        }}
                      />
                      {/* Valor dentro de la barra si es suficientemente grande */}
                      {barHeight > 30 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-white font-bold text-sm drop-shadow-lg transition-transform duration-300" style={{
                            transform: isHovered ? 'scale(1.2)' : 'scale(1)'
                          }}>
                            {value}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Etiqueta y valor debajo */}
                  <div className="text-center w-full transition-all duration-300" style={{
                    transform: isHovered ? 'translateY(-2px)' : 'translateY(0)'
                  }}>
                    <div className={`text-xs font-semibold mb-1 line-clamp-2 min-h-[2.5rem] flex items-center justify-center transition-colors ${
                      isHovered ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      {label}
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <span className={`text-lg font-bold transition-colors ${isHovered ? 'text-indigo-600' : 'text-gray-900'}`}>
                        {value}
                      </span>
                      <span className="text-xs text-gray-500">({percentage}%)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <style>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </div>
    );
  };

  // Gráfico de barras horizontales para prioridades
  const renderPriorityPieChart = (
    title: string,
    data: Record<string, number>,
    colors: Record<string, string>,
    labels: Record<string, string>
  ) => {
    const entries = Object.entries(data)
      .filter(([_, value]) => value > 0)
      .sort(([_, a], [__, b]) => b - a); // Ordenar por valor descendente
    
    if (entries.length === 0) return null;

    const total = entries.reduce((sum, [_, value]) => sum + value, 0);
    if (total === 0) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-[1.01] overflow-hidden">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          {title}
        </h3>
        <div className="space-y-4 overflow-hidden">
          {/* Total destacado */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{t('analytics.totalElements', 'Total de elementos')}</span>
              <span className="text-2xl font-bold text-purple-700">{total}</span>
            </div>
          </div>

          {/* Barras horizontales */}
          {entries.map(([key, value], index) => {
            const percentage = (value / total) * 100;
            const color = colors[key] || '#6366f1';
            const label = labels[key] || key;
            const isHovered = hoveredPieSegment === key;
            const animatedValue = animatedValues[`priority-${key}`] || 0;
            const animatedPercentage = total > 0 ? ((animatedValue / total) * 100) : 0;

            return (
              <div
                key={key}
                className="group cursor-pointer"
                onMouseEnter={() => setHoveredPieSegment(key)}
                onMouseLeave={() => setHoveredPieSegment(null)}
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'fadeInUp 0.6s ease-out forwards'
                }}
              >
                <div className="flex items-center gap-4 mb-2">
                  {/* Indicador de color */}
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 transition-all duration-300"
                    style={{
                      backgroundColor: color,
                      transform: isHovered ? 'scale(1.3)' : 'scale(1)',
                      boxShadow: isHovered ? `0 0 12px ${color}80` : 'none'
                    }}
                  ></div>
                  
                  {/* Label y valor */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-semibold transition-colors ${
                        isHovered ? 'text-indigo-700' : 'text-gray-900'
                      }`}>
                        {label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold transition-colors ${
                          isHovered ? 'text-indigo-600' : 'text-gray-700'
                        }`}>
                          {value}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    {/* Barra de progreso */}
                    <div className="relative w-full h-8 bg-gray-100 rounded-full overflow-hidden">
                      {/* Barra animada */}
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                        style={{
                          width: `${animatedPercentage}%`,
                          backgroundColor: color,
                          minWidth: animatedPercentage > 0 ? '4px' : '0px'
                        }}
                      >
                        {/* Efecto de brillo */}
                        <div
                          className="absolute inset-0 opacity-30"
                          style={{
                            background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)`,
                            animation: 'shimmer 2s infinite'
                          }}
                        />
                        {/* Valor dentro de la barra si es suficientemente ancha */}
                        {animatedPercentage > 15 && (
                          <div className="absolute inset-0 flex items-center justify-end pr-2 pointer-events-none">
                            <span className="text-xs font-bold text-white drop-shadow-md">
                              {value}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Valor fuera de la barra si es muy pequeña */}
                      {animatedPercentage <= 15 && animatedPercentage > 0 && (
                        <div className="absolute inset-0 flex items-center pl-2 pointer-events-none">
                          <span className="text-xs font-bold text-gray-700">
                            {value}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  };

  // Gráfico de líneas para velocidad
  const renderVelocityChart = () => {
    if (!metrics.velocities || metrics.velocities.length === 0) return null;

    const velocities = metrics.velocities;
    const maxVelocity = Math.max(...velocities.map(v => v.storyPointsCompleted), 1);
    const chartHeight = 200;
    const chartWidth = 100;
    const pointRadius = 4;
    const strokeWidth = 2;

    const points = velocities.map((v, index) => {
      const x = (index / (velocities.length - 1 || 1)) * chartWidth;
      const y = chartHeight - (v.storyPointsCompleted / maxVelocity) * chartHeight;
      return { x, y, value: v.storyPointsCompleted, sprint: `Sprint ${index + 1}` };
    });

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-[1.01]">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          {t('analytics.teamVelocity', 'Velocidad del Equipo')}
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-indigo-50 rounded-lg p-3">
            <span className="text-sm font-medium text-gray-700">{t('analytics.averageVelocity', 'Velocidad promedio')}</span>
            <span className="text-xl font-bold text-indigo-600">{metrics.sprints.averageVelocity.toFixed(1)} {t('analytics.storyPoints', 'SP')}</span>
          </div>
          <div className="relative" style={{ height: `${chartHeight}px`, width: '100%' }}>
            <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" className="overflow-visible">
              {/* Línea de referencia */}
              <line
                x1="0"
                y1={chartHeight - (metrics.sprints.averageVelocity / maxVelocity) * chartHeight}
                x2={chartWidth}
                y2={chartHeight - (metrics.sprints.averageVelocity / maxVelocity) * chartHeight}
                stroke="#cbd5e1"
                strokeWidth="1"
                strokeDasharray="4 4"
                className="animate-pulse"
              />
              {/* Línea de velocidad animada */}
              <path
                d={pathData}
                fill="none"
                stroke="#6366f1"
                strokeWidth={strokeWidth}
                className="transition-all duration-300"
                style={{
                  strokeDasharray: pathData.length,
                  strokeDashoffset: pathData.length,
                  animation: 'drawLine 1.5s ease-out forwards'
                }}
              />
              {/* Puntos interactivos */}
              {points.map((point, index) => {
                const isHovered = hoveredPoint === index;
                return (
                  <g key={index}>
                    {/* Círculo exterior al hover */}
                    {isHovered && (
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={pointRadius + 4}
                        fill="#6366f1"
                        opacity="0.2"
                        className="animate-ping"
                      />
                    )}
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={isHovered ? pointRadius + 2 : pointRadius}
                      fill="#6366f1"
                      className="transition-all duration-300 cursor-pointer"
                      onMouseEnter={() => setHoveredPoint(index)}
                      onMouseLeave={() => setHoveredPoint(null)}
                      style={{
                        filter: isHovered ? 'drop-shadow(0 0 6px #6366f1)' : 'none'
                      }}
                    />
                    {/* Tooltip */}
                    {isHovered && (
                      <g>
                        <rect
                          x={point.x - 25}
                          y={point.y - 35}
                          width="50"
                          height="25"
                          rx="4"
                          fill="#1f2937"
                          className="animate-fadeIn"
                        />
                        <text
                          x={point.x}
                          y={point.y - 20}
                          textAnchor="middle"
                          fill="white"
                          fontSize="10"
                          fontWeight="bold"
                        >
                          {point.value} SP
                        </text>
                        <text
                          x={point.x}
                          y={point.y - 10}
                          textAnchor="middle"
                          fill="#d1d5db"
                          fontSize="8"
                        >
                          {point.sprint}
                        </text>
                      </g>
                    )}
                    <title>{`${point.sprint}: ${point.value} SP`}</title>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            {velocities.map((_, index) => (
              <span 
                key={index}
                className={`transition-colors cursor-pointer ${
                  hoveredPoint === index ? 'text-indigo-600 font-bold' : ''
                }`}
                onMouseEnter={() => setHoveredPoint(index)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                S{index + 1}
              </span>
            ))}
          </div>
        </div>
        <style>{`
          @keyframes drawLine {
            to {
              strokeDashoffset: 0;
            }
          }
        `}</style>
      </div>
    );
  };

  // Colores para estados
  const epicStatusColors: Record<string, string> = {
    DRAFT: '#6b7280',
    READY: '#6366f1',
    IN_PROGRESS: '#8b5cf6',
    COMPLETED: '#10b981',
    CANCELLED: '#ef4444'
  };

  const epicStatusLabels: Record<string, string> = {
    DRAFT: t('epics.status.draft', 'Borrador'),
    READY: t('epics.status.ready', 'Listo'),
    IN_PROGRESS: t('epics.status.inProgress', 'En Progreso'),
    COMPLETED: t('epics.status.completed', 'Completado'),
    CANCELLED: t('epics.status.cancelled', 'Cancelado')
  };

  const storyStatusColors: Record<string, string> = {
    DRAFT: '#6b7280',
    READY: '#6366f1',
    IN_PROGRESS: '#8b5cf6',
    TESTING: '#a855f7',
    COMPLETED: '#10b981',
    CANCELLED: '#ef4444'
  };

  const storyStatusLabels: Record<string, string> = {
    DRAFT: t('stories.status.draft', 'Borrador'),
    READY: t('stories.status.ready', 'Listo'),
    IN_PROGRESS: t('stories.status.inProgress', 'En Progreso'),
    TESTING: t('stories.status.testing', 'Testing'),
    COMPLETED: t('stories.status.completed', 'Completado'),
    CANCELLED: t('stories.status.cancelled', 'Cancelado')
  };

  const taskStatusColors: Record<string, string> = {
    TODO: '#6b7280',
    IN_PROGRESS: '#6366f1',
    IN_REVIEW: '#8b5cf6',
    COMPLETED: '#10b981'
  };

  const taskStatusLabels: Record<string, string> = {
    TODO: t('tasks.status.todo', 'Por Hacer'),
    IN_PROGRESS: t('tasks.status.inProgress', 'En Progreso'),
    IN_REVIEW: t('tasks.status.inReview', 'En Revisión'),
    COMPLETED: t('tasks.status.completed', 'Completado')
  };

  const priorityColors: Record<string, string> = {
    LOW: '#10b981',
    MEDIUM: '#f59e0b',
    HIGH: '#f97316',
    CRITICAL: '#ef4444'
  };

  const priorityLabels: Record<string, string> = {
    LOW: t('common.priority.low', 'Baja'),
    MEDIUM: t('common.priority.medium', 'Media'),
    HIGH: t('common.priority.high', 'Alta'),
    CRITICAL: t('common.priority.critical', 'Crítica')
  };

  // Calcular eficiencia de horas
  const hoursEfficiency = metrics.tasks.totalEstimatedHours > 0
    ? (metrics.tasks.totalActualHours / metrics.tasks.totalEstimatedHours) * 100
    : 0;

  // Toggle visibilidad de gráfico
  const toggleChartVisibility = (chart: keyof ChartVisibility) => {
    setChartVisibility(prev => ({
      ...prev,
      [chart]: !prev[chart]
    }));
  };

  // Exportar datos
  const exportData = (format: 'json' | 'csv') => {
    if (!metrics) return;
    
    const data = {
      timeFilter,
      viewMode,
      metrics: {
        epics: metrics.epics,
        stories: metrics.userStories,
        tasks: metrics.tasks,
        sprints: metrics.sprints
      }
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // CSV simple
      const csv = `${t('analytics.metric', 'Métrica')},${t('analytics.value', 'Valor')}\n${t('analytics.totalEpics', 'Épicas Totales')},${metrics.epics.total}\n${t('analytics.totalStories', 'Historias Totales')},${metrics.userStories.total}\n${t('analytics.totalTasks', 'Tareas Totales')},${metrics.tasks.total}\n${t('analytics.averageVelocity', 'Velocidad Promedio')},${metrics.sprints.averageVelocity}`;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6 overflow-visible">
      {/* Modal de detalles de métrica seleccionada */}
      {selectedMetric && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSelectedMetric(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">{t('analytics.metricDetails', 'Detalles de Métrica')}</h3>
              <button
                onClick={() => setSelectedMetric(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600">{t('analytics.metricDetailsDesc', 'Información detallada sobre la métrica seleccionada.')}</p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">{t('analytics.activeFilter', 'Filtro activo')}: {timeFilter}</p>
                <p className="text-sm text-gray-500">{t('analytics.view', 'Vista')}: {viewMode}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barra de filtros y controles */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          {/* Filtros de período */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">{t('analytics.period', 'Período')}:</span>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {(['all', 'week', 'month', 'quarter', 'year'] as TimeFilter[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setTimeFilter(period)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                    timeFilter === period
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {period === 'all' ? t('analytics.all', 'Todo') : period === 'week' ? t('analytics.week', 'Semana') : period === 'month' ? t('analytics.month', 'Mes') : period === 'quarter' ? t('analytics.quarter', 'Trimestre') : t('analytics.year', 'Año')}
                </button>
              ))}
            </div>
          </div>

          {/* Modo de vista */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">{t('analytics.view', 'Vista')}:</span>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {(['summary', 'detailed', 'comparative'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                    viewMode === mode
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {mode === 'summary' ? t('analytics.summary', 'Resumen') : mode === 'detailed' ? t('analytics.detailed', 'Detallado') : t('analytics.comparative', 'Comparativo')}
                </button>
              ))}
            </div>
          </div>

          {/* Botones de exportar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportData('json')}
              className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              JSON
            </button>
            <button
              onClick={() => exportData('csv')}
              className="px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              CSV
            </button>
          </div>
        </div>

        {/* Filtros de visibilidad de gráficos */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">{t('analytics.showCharts', 'Mostrar gráficos')}:</span>
            {Object.entries({
              epics: t('epics.title', 'Épicas'),
              stories: t('stories.title', 'Historias'),
              tasks: t('tasks.title', 'Tareas'),
              priority: t('analytics.priority', 'Prioridad'),
              velocity: t('analytics.velocity', 'Velocidad'),
              hours: t('analytics.hours', 'Horas')
            }).map(([key, label]) => (
              <button
                key={key}
                onClick={() => toggleChartVisibility(key as keyof ChartVisibility)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 flex items-center gap-1 ${
                  chartVisibility[key as keyof ChartVisibility]
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                    : 'bg-gray-100 text-gray-500 border border-gray-300'
                }`}
              >
                {chartVisibility[key as keyof ChartVisibility] ? (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Métricas principales - siempre visibles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-indigo-700">{t('epics.title', 'Épicas')}</span>
            <svg className="w-5 h-5 text-indigo-500 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-indigo-900 transition-transform duration-300 group-hover:scale-110">{metrics.epics.total}</div>
          <div className="text-xs text-indigo-600 mt-1">
            {metrics.epics.byStatus.COMPLETED || 0} {t('analytics.completed', 'completadas')}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-700">{t('stories.title', 'Historias')}</span>
            <svg className="w-5 h-5 text-purple-500 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-purple-900 transition-transform duration-300 group-hover:scale-110">{metrics.userStories.total}</div>
          <div className="text-xs text-purple-600 mt-1">
            {metrics.userStories.totalPoints || 0} {t('analytics.storyPoints', 'story points')}
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">{t('tasks.title', 'Tareas')}</span>
            <svg className="w-5 h-5 text-green-500 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-green-900 transition-transform duration-300 group-hover:scale-110">{metrics.tasks.total}</div>
          <div className="text-xs text-green-600 mt-1">
            {metrics.tasks.byStatus.COMPLETED || 0} {t('analytics.completed', 'completadas')}
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-yellow-700">{t('analytics.velocity', 'Velocidad')}</span>
            <svg className="w-5 h-5 text-yellow-500 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-yellow-900 transition-transform duration-300 group-hover:scale-110">{metrics.sprints.averageVelocity.toFixed(1)}</div>
          <div className="text-xs text-yellow-600 mt-1">
            {t('analytics.averageStoryPoints', 'Story points promedio')}
          </div>
        </div>
      </div>

      {/* Gráficos de distribución por estado - Modo Resumen: solo 2 gráficos principales */}
      {viewMode === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {chartVisibility.stories && renderStatusBarChart(t('analytics.storiesByStatus', 'Historias por Estado'), metrics.userStories.byStatus, storyStatusColors, storyStatusLabels, 'story')}
          {chartVisibility.priority && renderPriorityPieChart(t('analytics.priorityDistribution', 'Distribución por Prioridad'), metrics.userStories.byPriority, priorityColors, priorityLabels)}
        </div>
      )}

      {/* Modo Detallado: todos los gráficos */}
      {viewMode === 'detailed' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {chartVisibility.epics && renderStatusBarChart(t('analytics.epicsByStatus', 'Épicas por Estado'), metrics.epics.byStatus, epicStatusColors, epicStatusLabels, 'epic')}
            {chartVisibility.stories && renderStatusBarChart(t('analytics.storiesByStatus', 'Historias por Estado'), metrics.userStories.byStatus, storyStatusColors, storyStatusLabels, 'story')}
            {chartVisibility.tasks && renderStatusBarChart(t('analytics.tasksByStatus', 'Tareas por Estado'), metrics.tasks.byStatus, taskStatusColors, taskStatusLabels, 'task')}
            {chartVisibility.priority && renderPriorityPieChart(t('analytics.priorityDistribution', 'Distribución por Prioridad'), metrics.userStories.byPriority, priorityColors, priorityLabels)}
          </div>
          
          {/* Información adicional en modo detallado */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {t('analytics.detailedAnalysis', 'Análisis Detallado')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border border-indigo-200">
                <div className="text-sm text-gray-600 mb-1">{t('analytics.completionRate', 'Tasa de Completado')}</div>
                <div className="text-2xl font-bold text-indigo-600">
                  {metrics.epics.total > 0 
                    ? ((metrics.epics.byStatus.COMPLETED || 0) / metrics.epics.total * 100).toFixed(1)
                    : 0}%
                </div>
                <div className="text-xs text-gray-500 mt-1">{t('analytics.completedEpics', 'Épicas completadas')}</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <div className="text-sm text-gray-600 mb-1">{t('analytics.storiesProgress', 'Progreso de Historias')}</div>
                <div className="text-2xl font-bold text-purple-600">
                  {metrics.userStories.total > 0
                    ? ((metrics.userStories.byStatus.COMPLETED || 0) / metrics.userStories.total * 100).toFixed(1)
                    : 0}%
                </div>
                <div className="text-xs text-gray-500 mt-1">{t('analytics.completedStories', 'Historias completadas')}</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <div className="text-sm text-gray-600 mb-1">{t('analytics.tasksEfficiency', 'Eficiencia de Tareas')}</div>
                <div className="text-2xl font-bold text-green-600">
                  {metrics.tasks.total > 0
                    ? ((metrics.tasks.byStatus.COMPLETED || 0) / metrics.tasks.total * 100).toFixed(1)
                    : 0}%
                </div>
                <div className="text-xs text-gray-500 mt-1">{t('analytics.completedTasks', 'Tareas completadas')}</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modo Comparativo: comparaciones lado a lado */}
      {viewMode === 'comparative' && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {t('analytics.comparativeView', 'Vista Comparativa')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-sm font-medium text-gray-700 mb-3">{t('analytics.byStatus', 'Por Estado')}</div>
                <div className="space-y-2">
                  {Object.entries(metrics.epics.byStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{epicStatusLabels[status] || status}</span>
                      <span className="text-sm font-bold text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-sm font-medium text-gray-700 mb-3">{t('analytics.byPriority', 'Por Prioridad')}</div>
                <div className="space-y-2">
                  {Object.entries(metrics.userStories.byPriority).map(([priority, count]) => (
                    <div key={priority} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{priorityLabels[priority] || priority}</span>
                      <span className="text-sm font-bold text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {chartVisibility.epics && renderStatusBarChart(t('analytics.epicsByStatus', 'Épicas por Estado'), metrics.epics.byStatus, epicStatusColors, epicStatusLabels, 'epic')}
            {chartVisibility.stories && renderStatusBarChart(t('analytics.storiesByStatus', 'Historias por Estado'), metrics.userStories.byStatus, storyStatusColors, storyStatusLabels, 'story')}
            {chartVisibility.tasks && renderStatusBarChart(t('analytics.tasksByStatus', 'Tareas por Estado'), metrics.tasks.byStatus, taskStatusColors, taskStatusLabels, 'task')}
            {chartVisibility.priority && renderPriorityPieChart(t('analytics.priorityDistribution', 'Distribución por Prioridad'), metrics.userStories.byPriority, priorityColors, priorityLabels)}
          </div>
        </>
      )}

      {/* Gráfico de velocidad y métricas de horas - visible en todos los modos excepto summary */}
      {(viewMode === 'detailed' || viewMode === 'comparative') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {chartVisibility.velocity && renderVelocityChart()}

          {/* Métricas de horas */}
          {chartVisibility.hours && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-[1.01]">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('analytics.hoursManagement', 'Gestión de Horas')}
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{t('analytics.estimatedHours', 'Horas Estimadas')}</span>
                <span className="text-lg font-bold text-indigo-600">{metrics.tasks.totalEstimatedHours}h</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-3 rounded-full transition-all"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{t('analytics.actualHours', 'Horas Reales')}</span>
                <span className="text-lg font-bold text-green-600">{metrics.tasks.totalActualHours}h</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all"
                  style={{
                    width: metrics.tasks.totalEstimatedHours > 0
                      ? `${Math.min((metrics.tasks.totalActualHours / metrics.tasks.totalEstimatedHours) * 100, 100)}%`
                      : '0%'
                  }}
                />
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t('analytics.efficiency', 'Eficiencia')}</span>
                <span className={`text-lg font-bold ${hoursEfficiency <= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                  {hoursEfficiency.toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {hoursEfficiency <= 100
                  ? t('analytics.belowEstimated', 'Por debajo de lo estimado ✓')
                  : t('analytics.aboveEstimated', 'Por encima de lo estimado')}
              </div>
            </div>
          </div>
        </div>
        )}
        </div>
      )}

      {/* Distribución de historias en sprints - visible en todos los modos */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          {t('analytics.storiesDistribution', 'Distribución de Historias')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 hover:bg-indigo-100 hover:border-indigo-300 transition-all duration-300 transform hover:scale-105 cursor-pointer group">
            <div className="text-2xl font-bold text-indigo-700 mb-1 transition-transform duration-300 group-hover:scale-110">{metrics.userStories.inSprints}</div>
            <div className="text-sm text-indigo-600 font-medium">{t('analytics.inSprints', 'En Sprints')}</div>
            <div className="text-xs text-indigo-500 mt-1">
              {metrics.userStories.total > 0
                ? `${((metrics.userStories.inSprints / metrics.userStories.total) * 100).toFixed(1)}% ${t('analytics.ofTotal', 'del total')}`
                : '0%'}
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 transform hover:scale-105 cursor-pointer group">
            <div className="text-2xl font-bold text-gray-700 mb-1 transition-transform duration-300 group-hover:scale-110">{metrics.userStories.notInSprints}</div>
            <div className="text-sm text-gray-600 font-medium">{t('analytics.unassigned', 'Sin Asignar')}</div>
            <div className="text-xs text-gray-500 mt-1">
              {metrics.userStories.total > 0
                ? `${((metrics.userStories.notInSprints / metrics.userStories.total) * 100).toFixed(1)}% ${t('analytics.ofTotal', 'del total')}`
                : '0%'}
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 hover:bg-purple-100 hover:border-purple-300 transition-all duration-300 transform hover:scale-105 cursor-pointer group">
            <div className="text-2xl font-bold text-purple-700 mb-1 transition-transform duration-300 group-hover:scale-110">{metrics.userStories.totalPoints || 0}</div>
            <div className="text-sm text-purple-600 font-medium">{t('analytics.storyPoints', 'Story Points')}</div>
            <div className="text-xs text-purple-500 mt-1">{t('analytics.projectTotal', 'Total del proyecto')}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectAnalytics;

