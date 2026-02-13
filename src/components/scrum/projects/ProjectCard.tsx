import React, { useState } from 'react';
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
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No definida';
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
    switch (status) {
      case 'PLANNING':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case 'ACTIVE':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'COMPLETED':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'ON_HOLD':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
    }
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 hover:bg-white/15 transition-all duration-200">
        <div className="flex items-center justify-between">
          {/* Información principal */}
          <div className="flex items-center space-x-4 flex-1">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-light to-blue-deep rounded-lg flex items-center justify-center text-white">
              {getProjectIcon(project.status)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-lg font-semibold text-white truncate">{project.name}</h3>
                <StatusBadge status={project.status} type="project" size="sm" />
              </div>
              
              <p className="text-blue-200 text-sm line-clamp-2 mb-3">
                {project.description || 'Sin descripción'}
              </p>
              
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-1 text-blue-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span>{totalEpics} épicas</span>
                </div>
                
                <div className="flex items-center space-x-1 text-blue-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>{totalSprints} sprints</span>
                </div>
                
                <div className="flex items-center space-x-1 text-blue-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <span>{totalMembers} miembros</span>
                </div>
              </div>
            </div>
          </div>

          {/* Progreso y fechas */}
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <div className="text-xs text-blue-300 mb-1">Inicio: {formatDate(project.startDate)}</div>
              <div className="text-xs text-blue-300">Fin: {formatDate(project.endDate)}</div>
            </div>
            
            <div className="w-32">
              <ProgressBar 
                progress={progress} 
                size="sm" 
                color="blue"
                showPercentage={true}
                showNumbers={false}
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center space-x-2 ml-6">
            <button
              className="text-blue-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-blue-500/20"
              title="Ver detalles del proyecto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            
            <button
              className="text-green-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-green-500/20"
              title="Editar proyecto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            
            <div className="relative group">
              <button className="text-purple-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-purple-500/20">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              
              {/* Dropdown de acciones */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                <div className="py-2">
                  <button className="flex items-center w-full px-4 py-2 text-sm text-blue-200 hover:bg-white/10 hover:text-white transition-colors">
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                    Duplicar proyecto
                  </button>
                  <button className="flex items-center w-full px-4 py-2 text-sm text-yellow-200 hover:bg-white/10 hover:text-white transition-colors">
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    Archivar
                  </button>
                  <div className="border-t border-white/20 my-1"></div>
                  <button className="flex items-center w-full px-4 py-2 text-sm text-red-200 hover:bg-white/10 hover:text-white transition-colors">
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vista de Grid (Card)
  return (
    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 hover:bg-white/15 transition-all duration-200 transform hover:scale-105 animate-fade-in">
      {/* Header de la tarjeta */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-light to-blue-deep rounded-lg flex items-center justify-center text-white ring-2 ring-yellow-sun/30">
            {getProjectIcon(project.status)}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white line-clamp-1">{project.name}</h3>
            <div className="text-xs text-blue-300">{formatDate(project.createdAt)}</div>
          </div>
        </div>
        
        <StatusBadge status={project.status} type="project" size="sm" />
      </div>

      {/* Descripción */}
      <p className="text-blue-200 text-sm line-clamp-3 mb-4">
        {project.description || 'Sin descripción disponible'}
      </p>

      {/* Progreso */}
      <div className="mb-4">
        <ProgressBar 
          progress={progress} 
          size="md" 
          color="blue"
          label="Progreso del proyecto"
          showPercentage={true}
          showNumbers={false}
        />
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="text-lg font-bold text-white">{totalEpics}</div>
          <div className="text-xs text-blue-300">Épicas</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-white">{totalSprints}</div>
          <div className="text-xs text-blue-300">Sprints</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-white">{totalMembers}</div>
          <div className="text-xs text-blue-300">Miembros</div>
        </div>
      </div>

      {/* Fechas */}
      <div className="text-xs text-blue-300 space-y-1 mb-4">
        <div className="flex justify-between">
          <span>Inicio:</span>
          <span>{formatDate(project.startDate)}</span>
        </div>
        <div className="flex justify-between">
          <span>Fin:</span>
          <span>{formatDate(project.endDate)}</span>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between pt-4 border-t border-white/20">
        <div className="text-xs text-blue-300">
          Actualizado: {formatDate(project.updatedAt)}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onSelect?.(project)}
            className="text-blue-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-blue-500/20"
            title="Ver detalles"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          
          <button
            className="text-green-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-green-500/20"
            title="Editar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
