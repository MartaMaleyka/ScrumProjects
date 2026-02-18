import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { scrumService } from '../../../services/scrumService';
import type { Project, Epic, Sprint, ProjectMetrics, ProjectMember } from '../../../types/scrum';
import StatusBadge from '../common/StatusBadge';
import ProgressBar from '../common/ProgressBar';
import LoadingSpinner from '../common/LoadingSpinner';
import EpicList from '../epics/EpicList';
import UserStoryList from '../stories/UserStoryList';
import SprintList from '../sprints/SprintList';
import KanbanBoard from '../tasks/KanbanBoard';
import AddProjectMemberModal from '../members/AddProjectMemberModal';
import ProjectFormImproved from './ProjectFormImproved';
import ProjectAnalytics from './ProjectAnalytics';
import ProjectGitHubSection from './ProjectGitHubSection';
import { RoadmapView, GanttChart, ReleasePlanner } from '../roadmap';
import { isFeatureEnabled } from '../../../config/features';
import UpgradeRequired from '../../common/UpgradeRequired';

interface ProjectDetailProps {
  projectId: number;
  onNavigate?: (view: string) => void;
}

type TabType = 'overview' | 'epics' | 'stories' | 'sprints' | 'tasks' | 'analytics' | 'members' | 'roadmap' | 'gantt' | 'releases';

