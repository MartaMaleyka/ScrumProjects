import React from 'react';
import type { ProjectStatus, SprintStatus, EpicStatus, UserStoryStatus, TaskStatus } from '../../../types/scrum';

interface StatusBadgeProps {
  status: ProjectStatus | SprintStatus | EpicStatus | UserStoryStatus | TaskStatus;
  type?: 'project' | 'sprint' | 'epic' | 'story' | 'task';
  size?: 'sm' | 'md' | 'lg';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'project', size = 'md' }) => {
  const getStatusColor = (status: string, type: string) => {
    // Colores base para diferentes estados
    const colorMap: Record<string, string> = {
      // Estados de Proyecto
      'PLANNING': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      'ACTIVE': 'bg-green-500/20 text-green-300 border-green-500/30',
      'ON_HOLD': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      'COMPLETED': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'CANCELLED': 'bg-red-500/20 text-red-300 border-red-500/30',
      
      // Estados de Sprint
      // Usa los mismos colores que proyecto para consistencia
      
      // Estados de Épica
      'DRAFT': 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      'READY': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'IN_PROGRESS': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      
      // Estados de Historia de Usuario
      'TESTING': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      
      // Estados de Tarea
      'TODO': 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      'IN_REVIEW': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      'DONE': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    };

    return colorMap[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };

  const getStatusIcon = (status: string, type: string) => {
    const iconMap: Record<string, JSX.Element> = {
      'PLANNING': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      'ACTIVE': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      'IN_PROGRESS': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      'ON_HOLD': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      'COMPLETED': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      'DONE': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      'CANCELLED': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      'DRAFT': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      ),
      'READY': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      'TODO': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      'IN_REVIEW': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      'TESTING': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    };

    return iconMap[status] || (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  const getStatusText = (status: string) => {
    const textMap: Record<string, string> = {
      'PLANNING': 'Planificando',
      'ACTIVE': 'Activo',
      'ON_HOLD': 'En Pausa',
      'COMPLETED': 'Completado',
      'CANCELLED': 'Cancelado',
      'DRAFT': 'Borrador',
      'READY': 'Listo',
      'IN_PROGRESS': 'En Progreso',
      'TESTING': 'Probando',
      'TODO': 'Por Hacer',
      'IN_REVIEW': 'En Revisión',
      'DONE': 'Terminado',
    };

    return textMap[status] || status;
  };

  const getSizeClasses = (size: string) => {
    const sizeMap: Record<string, string> = {
      'sm': 'px-2 py-0.5 text-xs',
      'md': 'px-2.5 py-0.5 text-xs',
      'lg': 'px-3 py-1 text-sm',
    };

    return sizeMap[size] || sizeMap.md;
  };

  return (
    <span className={`inline-flex items-center space-x-1 rounded-full font-medium border ${getStatusColor(status, type)} ${getSizeClasses(size)}`}>
      {getStatusIcon(status, type)}
      <span>{getStatusText(status)}</span>
    </span>
  );
};

export default StatusBadge;
