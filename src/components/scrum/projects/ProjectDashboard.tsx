import React, { useState, useEffect } from 'react';
import { scrumService } from '../../../services/scrumService';
import type { Project, ProjectMetrics, TeamMetrics, TeamVelocity, BurndownChartData } from '../../../types/scrum';
import StatusBadge from '../common/StatusBadge';
import ProgressBar from '../common/ProgressBar';
import LoadingSpinner from '../common/LoadingSpinner';

interface ProjectDashboardProps {
  projectId: number;
}

const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ projectId }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics | null>(null);
  const [velocity, setVelocity] = useState<TeamVelocity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [
          projectResponse,
          metricsResponse,
          teamMetricsResponse,
          velocityResponse
        ] = await Promise.all([
          scrumService.getProjectById(projectId),
          scrumService.getProjectMetrics(projectId),
          scrumService.getProjectTeamMetrics(projectId),
          scrumService.getProjectVelocity(projectId)
        ]);

        if (projectResponse.success && projectResponse.data) {
          setProject(projectResponse.data.project);
        }

        if (metricsResponse.success && metricsResponse.data) {
          setMetrics(metricsResponse.data.metrics);
        }

        if (teamMetricsResponse.success && teamMetricsResponse.data) {
          setTeamMetrics(teamMetricsResponse.data.teamMetrics);
        }

        if (velocityResponse.success && velocityResponse.data) {
          setVelocity(velocityResponse.data.teamVelocity);
        }

      } catch (err: any) {
        setError(err.message || 'Error al cargar el dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [projectId]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No definida';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getProjectProgress = () => {
    if (!metrics) return { progress: 0, completed: 0, total: 0 };
    
    const totalTasks = metrics.tasks.total;
    const completedTasks = metrics.tasks.byStatus.DONE || 0;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    return { progress, completed: completedTasks, total: totalTasks };
  };

  const getSprintProgress = () => {
    if (!metrics) return { progress: 0, completed: 0, total: 0 };
    
    const totalSprints = metrics.sprints.total;
    const completedSprints = metrics.sprints.byStatus.COMPLETED || 0;
    const progress = totalSprints > 0 ? (completedSprints / totalSprints) * 100 : 0;
    
    return { progress, completed: completedSprints, total: totalSprints };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" text="Cargando dashboard..." />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-6 max-w-md mx-auto">
          <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-medium text-white mb-2">Error al cargar dashboard</h3>
          <p className="text-red-200 mb-4">{error || 'Proyecto no encontrado'}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const projectProgress = getProjectProgress();
  const sprintProgress = getSprintProgress();

  return (
    <div className="space-y-6">
      {/* Header del Dashboard */}
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-r from-[#0EA5E9] to-[#0264C5] rounded-xl flex items-center justify-center text-white">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Dashboard - {project.name}</h1>
              <div className="flex items-center space-x-4 text-sm text-blue-300">
                <StatusBadge status={project.status} type="project" size="sm" />
                <span>Creado: {formatDate(project.createdAt)}</span>
                <span>Actualizado: {formatDate(project.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {project.description && (
          <p className="text-blue-200 mb-4">{project.description}</p>
        )}

        {/* Progreso general del proyecto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <ProgressBar 
              progress={projectProgress.progress} 
              completed={projectProgress.completed}
              total={projectProgress.total}
              label="Progreso de tareas"
              size="lg"
              color="blue"
              showPercentage={true}
              showNumbers={true}
            />
          </div>
          <div>
            <ProgressBar 
              progress={sprintProgress.progress} 
              completed={sprintProgress.completed}
              total={sprintProgress.total}
              label="Progreso de sprints"
              size="lg"
              color="green"
              showPercentage={true}
              showNumbers={true}
            />
          </div>
        </div>
      </div>

      {/* Métricas principales */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Épicas */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Épicas</h3>
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            
            <div className="text-3xl font-bold text-white mb-2">{metrics.epics.total}</div>
            
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-blue-300">
                <span>Completadas:</span>
                <span>{metrics.epics.byStatus.COMPLETED || 0}</span>
              </div>
              <div className="flex justify-between text-blue-300">
                <span>En progreso:</span>
                <span>{metrics.epics.byStatus.IN_PROGRESS || 0}</span>
              </div>
              <div className="flex justify-between text-blue-300">
                <span>Listas:</span>
                <span>{metrics.epics.byStatus.READY || 0}</span>
              </div>
            </div>
          </div>

          {/* Historias de Usuario */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Historias</h3>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            
            <div className="text-3xl font-bold text-white mb-2">{metrics.userStories.total}</div>
            
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-blue-300">
                <span>Story Points:</span>
                <span>{metrics.userStories.totalPoints}</span>
              </div>
              <div className="flex justify-between text-blue-300">
                <span>En sprints:</span>
                <span>{metrics.userStories.inSprints}</span>
              </div>
              <div className="flex justify-between text-blue-300">
                <span>Sin asignar:</span>
                <span>{metrics.userStories.notInSprints}</span>
              </div>
            </div>
          </div>

          {/* Sprints */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Sprints</h3>
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            
            <div className="text-3xl font-bold text-white mb-2">{metrics.sprints.total}</div>
            
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-blue-300">
                <span>Activos:</span>
                <span>{metrics.sprints.byStatus.ACTIVE || 0}</span>
              </div>
              <div className="flex justify-between text-blue-300">
                <span>Completados:</span>
                <span>{metrics.sprints.byStatus.COMPLETED || 0}</span>
              </div>
              <div className="flex justify-between text-blue-300">
                <span>Velocity promedio:</span>
                <span>{metrics.sprints.averageVelocity.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Tareas */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Tareas</h3>
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
            </div>
            
            <div className="text-3xl font-bold text-white mb-2">{metrics.tasks.total}</div>
            
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-blue-300">
                <span>Completadas:</span>
                <span>{metrics.tasks.byStatus.DONE || 0}</span>
              </div>
              <div className="flex justify-between text-blue-300">
                <span>En progreso:</span>
                <span>{metrics.tasks.byStatus.IN_PROGRESS || 0}</span>
              </div>
              <div className="flex justify-between text-blue-300">
                <span>Horas estimadas:</span>
                <span>{metrics.tasks.totalEstimatedHours}h</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Equipo y Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Métricas del equipo */}
        {teamMetrics && (
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Métricas del Equipo</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-blue-200">Tamaño del equipo:</span>
                <span className="text-white font-medium">{teamMetrics.teamSize} miembros</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-blue-200">Tasa de completitud:</span>
                <span className="text-white font-medium">{teamMetrics.taskMetrics.completionRate}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-blue-200">Tiempo promedio:</span>
                <span className="text-white font-medium">{teamMetrics.taskMetrics.averageCompletionTime.toFixed(1)} días</span>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-white font-medium mb-2">Miembros del equipo:</h4>
              <div className="space-y-2">
                {teamMetrics.teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-blue-200">{member.name}</span>
                    </div>
                    <span className="text-blue-300 text-xs">{typeof member.role === 'object' && member.role?.name ? member.role.name : (typeof member.role === 'string' ? member.role : 'Sin rol')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Velocity del equipo */}
        {velocity && (
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Velocity del Equipo</h3>
            
            <div className="mb-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-2">{velocity.averageVelocity.toFixed(1)}</div>
                <div className="text-blue-200">Story Points promedio</div>
                <div className="text-sm text-blue-300 mt-1">Basado en {velocity.sprintCount} sprints</div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-white font-medium">Últimos sprints:</h4>
              {velocity.velocities.slice(-5).map((vel) => (
                <div key={vel.sprintId} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="text-blue-200">{vel.sprintName}</div>
                    <div className="text-xs text-blue-300">
                      {formatDate(vel.startDate)} - {formatDate(vel.endDate)}
                    </div>
                  </div>
                  <div className="text-white font-medium">{vel.storyPointsCompleted} pts</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Acciones rápidas */}
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Acciones Rápidas</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg transition-colors text-left">
            <div className="flex items-center space-x-2 mb-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-blue-300 font-medium">Nueva Épica</span>
            </div>
            <p className="text-blue-200 text-sm">Crear una nueva épica</p>
          </button>
          
          <button className="p-4 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg transition-colors text-left">
            <div className="flex items-center space-x-2 mb-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-green-300 font-medium">Nuevo Sprint</span>
            </div>
            <p className="text-green-200 text-sm">Crear un nuevo sprint</p>
          </button>
          
          <button className="p-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg transition-colors text-left">
            <div className="flex items-center space-x-2 mb-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-purple-300 font-medium">Nueva Historia</span>
            </div>
            <p className="text-purple-200 text-sm">Crear historia de usuario</p>
          </button>
          
          <button className="p-4 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-lg transition-colors text-left">
            <div className="flex items-center space-x-2 mb-2">
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-orange-300 font-medium">Ver Reportes</span>
            </div>
            <p className="text-orange-200 text-sm">Analíticas del proyecto</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectDashboard;