const ProjectDetail: React.FC<ProjectDetailProps> = ({ projectId, onNavigate }) => {
  const { t } = useTranslation();
  const [project, setProject] = useState<Project | null>(null);
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);

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
        setError(err.message || t('projects.detail.loadError', 'Error al cargar el proyecto'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectData();
    loadMembers();
  }, [projectId]);

  const loadMembers = async () => {
    try {
      setIsLoadingMembers(true);
      const response = await scrumService.getProjectMembers(projectId);
      if (response.success && response.data) {
        setMembers(response.data.members || []);
      }
    } catch (err) {
      console.error('Error al cargar miembros:', err);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleMemberAdded = () => {
    loadMembers();
    // Refrescar el proyecto para actualizar el contador de miembros
    scrumService.getProjectById(projectId).then(response => {
      if (response.success && response.data) {
        setProject(response.data.project);
      }
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('common.notDefined', 'No definida');
    const locale = t('common.locale', 'es-ES') as string;
    return new Date(dateString).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getProgressData = () => {
    if (!metrics) return { progress: 0, completed: 0, total: 0 };
    
    const totalTasks = metrics.tasks.total;
    const completedTasks = metrics.tasks.byStatus.COMPLETED || 0;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    return { progress, completed: completedTasks, total: totalTasks };
  };

  // Definir todas las tabs posibles
  const allTabs: { id: TabType; label: string; icon: React.ReactElement; count?: number; isPremium?: boolean; featureKey?: 'roadmap' | 'gantt' | 'releases' }[] = [
    {
      id: 'overview',
      label: t('projects.detail.overview', 'Resumen'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 'epics',
      label: t('epics.title', 'Épicas'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      count: metrics?.epics.total
    },
    {
      id: 'stories',
      label: t('stories.title', 'Historias'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      count: metrics?.userStories.total
    },
    {
      id: 'sprints',
      label: t('sprints.title', 'Sprints'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      count: metrics?.sprints.total
    },
    {
      id: 'tasks',
      label: t('tasks.title', 'Tareas'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      count: metrics?.tasks.total
    },
    {
      id: 'members',
      label: t('projects.detail.members', 'Miembros'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      count: members.length
    },
    {
      id: 'analytics',
      label: t('projects.detail.analytics', 'Analíticas'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 'roadmap',
      label: 'Roadmap',
      isPremium: true,
      featureKey: 'roadmap',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 18.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V5.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      )
    },
    {
      id: 'gantt',
      label: 'Gantt',
      isPremium: true,
      featureKey: 'gantt',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    {
      id: 'releases',
      label: 'Releases',
      isPremium: true,
      featureKey: 'releases',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      )
    }
  ];

  // Filtrar tabs premium según feature flags
  const tabs = allTabs.filter(tab => {
    if (tab.isPremium && tab.featureKey) {
      return isFeatureEnabled(tab.featureKey);
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" text={t('projects.detail.loading', 'Cargando proyecto...')} />
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('projects.detail.loadError', 'Error al cargar proyecto')}</h3>
          <p className="text-red-600 mb-4">{error || t('projects.detail.notFound', 'Proyecto no encontrado')}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {t('common.retry', 'Reintentar')}
          </button>
        </div>
      </div>
    );
  }

  const { progress, completed, total } = getProgressData();

  const cardClass = 'bg-white border border-gray-200 rounded-xl shadow-sm p-6';

  return (
    <div className="space-y-6">
      {/* Header del Proyecto - Mejorado */}
      <div className="bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 px-6 py-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 flex-shrink-0 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white shadow-xl border-2 border-white/30">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-white drop-shadow-lg">{project.name}</h1>
                  <StatusBadge status={project.status} type="project" />
                </div>
                <p className="text-white/90 text-sm leading-relaxed max-w-2xl">
                  {project.description || t('common.noDescription', 'Sin descripción')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button 
                onClick={() => setShowEditProjectModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/30 transition-all text-sm font-medium shadow-md hover:shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {t('common.edit', 'Editar')}
              </button>
              <button 
                onClick={() => setShowEditProjectModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-indigo-600 transition-all text-sm font-semibold shadow-md hover:shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {t('projects.detail.configure', 'Configurar')}
              </button>
            </div>
          </div>
        </div>

        {/* Información del proyecto */}
        <div className="px-6 py-5 bg-white/50 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium">{t('projects.start', 'Inicio')}</div>
                <div className="text-sm font-semibold text-gray-900">{formatDate(project.startDate)}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium">{t('projects.detail.estimatedEnd', 'Fin estimado')}</div>
                <div className="text-sm font-semibold text-gray-900">{formatDate(project.endDate)}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium">{t('projects.detail.created', 'Creado')}</div>
                <div className="text-sm font-semibold text-gray-900">{formatDate(project.createdAt)}</div>
              </div>
            </div>
          </div>

          {metrics && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">{t('projects.progress', 'Progreso general del proyecto')}</span>
                <span className="text-sm font-bold text-indigo-600">{Math.round(progress)}%</span>
              </div>
              <ProgressBar
                progress={progress}
                completed={completed}
                total={total}
                label=""
                size="lg"
                color="blue"
                showPercentage={false}
                showNumbers={false}
              />
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span>{completed} {t('projects.detail.of', 'de')} {total} {t('projects.detail.tasksCompleted', 'tareas completadas')}</span>
                <span>{total - completed} {t('projects.detail.pending', 'pendientes')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs - Mejorado */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <style>{`
          .tabs-scrollbar::-webkit-scrollbar {
            height: 6px;
          }
          .tabs-scrollbar::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 3px;
          }
          .tabs-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
          }
          .tabs-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}</style>
        <nav className="flex gap-2 overflow-x-auto px-4 py-3 tabs-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 whitespace-nowrap text-sm font-medium relative ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                  {tab.icon}
                </div>
                <span className="font-semibold">{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold min-w-[24px] text-center ${
                    isActive 
                      ? 'bg-white/30 text-white backdrop-blur-sm' 
                      : 'bg-gray-200 text-gray-700 group-hover:bg-gray-300'
                  }`}>
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/50 rounded-full"></div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              <div className={cardClass}>
                <h3 className="text-base font-semibold text-gray-900 mb-4">{t('projects.detail.projectInfo', 'Información del Proyecto')}</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">{t('projects.status', 'Estado')}</span>
                    <StatusBadge status={project.status} type="project" size="sm" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('projects.start', 'Inicio')}</span>
                    <span className="text-gray-900">{formatDate(project.startDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('projects.detail.estimatedEnd', 'Fin estimado')}</span>
                    <span className="text-gray-900">{formatDate(project.endDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('projects.detail.created', 'Creado')}</span>
                    <span className="text-gray-900">{formatDate(project.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Acciones Rápidas - Solo mostrar si las features están habilitadas */}
              {(isFeatureEnabled('gantt') || isFeatureEnabled('roadmap') || isFeatureEnabled('releases')) && (
                <div className={cardClass}>
                  <h3 className="text-base font-semibold text-gray-900 mb-4">{t('projects.detail.quickActions', 'Acciones Rápidas')}</h3>
                  <div className="space-y-2">
                    {isFeatureEnabled('gantt') && (
                      <button 
                        onClick={() => setActiveTab('gantt')}
                        className="w-full px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-sm hover:shadow-md"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        {t('projects.detail.viewGantt', 'Ver Gantt')}
                      </button>
                    )}
                    {isFeatureEnabled('roadmap') && (
                      <button 
                        onClick={() => setActiveTab('roadmap')}
                        className="w-full px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-sm hover:shadow-md"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 18.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V5.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        {t('projects.detail.viewRoadmap', 'Ver Roadmap')}
                      </button>
                    )}
                    {isFeatureEnabled('releases') && (
                      <button 
                        onClick={() => setActiveTab('releases')}
                        className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-sm hover:shadow-md"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        {t('projects.detail.releases', 'Releases')}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Integración GitHub - Premium Feature */}
              {isFeatureEnabled('github') ? (
                <ProjectGitHubSection projectId={projectId} />
              ) : null}
            </div>

            <div className="space-y-6">
              {metrics && (
                <div className={cardClass}>
                  <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    {t('projects.detail.metrics', 'Métricas del Proyecto')}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div 
                      className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200 hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => setActiveTab('epics')}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center shadow-sm">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <svg className="w-4 h-4 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <div className="text-2xl font-bold text-indigo-700 mb-1">{metrics.epics.total}</div>
                      <div className="text-xs font-medium text-indigo-600">{t('epics.title', 'Épicas')}</div>
                    </div>
                    <div 
                      className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200 hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => setActiveTab('stories')}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center shadow-sm">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <svg className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <div className="text-2xl font-bold text-purple-700 mb-1">{metrics.userStories.total}</div>
                      <div className="text-xs font-medium text-purple-600">{t('stories.title', 'Historias')}</div>
                    </div>
                    <div 
                      className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200 hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => setActiveTab('sprints')}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center shadow-sm">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <svg className="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <div className="text-2xl font-bold text-blue-700 mb-1">{metrics.sprints.total}</div>
                      <div className="text-xs font-medium text-blue-600">{t('sprints.title', 'Sprints')}</div>
                    </div>
                    <div 
                      className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200 hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => setActiveTab('tasks')}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center shadow-sm">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                        </div>
                        <svg className="w-4 h-4 text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <div className="text-2xl font-bold text-green-700 mb-1">{metrics.tasks.total}</div>
                      <div className="text-xs font-medium text-green-600">{t('tasks.title', 'Tareas')}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className={cardClass}>
                <h3 className="text-base font-semibold text-gray-900 mb-4">{t('projects.detail.recentActivity', 'Actividad Reciente')}</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <span className="text-gray-600">{t('projects.detail.projectCreated', 'Proyecto creado')}</span>
                    <span className="text-gray-400 text-xs ml-auto">{formatDate(project.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                    <span className="text-gray-600">{t('projects.detail.statusUpdated', 'Estado actualizado')}</span>
                    <span className="text-gray-400 text-xs ml-auto">{formatDate(project.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className={cardClass}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900">{t('projects.detail.teamMembers', 'Miembros del Equipo')}</h3>
                  <button
                    onClick={() => setShowAddMemberModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>{t('projects.detail.add', 'Agregar')}</span>
                  </button>
                </div>
                
                {isLoadingMembers ? (
                  <div className="flex items-center justify-center py-4">
                    <LoadingSpinner size="sm" text={t('projects.detail.loadingMembers', 'Cargando miembros...')} />
                  </div>
                ) : members.length > 0 ? (
                  <div className="space-y-2">
                    {members.slice(0, 5).map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                          {member.user?.name?.charAt(0).toUpperCase() || member.user?.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {member.user?.name || member.user?.email || t('projects.detail.unknownUser', 'Usuario desconocido')}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {member.role.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    ))}
                    {members.length > 5 && (
                      <div className="text-xs text-gray-500 text-center pt-2">
                        +{members.length - 5} {members.length - 5 === 1 ? t('projects.detail.moreMember', 'miembro más') : t('projects.detail.moreMembers', 'miembros más')}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-sm text-gray-500 mb-2">{t('projects.detail.noMembers', 'No hay miembros en el equipo')}</div>
                    <button
                      onClick={() => setShowAddMemberModal(true)}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      {t('projects.detail.addFirstMember', 'Agregar primer miembro')}
                    </button>
                  </div>
                )}
              </div>

              <div className={cardClass}>
                <h3 className="text-base font-semibold text-gray-900 mb-4">{t('projects.detail.upcomingMilestones', 'Próximos Hitos')}</h3>
                <div className="space-y-3 text-sm">
                  {project.endDate && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-amber-500 rounded-full" />
                      <span className="text-gray-600">{t('projects.detail.projectEnd', 'Fin del proyecto')}</span>
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
                  {t('projects.detail.kanbanBoard', 'Tablero Kanban')} — {selectedSprint.name}
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
          <ProjectAnalytics metrics={metrics} isLoading={isLoading} />
        )}

        {activeTab === 'roadmap' && (
          isFeatureEnabled('roadmap') ? (
            <RoadmapView projectId={projectId} />
          ) : (
            <UpgradeRequired featureName="Roadmap" />
          )
        )}

        {activeTab === 'gantt' && (
          isFeatureEnabled('gantt') ? (
            <GanttChart projectId={projectId} showDependencies={true} showCriticalPath={true} />
          ) : (
            <UpgradeRequired featureName="Gantt" />
          )
        )}

        {activeTab === 'releases' && (
          isFeatureEnabled('releases') ? (
            <ReleasePlanner projectId={projectId} />
          ) : (
            <UpgradeRequired featureName="Releases" />
          )
        )}

        {activeTab === 'members' && (
          <div className={cardClass}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{t('projects.detail.projectMembers', 'Miembros del Proyecto')}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {members.length} {members.length === 1 ? t('projects.detail.memberInTeam', 'miembro en el equipo') : t('projects.detail.membersInTeam', 'miembros en el equipo')}
                </p>
              </div>
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-medium transition-colors shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>{t('projects.detail.addMember', 'Agregar Miembro')}</span>
              </button>
            </div>

            {isLoadingMembers ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" text={t('projects.detail.loadingMembers', 'Cargando miembros...')} />
              </div>
            ) : members.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                          {member.user?.name?.charAt(0).toUpperCase() || member.user?.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {member.user?.name || member.user?.email || t('projects.detail.unknownUser', 'Usuario desconocido')}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {member.user?.email}
                          </div>
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                              {member.role.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (confirm(t('projects.detail.confirmRemoveMember', '¿Estás seguro de que deseas eliminar a {name} del proyecto?', { name: member.user?.name || member.user?.email || t('projects.detail.unknownUser', 'Usuario desconocido') }))) {
                            try {
                              await scrumService.removeProjectMember(projectId, member.id);
                              handleMemberAdded();
                            } catch (err) {
                              alert(t('projects.detail.removeMemberError', 'Error al eliminar el miembro'));
                            }
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                        title={t('projects.detail.removeMember', 'Eliminar miembro')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                      {t('projects.detail.joined', 'Se unió')}: {new Date(member.joinedAt).toLocaleDateString(t('common.locale', 'es-ES') as string, {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('projects.detail.noMembersInProject', 'No hay miembros en el proyecto')}</h3>
                <p className="text-gray-500 mb-4">{t('projects.detail.startAddingMembers', 'Comienza agregando miembros a tu equipo de proyecto')}</p>
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-medium transition-colors shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>{t('projects.detail.addFirstMember', 'Agregar Primer Miembro')}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal para agregar miembros */}
      {ReactDOM.createPortal(
        <AddProjectMemberModal
          projectId={projectId}
          isOpen={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)}
          onMemberAdded={handleMemberAdded}
        />,
        document.body
      )}

      {/* Modal para editar proyecto */}
      {showEditProjectModal && project && ReactDOM.createPortal(
        <ProjectFormImproved
          projectId={project.id.toString()}
          mode="edit"
          initialData={{
            name: project.name,
            description: project.description || '',
            status: project.status,
            startDate: project.startDate || '',
            endDate: project.endDate || ''
          }}
          asModal={true}
          isOpen={showEditProjectModal}
          onClose={() => setShowEditProjectModal(false)}
          onSuccess={(updatedProject) => {
            setShowEditProjectModal(false);
            // Refrescar los datos del proyecto
            scrumService.getProjectById(projectId).then(response => {
              if (response.success && response.data) {
                setProject(response.data.project);
              }
            });
            scrumService.getProjectMetrics(projectId).then(response => {
              if (response.success && response.data) {
                setMetrics(response.data.metrics);
              }
            });
          }}
        />,
        document.body
      )}
    </div>
  );
};

export default ProjectDetail;
