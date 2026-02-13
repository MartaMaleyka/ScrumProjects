import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  total?: number;
  completed?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  showPercentage?: boolean;
  showNumbers?: boolean;
  animated?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  total,
  completed,
  label,
  size = 'md',
  color = 'blue',
  showPercentage = true,
  showNumbers = false,
  animated = true,
}) => {
  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; fill: string }> = {
      'blue': { bg: 'bg-blue-500/20', fill: 'bg-gradient-to-r from-blue-500 to-blue-600' },
      'green': { bg: 'bg-green-500/20', fill: 'bg-gradient-to-r from-green-500 to-green-600' },
      'yellow': { bg: 'bg-yellow-500/20', fill: 'bg-gradient-to-r from-yellow-500 to-yellow-600' },
      'red': { bg: 'bg-red-500/20', fill: 'bg-gradient-to-r from-red-500 to-red-600' },
      'purple': { bg: 'bg-purple-500/20', fill: 'bg-gradient-to-r from-purple-500 to-purple-600' },
    };

    return colorMap[color] || colorMap.blue;
  };

  const getSizeClasses = (size: string) => {
    const sizeMap: Record<string, string> = {
      'sm': 'h-2',
      'md': 'h-3',
      'lg': 'h-4',
    };

    return sizeMap[size] || sizeMap.md;
  };

  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const colors = getColorClasses(color);

  return (
    <div className="space-y-2">
      {/* Header con label y métricas */}
      {(label || showPercentage || showNumbers) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="text-blue-200 font-medium">{label}</span>}
          <div className="flex items-center space-x-2">
            {showNumbers && total !== undefined && completed !== undefined && (
              <span className="text-blue-300 text-xs">
                {completed} / {total}
              </span>
            )}
            {showPercentage && (
              <span className="text-white font-medium">
                {clampedProgress.toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* Barra de progreso */}
      <div className={`w-full ${colors.bg} rounded-full overflow-hidden ${getSizeClasses(size)}`}>
        <div
          className={`${colors.fill} ${getSizeClasses(size)} rounded-full transition-all duration-500 ease-out ${
            animated ? 'transform-gpu' : ''
          }`}
          style={{ width: `${clampedProgress}%` }}
        >
          {/* Efecto de brillo animado */}
          {animated && (
            <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
          )}
        </div>
      </div>

      {/* Indicadores adicionales */}
      {clampedProgress === 100 && (
        <div className="flex items-center space-x-1 text-green-300 text-xs">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Completado</span>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
