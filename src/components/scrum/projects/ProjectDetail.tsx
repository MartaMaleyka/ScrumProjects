import React, { useState, useEffect } from 'react';
import { scrumService } from '../../../services/scrumService';
import type { Project, Epic, Sprint, ProjectMetrics } from '../../../types/scrum';
import StatusBadge from '../common/StatusBadge';
import ProgressBar from '../common/ProgressBar';
import LoadingSpinner from '../common/LoadingSpinner';
import EpicList from '../epics/EpicList';
import UserStoryList from '../stories/UserStoryList';
import SprintList from '../sprints/SprintList';
import KanbanBoard from '../tasks/KanbanBoard';

interface ProjectDetailProps {
  projectId: number;
  onNavigate?: (view: string) => void;
}

type TabType = 'overview' | 'epics' | 'stories' | 'sprints' | 'tasks' | 'analytics';

const ProjectDetail: React.FC<ProjectDetailProps> = ({ projectId, onNavigate }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [projectResponse, metricsResponse] = await Promise.all([
          scrumService.getProjectById(projectId),
          scrumService.getProjectMetrics(projectId)
        ]);

        if (projectResponse.success && projectResponse.data) {
          setProject(projectResponse.data.project);
        }

        if (metricsResponse.success && metricsResponse.data) {
          setMetrics(metricsResponse.data.metrics);
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar el proyecto');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No definida';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getProgressData = () => {
    if (!metrics) return { progress: 0, completed: 0, total: 0 };
    
    const totalTasks = metrics.tasks.total;
    const completedTasks = metrics.tasks.byStatus.DONE || 0;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    return { progress, completed: completedTasks, total: totalTasks };
  };

  const tabs: { id: TabType; label: string; icon: React.ReactElement; count?: number }[] = [
    {
      id: 'overview',
      label: 'Resumen',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 'epics',
      label: 'Épicas',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      count: metrics?.epics.total
    },
    {
      id: 'stories',
      label: 'Historias',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      count: metrics?.userStories.total
    },
    {
      id: 'sprints',
      label: 'Sprints',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      count: metrics?.sprints.total
    },
    {
      id: 'tasks',
      label: 'Tareas',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      count: metrics?.tasks.total
    },
    {
      id: 'analytics',
      label: 'Analíticas',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" text="Cargando proyecto..." />
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
          <h3 className="text-lg font-medium text-white mb-2">Error al cargar proyecto</h3>
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

  const { progress, completed, total } = getProgressData();

  return (
    <div className="space-y-6">
      {/* Header del Proyecto */}
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-gradient-to-r from-[#0EA5E9] to-[#0264C5] rounded-xl flex items-center justify-center text-white">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-bold text-white">{project.name}</h1>
                <StatusBadge status={project.status} type="project" />
              </div>
              <p className="text-blue-200 mb-3">{project.description || 'Sin descripción'}</p>
              
              <div className="flex items-center space-x-6 text-sm text-blue-300">
                <div>Inicio: {formatDate(project.startDate)}</div>
                <div>Fin: {formatDate(project.endDate)}</div>
                <div>Creado: {formatDate(project.createdAt)}</div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Editar</span>
            </button>
            
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Configurar</span>
            </button>
          </div>
        </div>

        {/* Progreso del proyecto */}
        {metrics && (
          <div className="mt-6 pt-6 border-t border-white/20">
            <ProgressBar 
              progress={progress} 
              completed={completed}
              total={total}
              label="Progreso general del proyecto"
              size="lg"
              color="blue"
              showPercentage={true}
              showNumbers={true}
            />
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-2">
        <nav className="flex space-x-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#FF9100]/20 text-white border border-[#FF9100]/50 shadow-sm'
                  : 'text-blue-200 hover:text-[#FF9100] hover:bg-white/10'
              }`}
            >
              {tab.icon}
              <span className="font-medium">{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  activeTab === tab.id 
                    ? 'bg-[#FF9100]/30 text-white' 
                    : 'bg-blue-500/20 text-blue-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna izquierda */}
            <div className="space-y-6">
              {/* Información del proyecto */}
              <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Información del Proyecto</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-200">Estado:</span>
                    <StatusBadge status={project.status} type="project" size="sm" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-200">Inicio:</span>
                    <span className="text-white">{formatDate(project.startDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-200">Fin estimado:</span>
                    <span className="text-white">{formatDate(project.endDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-200">Creado:</span>
                    <span className="text-white">{formatDate(project.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Acciones rápidas */}
              <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Acciones Rápidas</h3>
                <div className="space-y-2">
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Nueva Épica</span>
                  </button>
                  <button className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Nuevo Sprint</span>
                  </button>
                  <button className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Nueva Historia</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Columna central */}
            <div className="space-y-6">
              {/* Métricas del proyecto */}
              {metrics && (
                <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Métricas del Proyecto</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-300">{metrics.epics.total}</div>
                      <div className="text-xs text-blue-200">Épicas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-300">{metrics.userStories.total}</div>
                      <div className="text-xs text-blue-200">Historias</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-300">{metrics.sprints.total}</div>
                      <div className="text-xs text-blue-200">Sprints</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-300">{metrics.tasks.total}</div>
                      <div className="text-xs text-blue-200">Tareas</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Últimas actividades */}
              <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Actividad Reciente</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-blue-200">Proyecto creado</span>
                    <span className="text-blue-300 text-xs">{formatDate(project.createdAt)}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-blue-200">Estado actualizado</span>
                    <span className="text-blue-300 text-xs">{formatDate(project.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna derecha */}
            <div className="space-y-6">
              {/* Team performance */}
              <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Rendimiento del Equipo</h3>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-2">{project._count?.members || 0}</div>
                  <div className="text-blue-200 text-sm">Miembros del equipo</div>
                </div>
              </div>

              {/* Próximos hitos */}
              <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Próximos Hitos</h3>
                <div className="space-y-3 text-sm">
                  {project.endDate && (
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      <span className="text-blue-200">Fin del proyecto</span>
                      <span className="text-blue-300 text-xs">{formatDate(project.endDate)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'epics' && (
          <EpicList projectId={projectId} />
        )}

        {activeTab === 'stories' && (
          <UserStoryList projectId={projectId} />
        )}

        {activeTab === 'sprints' && (
          <SprintList 
            projectId={projectId} 
            onSprintSelect={(sprint) => {
              setSelectedSprint(sprint);
              setActiveTab('tasks');
            }}
          />
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-6">
            {selectedSprint && (
              <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Tablero Kanban - {selectedSprint.name}
                </h3>
                <p className="text-blue-200 text-sm">
                  {selectedSprint.description}
                </p>
              </div>
            )}
            <KanbanBoard 
              projectId={projectId}
              sprintId={selectedSprint?.id}
            />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold text-white mb-2">Analíticas del Proyecto</h3>
            <p className="text-blue-200">Los gráficos y métricas detalladas se mostrarán aquí</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetail;
