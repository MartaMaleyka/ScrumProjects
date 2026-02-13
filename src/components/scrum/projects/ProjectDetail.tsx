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
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar proyecto</h3>
          <p className="text-red-600 mb-4">{error || 'Proyecto no encontrado'}</p>
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

  const cardClass = 'bg-white border border-gray-200 rounded-xl shadow-sm p-6';

  return (
    <div className="space-y-6">
      {/* Header del Proyecto */}
      <div className={cardClass}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 flex-shrink-0 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white shadow-sm">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
                <StatusBadge status={project.status} type="project" />
              </div>
              <p className="text-gray-500 text-sm mb-3">{project.description || 'Sin descripción'}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <span>Inicio: {formatDate(project.startDate)}</span>
                <span>Fin: {formatDate(project.endDate)}</span>
                <span>Creado: {formatDate(project.createdAt)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configurar
            </button>
          </div>
        </div>

        {metrics && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <ProgressBar
              progress={progress}
              completed={completed}
              total={total}
              label="Progreso general del proyecto"
              size="lg"
              color="blue"
              showPercentage
              showNumbers
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-2">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 whitespace-nowrap text-sm font-medium ${
                activeTab === tab.id
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-indigo-200/80 text-indigo-800' : 'bg-gray-200 text-gray-600'
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
            <div className="space-y-6">
              <div className={cardClass}>
                <h3 className="text-base font-semibold text-gray-900 mb-4">Información del Proyecto</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Estado</span>
                    <StatusBadge status={project.status} type="project" size="sm" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Inicio</span>
                    <span className="text-gray-900">{formatDate(project.startDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fin estimado</span>
                    <span className="text-gray-900">{formatDate(project.endDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Creado</span>
                    <span className="text-gray-900">{formatDate(project.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className={cardClass}>
                <h3 className="text-base font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
                <div className="space-y-2">
                  <button className="w-full px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Nueva Épica
                  </button>
                  <button className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Nuevo Sprint
                  </button>
                  <button className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Nueva Historia
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {metrics && (
                <div className={cardClass}>
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Métricas del Proyecto</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg py-3 text-center">
                      <div className="text-xl font-bold text-indigo-600">{metrics.epics.total}</div>
                      <div className="text-xs text-gray-500">Épicas</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg py-3 text-center">
                      <div className="text-xl font-bold text-indigo-600">{metrics.userStories.total}</div>
                      <div className="text-xs text-gray-500">Historias</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg py-3 text-center">
                      <div className="text-xl font-bold text-indigo-600">{metrics.sprints.total}</div>
                      <div className="text-xs text-gray-500">Sprints</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg py-3 text-center">
                      <div className="text-xl font-bold text-indigo-600">{metrics.tasks.total}</div>
                      <div className="text-xs text-gray-500">Tareas</div>
                    </div>
                  </div>
                </div>
              )}

              <div className={cardClass}>
                <h3 className="text-base font-semibold text-gray-900 mb-4">Actividad Reciente</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <span className="text-gray-600">Proyecto creado</span>
                    <span className="text-gray-400 text-xs ml-auto">{formatDate(project.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                    <span className="text-gray-600">Estado actualizado</span>
                    <span className="text-gray-400 text-xs ml-auto">{formatDate(project.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className={cardClass}>
                <h3 className="text-base font-semibold text-gray-900 mb-4">Rendimiento del Equipo</h3>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{project._count?.members || 0}</div>
                  <div className="text-sm text-gray-500">Miembros del equipo</div>
                </div>
              </div>

              <div className={cardClass}>
                <h3 className="text-base font-semibold text-gray-900 mb-4">Próximos Hitos</h3>
                <div className="space-y-3 text-sm">
                  {project.endDate && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-amber-500 rounded-full" />
                      <span className="text-gray-600">Fin del proyecto</span>
                      <span className="text-gray-400 text-xs ml-auto">{formatDate(project.endDate)}</span>
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
              <div className={cardClass}>
                <h3 className="text-base font-semibold text-gray-900 mb-2">
                  Tablero Kanban — {selectedSprint.name}
                </h3>
                <p className="text-gray-500 text-sm">
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
          <div className={`${cardClass} text-center py-12`}>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Analíticas del Proyecto</h3>
            <p className="text-gray-500">Los gráficos y métricas detalladas se mostrarán aquí</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetail;
