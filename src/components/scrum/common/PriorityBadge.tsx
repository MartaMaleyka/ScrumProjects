import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ScrumPriority } from '../../../types/scrum';

interface PriorityBadgeProps {
  priority: ScrumPriority;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md', showIcon = true }) => {
  const { t } = useTranslation();
  
  const getPriorityColor = (priority: ScrumPriority) => {
    const colorMap: Record<ScrumPriority, string> = {
      'LOW': 'bg-green-100 text-green-700 border-green-300',
      'MEDIUM': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'HIGH': 'bg-orange-100 text-orange-700 border-orange-300',
      'CRITICAL': 'bg-red-100 text-red-700 border-red-300',
    };

    return colorMap[priority] || colorMap.MEDIUM;
  };

  const getPriorityIcon = (priority: ScrumPriority) => {
    const iconMap: Record<ScrumPriority, JSX.Element> = {
      'LOW': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      ),
      'MEDIUM': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
        </svg>
      ),
      'HIGH': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      ),
      'CRITICAL': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
    };

    return iconMap[priority];
  };

  const getPriorityText = (priority: ScrumPriority) => {
    const textMap: Record<ScrumPriority, string> = {
      'LOW': t('epics.priority.low', 'Baja'),
      'MEDIUM': t('epics.priority.medium', 'Media'),
      'HIGH': t('epics.priority.high', 'Alta'),
      'CRITICAL': t('epics.priority.critical', 'Crítica'),
    };

    return textMap[priority];
  };

  const getSizeClasses = (size: string) => {
    const sizeMap: Record<string, string> = {
      'sm': 'px-2 py-0.5 text-xs',
      'md': 'px-2.5 py-0.5 text-xs',
      'lg': 'px-3 py-1 text-sm',
    };

    return sizeMap[size] || sizeMap.md;
  };

  const getPriorityWeight = (priority: ScrumPriority): number => {
    const weightMap: Record<ScrumPriority, number> = {
      'LOW': 1,
      'MEDIUM': 2,
      'HIGH': 3,
      'CRITICAL': 4,
    };

    return weightMap[priority];
  };

  return (
    <span className={`inline-flex items-center space-x-1 rounded-full font-medium border ${getPriorityColor(priority)} ${getSizeClasses(size)}`}>
      {showIcon && getPriorityIcon(priority)}
      <span>{getPriorityText(priority)}</span>
    </span>
  );
};

export default PriorityBadge;
