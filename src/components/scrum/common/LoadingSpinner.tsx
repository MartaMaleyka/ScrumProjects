import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'white' | 'gray';
  text?: string;
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'blue',
  text,
  fullScreen = false,
}) => {
  const getSizeClasses = (size: string) => {
    const sizeMap: Record<string, string> = {
      'sm': 'h-4 w-4',
      'md': 'h-8 w-8',
      'lg': 'h-12 w-12',
      'xl': 'h-16 w-16',
    };

    return sizeMap[size] || sizeMap.md;
  };

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      'blue': 'border-blue-500',
      'white': 'border-white',
      'gray': 'border-gray-500',
    };

    return colorMap[color] || colorMap.blue;
  };

  const getTextSizeClasses = (size: string) => {
    const textSizeMap: Record<string, string> = {
      'sm': 'text-sm',
      'md': 'text-base',
      'lg': 'text-lg',
      'xl': 'text-xl',
    };

    return textSizeMap[size] || textSizeMap.md;
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div
        className={`animate-spin rounded-full border-b-2 ${getSizeClasses(size)} ${getColorClasses(color)}`}
      />
      {text && (
        <p className={`text-blue-200 ${getTextSizeClasses(size)} font-medium`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-8">
          {spinner}
        </div>
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
