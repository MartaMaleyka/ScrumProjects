import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectStatus, SprintStatus, EpicStatus, UserStoryStatus, TaskStatus } from '../../../types/scrum';

interface StatusBadgeProps {
  status: ProjectStatus | SprintStatus | EpicStatus | UserStoryStatus | TaskStatus;
  type?: 'project' | 'sprint' | 'epic' | 'story' | 'task';
  size?: 'sm' | 'md' | 'lg';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'project', size = 'md' }) => {
  const { t } = useTranslation();
  
  const getStatusColor = (status: string, type: string) => {
    // Colores base para diferentes estados - mejor contraste sobre fondo blanco
    const colorMap: Record<string, string> = {
      // Estados de Proyecto
      'PLANNING': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'ACTIVE': 'bg-indigo-100 text-indigo-700 border-indigo-300',
      'ON_HOLD': 'bg-orange-100 text-orange-700 border-orange-300',
      'COMPLETED': 'bg-purple-100 text-purple-700 border-purple-300',
      'CANCELLED': 'bg-red-100 text-red-700 border-red-300',
      
      // Estados de Sprint
      // Usa los mismos colores que proyecto para consistencia
      
      // Estados de Épica
      'DRAFT': 'bg-gray-100 text-gray-700 border-gray-300',
      'READY': 'bg-blue-100 text-blue-700 border-blue-300',
      'IN_PROGRESS': 'bg-purple-100 text-purple-700 border-purple-300',
      
      // Estados de Historia de Usuario
      'TESTING': 'bg-indigo-100 text-indigo-700 border-indigo-300',
      
      // Estados de Tarea
      'TODO': 'bg-slate-100 text-slate-700 border-slate-300',
      'IN_REVIEW': 'bg-cyan-100 text-cyan-700 border-cyan-300',
      'DONE': 'bg-emerald-100 text-emerald-700 border-emerald-300',
    };

    return colorMap[status] || 'bg-gray-100 text-gray-700 border-gray-300';
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
      'PLANNING': t('common.statusPlanning', 'Planificando'),
      'ACTIVE': t('common.statusActive', 'Activo'),
      'ON_HOLD': t('common.statusOnHold', 'En Pausa'),
      'COMPLETED': t('common.statusCompleted', 'Completado'),
      'CANCELLED': t('common.statusCancelled', 'Cancelado'),
      'DRAFT': t('common.statusDraft', 'Borrador'),
      'READY': t('common.statusReady', 'Listo'),
      'IN_PROGRESS': t('common.statusInProgress', 'En Progreso'),
      'TESTING': t('common.statusTesting', 'Probando'),
      'TODO': t('common.statusTodo', 'Por Hacer'),
      'IN_REVIEW': t('common.statusInReview', 'En Revisión'),
      'DONE': t('common.statusDone', 'Terminado'),
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
