import React, { useState, useEffect } from 'react';
import { scrumService } from '../../../services/scrumService';
import type { BurndownChartData } from '../../../types/scrum';
import LoadingSpinner from '../common/LoadingSpinner';

interface BurndownChartProps {
  sprintId: number;
  isOpen: boolean;
  onClose: () => void;
}

const BurndownChart: React.FC<BurndownChartProps> = ({ sprintId, isOpen, onClose }) => {
  const [burndownData, setBurndownData] = useState<BurndownChartData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && sprintId) {
      fetchBurndownData();
    }
  }, [isOpen, sprintId]);

  const fetchBurndownData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await scrumService.getSprintBurndown(sprintId);
      
      if (response.success && response.data) {
        setBurndownData(response.data.burndownChart);
      } else {
        setError(response.message || 'Error al cargar el burndown chart');
      }
    } catch (err: any) {
      console.error('Error al cargar burndown chart:', err);
      setError(err.message || 'Error al cargar el burndown chart');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const renderChart = () => {
    if (!burndownData) return null;

    const width = 800;
    const height = 400;
    const padding = { top: 40, right: 40, bottom: 60, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Calcular el máximo de puntos para el eje Y
    const maxPoints = Math.max(
      ...burndownData.idealBurndown.map(d => d.remainingPoints),
      ...burndownData.realBurndown.map(d => d.remainingPoints),
      burndownData.totalPoints
    );
    const yMax = Math.ceil(maxPoints * 1.1); // 10% de margen superior

    // Función para convertir día a coordenada X
    const getX = (day: number) => {
      return padding.left + (day / burndownData.totalDays) * chartWidth;
    };

    // Función para convertir puntos a coordenada Y
    const getY = (points: number) => {
      return padding.top + chartHeight - (points / yMax) * chartHeight;
    };

    // Generar puntos para la línea ideal
    const idealPath = burndownData.idealBurndown
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.day)} ${getY(d.remainingPoints)}`)
      .join(' ');

    // Generar puntos para la línea real
    const realPath = burndownData.realBurndown
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.day)} ${getY(d.remainingPoints)}`)
      .join(' ');

    // Generar etiquetas del eje X (días)
    const xLabels = [];
    const labelInterval = Math.max(1, Math.floor(burndownData.totalDays / 10));
    for (let i = 0; i <= burndownData.totalDays; i += labelInterval) {
      xLabels.push(i);
    }
    if (xLabels[xLabels.length - 1] !== burndownData.totalDays) {
      xLabels.push(burndownData.totalDays);
    }

    // Generar etiquetas del eje Y (puntos)
    const yLabels = [];
    const yInterval = Math.ceil(yMax / 5);
    for (let i = 0; i <= yMax; i += yInterval) {
      yLabels.push(i);
    }
    if (yLabels[yLabels.length - 1] !== yMax) {
      yLabels.push(yMax);
    }

    // Calcular puntos restantes actuales
    const today = new Date();
    const startDate = new Date(burndownData.startDate);
    const daysElapsed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const currentDay = Math.min(Math.max(0, daysElapsed), burndownData.totalDays);
    const currentRealPoints = burndownData.realBurndown.find(d => d.day === currentDay)?.remainingPoints || 
                            burndownData.realBurndown[burndownData.realBurndown.length - 1]?.remainingPoints || 0;
    const currentIdealPoints = burndownData.idealBurndown.find(d => d.day === currentDay)?.remainingPoints || 
                               burndownData.idealBurndown[burndownData.idealBurndown.length - 1]?.remainingPoints || 0;

    return (
      <div className="space-y-4">
        {/* Información del sprint */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{burndownData.sprintName}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Story Points:</span>
              <span className="ml-2 font-semibold text-gray-900">{burndownData.totalPoints}</span>
            </div>
            <div>
              <span className="text-gray-600">Duración:</span>
              <span className="ml-2 font-semibold text-gray-900">{burndownData.totalDays} días</span>
            </div>
            <div>
              <span className="text-gray-600">Puntos Restantes (Real):</span>
              <span className="ml-2 font-semibold text-indigo-600">{currentRealPoints}</span>
            </div>
            <div>
              <span className="text-gray-600">Puntos Restantes (Ideal):</span>
              <span className="ml-2 font-semibold text-purple-600">{Math.round(currentIdealPoints)}</span>
            </div>
          </div>
        </div>

        {/* Gráfico SVG */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 overflow-x-auto">
          <svg width={width} height={height} className="w-full h-auto">
            {/* Fondo del gráfico */}
            <rect
              x={padding.left}
              y={padding.top}
              width={chartWidth}
              height={chartHeight}
              fill="#f9fafb"
              stroke="#e5e7eb"
            />

            {/* Líneas de cuadrícula horizontales */}
            {yLabels.map((label, i) => {
              const y = getY(label);
              return (
                <g key={`grid-y-${i}`}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={padding.left + chartWidth}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth={1}
                    strokeDasharray="2,2"
                  />
                </g>
              );
            })}

            {/* Líneas de cuadrícula verticales */}
            {xLabels.map((label, i) => {
              const x = getX(label);
              return (
                <g key={`grid-x-${i}`}>
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + chartHeight}
                    stroke="#e5e7eb"
                    strokeWidth={1}
                    strokeDasharray="2,2"
                  />
                </g>
              );
            })}

            {/* Línea ideal */}
            <path
              d={idealPath}
              fill="none"
              stroke="#9333ea"
              strokeWidth={2}
              strokeDasharray="5,5"
            />

            {/* Línea real */}
            <path
              d={realPath}
              fill="none"
              stroke="#4f46e5"
              strokeWidth={3}
            />

            {/* Puntos en la línea ideal */}
            {burndownData.idealBurndown.map((d, i) => {
              if (i % Math.max(1, Math.floor(burndownData.totalDays / 20)) === 0) {
                return (
                  <circle
                    key={`ideal-point-${i}`}
                    cx={getX(d.day)}
                    cy={getY(d.remainingPoints)}
                    r={3}
                    fill="#9333ea"
                  />
                );
              }
              return null;
            })}

            {/* Puntos en la línea real */}
            {burndownData.realBurndown.map((d, i) => {
              if (i % Math.max(1, Math.floor(burndownData.totalDays / 20)) === 0) {
                return (
                  <circle
                    key={`real-point-${i}`}
                    cx={getX(d.day)}
                    cy={getY(d.remainingPoints)}
                    r={4}
                    fill="#4f46e5"
                  />
                );
              }
              return null;
            })}

            {/* Etiquetas del eje Y */}
            {yLabels.map((label, i) => {
              const y = getY(label);
              return (
                <text
                  key={`y-label-${i}`}
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#6b7280"
                >
                  {label}
                </text>
              );
            })}

            {/* Etiquetas del eje X */}
            {xLabels.map((label, i) => {
              const x = getX(label);
              return (
                <text
                  key={`x-label-${i}`}
                  x={x}
                  y={height - padding.bottom + 20}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#6b7280"
                >
                  Día {label}
                </text>
              );
            })}

            {/* Etiquetas de los ejes */}
            <text
              x={width / 2}
              y={height - 10}
              textAnchor="middle"
              fontSize="14"
              fontWeight="semibold"
              fill="#374151"
            >
              Días del Sprint
            </text>
            <text
              x={20}
              y={height / 2}
              textAnchor="middle"
              fontSize="14"
              fontWeight="semibold"
              fill="#374151"
              transform={`rotate(-90, 20, ${height / 2})`}
            >
              Story Points Restantes
            </text>
          </svg>

          {/* Leyenda */}
          <div className="flex items-center justify-center space-x-6 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-0.5 bg-purple-600 border-dashed border-t-2 border-purple-600"></div>
              <span className="text-sm text-gray-700">Línea Ideal</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-indigo-600"></div>
              <span className="text-sm text-gray-700">Línea Real</span>
            </div>
          </div>
        </div>

        {/* Análisis */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Análisis del Progreso</h4>
          <div className="space-y-2 text-sm">
            {currentRealPoints > currentIdealPoints ? (
              <div className="flex items-center space-x-2 text-orange-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>El sprint está por debajo del ritmo ideal. Hay {Math.round(currentRealPoints - currentIdealPoints)} puntos más de lo esperado.</span>
              </div>
            ) : currentRealPoints < currentIdealPoints ? (
              <div className="flex items-center space-x-2 text-green-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>El sprint está por encima del ritmo ideal. Se han completado {Math.round(currentIdealPoints - currentRealPoints)} puntos más de lo esperado.</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-blue-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>El sprint está en el ritmo ideal.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Burndown Chart</h2>
            <p className="text-indigo-100 text-sm mt-1">
              Visualización del progreso del sprint
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-indigo-200 transition-colors p-2 rounded-lg hover:bg-white/10"
            title="Cerrar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" text="Cargando burndown chart..." />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-red-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          ) : (
            renderChart()
          )}
        </div>
      </div>
    </div>
  );
};

export default BurndownChart;

