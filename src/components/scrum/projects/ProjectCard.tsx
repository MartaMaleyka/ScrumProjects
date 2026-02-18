import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Project } from '../../../types/scrum';
import StatusBadge from '../common/StatusBadge';
import ProgressBar from '../common/ProgressBar';

interface ProjectCardProps {
  project: Project;
  viewMode?: 'grid' | 'list';
  onUpdate?: () => void;
  onSelect?: (project: Project) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, viewMode = 'grid', onUpdate, onSelect }) => {
  const { t } = useTranslation();
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return t('common.notDefined', 'No definida');
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getProgressData = () => {
    const totalEpics = project._count?.epics || 0;
    const totalSprints = project._count?.sprints || 0;
    const totalMembers = project._count?.members || 0;
    
    // Calcular progreso basado en sprints completados (simulado)
    const progress = totalSprints > 0 ? Math.min((totalSprints * 25), 100) : 0;
    
    return { totalEpics, totalSprints, totalMembers, progress };
  };

  const { totalEpics, totalSprints, totalMembers, progress } = getProgressData();

  const getProjectIcon = (status: string) => {
    const iconClass = 'w-5 h-5';
    switch (status) {
      case 'PLANNING':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case 'ACTIVE':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'COMPLETED':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'ON_HOLD':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
    }
  };

  const cardBase = 'bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-200/60 transition-all duration-200';
  const textMuted = 'text-gray-500';
  const textPrimary = 'text-gray-900';

  if (viewMode === 'list') {
    return (
      <div className={`${cardBase} p-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white shadow-sm">
              {getProjectIcon(project.status)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className={`text-lg font-semibold ${textPrimary} truncate`}>{project.name}</h3>
                <StatusBadge status={project.status} type="project" size="sm" />
              </div>
              <p className={`${textMuted} text-sm line-clamp-2 mb-3`}>
                {project.description || t('common.noDescription', 'Sin descripción')}
              </p>
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">{totalEpics} {t('projects.epics', 'épicas')}</span>
                <span className="flex items-center gap-1.5">{totalSprints} {t('projects.sprints', 'sprints')}</span>
                <span className="flex items-center gap-1.5">{totalMembers} {t('projects.members', 'miembros')}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right text-xs text-gray-500">
              <div>{t('projects.start', 'Inicio')}: {formatDate(project.startDate)}</div>
              <div>{t('projects.end', 'Fin')}: {formatDate(project.endDate)}</div>
            </div>
            <div className="w-32">
              <ProgressBar progress={progress} size="sm" color="purple" showPercentage showNumbers={false} />
            </div>
          </div>
          <div className="flex items-center gap-1 ml-6">
            <button className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Ver detalles" onClick={() => onSelect?.(project)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </button>
            <button className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Editar">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Vista de Grid (Card) — adaptada al diseño claro (bg-gray-50)
  return (
    <div
      className={`${cardBase} p-6 flex flex-col h-full transform hover:scale-[1.02] transition-transform duration-200 cursor-pointer`}
      onClick={() => onSelect?.(project)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-11 h-11 flex-shrink-0 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white shadow-sm">
            {getProjectIcon(project.status)}
          </div>
          <div className="min-w-0">
            <h3 className={`text-base font-semibold ${textPrimary} line-clamp-1`}>{project.name}</h3>
            <p className={`text-xs ${textMuted} mt-0.5`}>{formatDate(project.createdAt)}</p>
          </div>
        </div>
        <StatusBadge status={project.status} type="project" size="sm" />
      </div>

      {/* Descripción */}
      <p className={`${textMuted} text-sm line-clamp-3 mb-4 flex-1`}>
        {project.description || t('common.noDescription', 'Sin descripción')}
      </p>

      {/* Progreso */}
      <div className="mb-4">
        <p className={`text-xs ${textMuted} mb-1.5`}>{t('projects.progress', 'Progreso del proyecto')}</p>
        <ProgressBar progress={progress} size="md" color="purple" showPercentage showNumbers={false} />
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-purple-50 border border-purple-100 rounded-lg py-2.5 text-center">
          <div className={`text-lg font-semibold text-purple-700`}>{totalEpics}</div>
          <div className={`text-xs text-purple-600`}>{t('epics.title', 'Épicas')}</div>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg py-2.5 text-center">
          <div className={`text-lg font-semibold text-indigo-700`}>{totalSprints}</div>
          <div className={`text-xs text-indigo-600`}>{t('sprints.title', 'Sprints')}</div>
        </div>
        <div className="bg-violet-50 border border-violet-100 rounded-lg py-2.5 text-center">
          <div className={`text-lg font-semibold text-violet-700`}>{totalMembers}</div>
          <div className={`text-xs text-violet-600`}>{t('projects.members', 'Miembros')}</div>
        </div>
      </div>

      {/* Fechas */}
      <div className={`text-xs ${textMuted} space-y-1 mb-4`}>
        <div className="flex justify-between">
          <span>{t('projects.start', 'Inicio')}:</span>
          <span>{formatDate(project.startDate)}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('projects.end', 'Fin')}:</span>
          <span>{formatDate(project.endDate)}</span>
        </div>
      </div>

      {/* Footer: actualizado + acciones */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
        <span className={`text-xs ${textMuted}`}>{t('projects.updated', 'Actualizado')}: {formatDate(project.updatedAt)}</span>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => { e.stopPropagation(); onSelect?.(project); }}
            className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="Ver detalles"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          </button>
          <button
            className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="Editar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
