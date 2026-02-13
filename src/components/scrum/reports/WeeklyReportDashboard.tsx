import React, { useState, useEffect, useMemo } from 'react';
import AppSidebarLayout from '../../layout/AppSidebarLayout';
import { API_BASE_URL, authenticatedRequest } from '../../../config/api';
import ScrumBreadcrumbs from '../common/ScrumBreadcrumbs';

interface Project {
  id: number;
  name: string;
  description?: string | null;
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    epics: number;
    sprints: number;
    members: number;
    userStories: number;
  };
  sprints?: Sprint[];
  epics?: Epic[];
}

interface Sprint {
  id: number;
  name: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  goal?: string | null;
  _count?: {
    userStories: number;
    tasks: number;
  };
}

interface Epic {
  id: number;
  title: string;
  status: string;
  priority: string;
  _count?: {
    userStories: number;
  };
}

interface ProjectDetail extends Project {
  selected?: boolean;
}

const WeeklyReportDashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectDetail | null>(null);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'overview' | 'timeline' | 'details'>('overview');

  // Cargar proyectos
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await authenticatedRequest(`${API_BASE_URL}/scrum/projects`);
        const projectsData = response.projects || response.data?.projects || [];
        
        // Cargar datos adicionales para cada proyecto
        const projectsWithDetails = await Promise.all(
          projectsData.map(async (project: Project) => {
            try {
              const [sprintsRes, epicsRes] = await Promise.all([
                authenticatedRequest(`${API_BASE_URL}/scrum/projects/${project.id}/sprints`).catch(() => ({ sprints: [] })),
                authenticatedRequest(`${API_BASE_URL}/scrum/projects/${project.id}/epics`).catch(() => ({ epics: [] }))
              ]);

              return {
                ...project,
                sprints: sprintsRes.sprints || sprintsRes.data?.sprints || [],
                epics: epicsRes.epics || epicsRes.data?.epics || []
              };
            } catch (err) {
              return project;
            }
          })
        );

        setProjects(projectsWithDetails);
        setFilteredProjects(projectsWithDetails);
      } catch (err: any) {
        setError(err.message || 'Error al cargar los proyectos');
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  // Filtrar proyectos
  useEffect(() => {
    let filtered = [...projects];

    // Filtro por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Filtro por rango de fechas
    const now = new Date();
    let startDate = new Date();
    
    switch (dateRange) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    filtered = filtered.filter(p => {
      if (!p.startDate && !p.endDate) return true;
      const projectStart = p.startDate ? new Date(p.startDate) : null;
      const projectEnd = p.endDate ? new Date(p.endDate) : null;
      
      if (projectStart && projectStart >= startDate) return true;
      if (projectEnd && projectEnd >= startDate) return true;
      if (projectStart && projectEnd && projectStart <= now && projectEnd >= startDate) return true;
      
      return false;
    });

    setFilteredProjects(filtered);
  }, [projects, statusFilter, dateRange]);

  // Calcular estadísticas
  const stats = useMemo(() => {
    const activeProjects = filteredProjects.filter(p => p.status === 'ACTIVE');
    const planningProjects = filteredProjects.filter(p => p.status === 'PLANNING');
    const onHoldProjects = filteredProjects.filter(p => p.status === 'ON_HOLD');
    const completedProjects = filteredProjects.filter(p => p.status === 'COMPLETED');

    const totalEpics = filteredProjects.reduce((sum, p) => sum + (p._count?.epics || 0), 0);
    const totalSprints = filteredProjects.reduce((sum, p) => sum + (p._count?.sprints || 0), 0);
    const totalStories = filteredProjects.reduce((sum, p) => sum + (p._count?.userStories || 0), 0);

    return {
      total: filteredProjects.length,
      active: activeProjects.length,
      planning: planningProjects.length,
      onHold: onHoldProjects.length,
      completed: completedProjects.length,
      totalEpics,
      totalSprints,
      totalStories
    };
  }, [filteredProjects]);

  // Manejar drill-down
  const handleProjectClick = (project: Project) => {
    if (selectedProject?.id === project.id) {
      setSelectedProject(null);
      setViewMode('overview');
    } else {
      setSelectedProject(project as ProjectDetail);
      setViewMode('details');
    }
  };

  const handleBackToOverview = () => {
    setSelectedProject(null);
    setViewMode('overview');
  };

  // Formatear fechas
  const formatDate = (dateString?: string | Date | null) => {
    if (!dateString) return 'Sin fecha';
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    return date.toLocaleDateString('es-PA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500';
      case 'PLANNING': return 'bg-blue-500';
      case 'ON_HOLD': return 'bg-yellow-500';
      case 'COMPLETED': return 'bg-gray-500';
      case 'CANCELLED': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Activo';
      case 'PLANNING': return 'Planificación';
      case 'ON_HOLD': return 'En Espera';
      case 'COMPLETED': return 'Completado';
      case 'CANCELLED': return 'Cancelado';
      default: return status;
    }
  };

  // Calcular posición en timeline
  const calculateTimelinePosition = (project: Project) => {
    const now = new Date();
    const start = project.startDate ? new Date(project.startDate) : new Date(project.createdAt);
    // Asegurar que end sea siempre un objeto Date
    const end = project.endDate ? new Date(project.endDate) : new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 días por defecto
    
    const rangeStart = new Date();
    switch (dateRange) {
      case 'week':
        rangeStart.setDate(now.getDate() - 7);
        break;
      case 'month':
        rangeStart.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        rangeStart.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        rangeStart.setFullYear(now.getFullYear() - 1);
        break;
    }

    const rangeEnd = now;
    const totalRange = rangeEnd.getTime() - rangeStart.getTime();
    const projectStart = Math.max(start.getTime(), rangeStart.getTime());
    const projectEnd = Math.min(end.getTime(), rangeEnd.getTime());
    
    const left = ((projectStart - rangeStart.getTime()) / totalRange) * 100;
    const width = ((projectEnd - projectStart) / totalRange) * 100;

    return { left: Math.max(0, left), width: Math.max(2, Math.min(100, width)) };
  };

  if (loading) {
    return (
      <AppSidebarLayout>
        <div className="h-full flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-blue-deep/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-blue-deep rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-neutral text-lg font-semibold">Cargando informe semanal...</p>
          </div>
        </div>
      </AppSidebarLayout>
    );
  }

  if (error) {
    return (
      <AppSidebarLayout>
        <div className="h-full flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md bg-white rounded-2xl p-8 shadow-soft border-2 border-red-200">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Error al cargar</h3>
            <p className="text-red-600 mb-6 font-semibold">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-blue-deep to-blue-light hover:from-blue-light hover:to-blue-deep text-white rounded-xl font-semibold transition-all duration-200 shadow-soft hover:shadow-medium focus:outline-none focus:ring-2 focus:ring-blue-deep focus:ring-offset-2"
            >
              Reintentar
            </button>
          </div>
        </div>
      </AppSidebarLayout>
    );
  }

  return (
    <AppSidebarLayout>
      <div className="h-full flex flex-col bg-gray-50">
        {/* Breadcrumbs */}
        <ScrumBreadcrumbs
          items={[
            {
              label: 'Proyectos',
              href: '/proyectos',
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              )
            },
            {
              label: 'Informe Semanal',
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )
            }
          ]}
        />

        {/* Header - Mejorado */}
        <div className="bg-white border-b-2 border-gray-200 shadow-soft px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                  Informe Semanal de Proyectos
                </h1>
                <p className="text-gray-neutral text-sm sm:text-base">
                  Vista ejecutiva para la Junta Directiva
                </p>
              </div>

              {/* Filtros - Mejorados */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Rango de fechas */}
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                  className="px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 bg-white hover:border-blue-light focus:outline-none focus:ring-2 focus:ring-blue-deep focus:ring-offset-2 focus:border-blue-deep transition-all duration-200"
                >
                  <option value="week">Última Semana</option>
                  <option value="month">Último Mes</option>
                  <option value="quarter">Último Trimestre</option>
                  <option value="year">Último Año</option>
                </select>

                {/* Filtro por estado */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 bg-white hover:border-blue-light focus:outline-none focus:ring-2 focus:ring-blue-deep focus:ring-offset-2 focus:border-blue-deep transition-all duration-200"
                >
                  <option value="all">Todos los Estados</option>
                  <option value="ACTIVE">Activos</option>
                  <option value="PLANNING">Planificación</option>
                  <option value="ON_HOLD">En Espera</option>
                  <option value="COMPLETED">Completados</option>
                </select>

                {/* Modo de vista - Mejorado */}
                <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  <button
                    onClick={() => setViewMode('overview')}
                    className={`px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-deep focus:ring-offset-2 ${
                      viewMode === 'overview'
                        ? 'bg-gradient-to-r from-blue-deep to-blue-light text-white shadow-soft'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-pressed={viewMode === 'overview'}
                  >
                    Resumen
                  </button>
                  <button
                    onClick={() => setViewMode('timeline')}
                    className={`px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-deep focus:ring-offset-2 ${
                      viewMode === 'timeline'
                        ? 'bg-gradient-to-r from-blue-deep to-blue-light text-white shadow-soft'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-pressed={viewMode === 'timeline'}
                  >
                    Timeline
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido principal - Mejorado */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            {viewMode === 'overview' && !selectedProject && (
              <div className="space-y-6">
                {/* Tarjetas de estadísticas - Mejoradas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
                  <div className="bg-white rounded-2xl p-6 shadow-soft border-2 border-gray-200 hover:border-blue-deep/50 hover:shadow-medium transition-all duration-200 group">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-gray-neutral uppercase tracking-wide">Total Proyectos</span>
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-deep to-blue-light rounded-xl flex items-center justify-center shadow-medium group-hover:scale-110 transition-transform duration-200">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-soft border-2 border-gray-200 hover:border-emerald-500/50 hover:shadow-medium transition-all duration-200 group">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-gray-neutral uppercase tracking-wide">Proyectos Activos</span>
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-medium group-hover:scale-110 transition-transform duration-200">
                        <div className="w-4 h-4 bg-white rounded-full"></div>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-emerald-600">{stats.active}</p>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-soft border-2 border-gray-200 hover:border-purple-500/50 hover:shadow-medium transition-all duration-200 group">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-gray-neutral uppercase tracking-wide">Total Épicas</span>
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-medium group-hover:scale-110 transition-transform duration-200">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-purple-600">{stats.totalEpics}</p>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-soft border-2 border-gray-200 hover:border-orange-500/50 hover:shadow-medium transition-all duration-200 group">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-gray-neutral uppercase tracking-wide">Total Sprints</span>
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-medium group-hover:scale-110 transition-transform duration-200">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-orange-600">{stats.totalSprints}</p>
                  </div>
                </div>

                {/* Gráfico de distribución por estado - Mejorado */}
                <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-soft border-2 border-gray-200">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Distribución por Estado</h2>
                  <div className="space-y-5">
                    {[
                      { label: 'Activos', value: stats.active, color: 'bg-emerald-500', total: stats.total },
                      { label: 'Planificación', value: stats.planning, color: 'bg-blue-deep', total: stats.total },
                      { label: 'En Espera', value: stats.onHold, color: 'bg-yellow-sun', total: stats.total },
                      { label: 'Completados', value: stats.completed, color: 'bg-gray-neutral', total: stats.total }
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-4">
                        <div className="w-28 text-sm font-semibold text-gray-900">{item.label}</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden shadow-inner">
                          <div
                            className={`${item.color} h-full rounded-full transition-all duration-500 flex items-center justify-end pr-3 shadow-soft`}
                            style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }}
                          >
                            {item.value > 0 && (
                              <span className="text-xs font-bold text-white">{item.value}</span>
                            )}
                          </div>
                        </div>
                        <div className="w-16 text-sm font-bold text-gray-900 text-right">
                          {item.total > 0 ? Math.round((item.value / item.total) * 100) : 0}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lista de proyectos - Mejorada */}
                <div className="bg-white rounded-2xl shadow-soft border-2 border-gray-200 overflow-hidden">
                  <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Proyectos</h2>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {filteredProjects.length === 0 ? (
                      <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-neutral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <p className="text-gray-neutral font-semibold">No hay proyectos que mostrar</p>
                      </div>
                    ) : (
                      filteredProjects.map((project) => (
                        <div
                          key={project.id}
                          onClick={() => handleProjectClick(project)}
                          className="p-6 hover:bg-cream/30 cursor-pointer transition-all duration-200 group border-l-4 border-l-transparent hover:border-l-blue-deep"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <h3 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-blue-deep transition-colors">
                                  {project.name}
                                </h3>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(project.status)} text-white shadow-soft`}>
                                  {getStatusName(project.status)}
                                </span>
                              </div>
                              {project.description && (
                                <p className="text-sm text-gray-neutral mb-4 line-clamp-2">{project.description}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-neutral">
                                <span className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-blue-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </div>
                                  <span className="font-semibold">{project._count?.epics || 0} épicas</span>
                                </span>
                                <span className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                  <span className="font-semibold">{project._count?.sprints || 0} sprints</span>
                                </span>
                                <span className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                  <span className="font-semibold">{formatDate(project.startDate)} - {formatDate(project.endDate)}</span>
                                </span>
                              </div>
                            </div>
                            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-blue-deep group-hover:text-white transition-all duration-200">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'timeline' && !selectedProject && (
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-soft border-2 border-gray-200">
                <div className="mb-6">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Timeline de Proyectos</h2>
                  <p className="text-gray-neutral">Vista cronológica de todos los proyectos en el período seleccionado</p>
                </div>
                
                {/* Timeline Rediseñado - Más Claro */}
                {filteredProjects.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-neutral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-neutral font-semibold">No hay proyectos en el período seleccionado</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Escala de tiempo horizontal - CLARA Y VISIBLE */}
                    <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                      <div className="relative" style={{ height: '60px' }}>
                        {/* Línea de tiempo */}
                        <div className="absolute top-8 left-0 right-0 h-1 bg-gradient-to-r from-blue-deep via-blue-light to-blue-deep rounded-full"></div>
                        
                        {/* Marcas de tiempo */}
                        {(() => {
                          const now = new Date();
                          let rangeStart = new Date();
                          switch (dateRange) {
                            case 'week':
                              rangeStart.setDate(now.getDate() - 7);
                              break;
                            case 'month':
                              rangeStart.setMonth(now.getMonth() - 1);
                              break;
                            case 'quarter':
                              rangeStart.setMonth(now.getMonth() - 3);
                              break;
                            case 'year':
                              rangeStart.setFullYear(now.getFullYear() - 1);
                              break;
                          }
                          const rangeEnd = now;
                          const totalDays = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
                          const numMarks = Math.min(8, totalDays); // Máximo 8 marcas
                          
                          return Array.from({ length: numMarks }, (_, i) => {
                            const percent = (i / (numMarks - 1)) * 100;
                            const date = new Date(rangeStart.getTime() + (rangeEnd.getTime() - rangeStart.getTime()) * (i / (numMarks - 1)));
                            
                            return (
                              <div
                                key={i}
                                className="absolute"
                                style={{ left: `${percent}%`, transform: 'translateX(-50%)' }}
                              >
                                <div className="w-3 h-3 bg-blue-deep rounded-full -mt-1.5 border-2 border-white shadow-medium"></div>
                                <div className="mt-2 text-center">
                                  <div className="text-xs font-bold text-gray-900">
                                    {date.toLocaleDateString('es-PA', { day: 'numeric' })}
                                  </div>
                                  <div className="text-xs text-gray-neutral">
                                    {date.toLocaleDateString('es-PA', { month: 'short' })}
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Proyectos en el timeline - MEJOR ORGANIZADOS */}
                    <div className="space-y-4">
                      {filteredProjects.map((project) => {
                        const position = calculateTimelinePosition(project);
                        const start = project.startDate ? new Date(project.startDate) : new Date(project.createdAt);
                        const end = project.endDate ? new Date(project.endDate) : new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000);
                        const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                        
                        return (
                          <div
                            key={project.id}
                            className="group"
                          >
                            <div
                              onClick={() => handleProjectClick(project)}
                              className="bg-white rounded-xl border-2 border-gray-200 hover:border-blue-deep/50 hover:shadow-medium transition-all duration-200 p-4 cursor-pointer"
                            >
                              <div className="flex items-start gap-4">
                                {/* Barra de tiempo visual */}
                                <div className="flex-1">
                                  <div className="relative h-16 bg-gray-100 rounded-lg overflow-hidden mb-3">
                                    {/* Barra del proyecto */}
                                    <div
                                      className={`absolute top-0 h-full ${getStatusColor(project.status)} rounded-lg shadow-soft flex items-center justify-center transition-all duration-200 group-hover:shadow-medium`}
                                      style={{
                                        left: `${position.left}%`,
                                        width: `${position.width}%`,
                                        minWidth: '80px'
                                      }}
                                    >
                                      <div className="text-white text-xs font-bold px-2 text-center">
                                        {project.name.length > 15 ? project.name.substring(0, 15) + '...' : project.name}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Información del proyecto */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-deep transition-colors">
                                        {project.name}
                                      </h3>
                                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-neutral">
                                        <span className="flex items-center gap-1.5">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                          </svg>
                                          {formatDate(start)} - {formatDate(end)}
                                        </span>
                                        <span className="text-gray-300">•</span>
                                        <span>{duration} días</span>
                                      </div>
                                    </div>
                                    
                                    {/* Badge de estado */}
                                    <div className="flex flex-col items-end gap-2">
                                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(project.status)} text-white shadow-soft`}>
                                        {getStatusName(project.status)}
                                      </span>
                                      <div className="flex items-center gap-4 text-xs text-gray-neutral">
                                        <span className="flex items-center gap-1">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                          </svg>
                                          {project._count?.epics || 0} épicas
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                          </svg>
                                          {project._count?.sprints || 0} sprints
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Icono de acción */}
                                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-blue-deep group-hover:text-white transition-all duration-200">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Leyenda - Mejorada */}
                    <div className="mt-8 pt-6 border-t-2 border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Leyenda de Estados</h3>
                      <div className="flex flex-wrap gap-4">
                        {[
                          { status: 'ACTIVE', label: 'Activo', color: 'bg-emerald-500' },
                          { status: 'PLANNING', label: 'Planificación', color: 'bg-blue-deep' },
                          { status: 'ON_HOLD', label: 'En Espera', color: 'bg-yellow-sun' },
                          { status: 'COMPLETED', label: 'Completado', color: 'bg-gray-neutral' }
                        ].map((item) => (
                          <div key={item.status} className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2">
                            <div className={`w-4 h-4 rounded ${item.color} shadow-soft`}></div>
                            <span className="text-sm font-semibold text-gray-900">{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedProject && (
              <div className="space-y-6">
                {/* Botón volver - Mejorado */}
                <button
                  onClick={handleBackToOverview}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 hover:border-blue-deep text-gray-700 hover:text-blue-deep rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow-medium focus:outline-none focus:ring-2 focus:ring-blue-deep focus:ring-offset-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Volver al resumen</span>
                </button>

                {/* Detalles del proyecto - Mejorados */}
                <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-soft border-2 border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">{selectedProject.name}</h2>
                      <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(selectedProject.status)} text-white shadow-soft`}>
                        {getStatusName(selectedProject.status)}
                      </span>
                    </div>
                    <a
                      href={`/proyectos/detalle?id=${selectedProject.id}`}
                      className="px-5 py-2.5 bg-gradient-to-r from-blue-deep to-blue-light hover:from-blue-light hover:to-blue-deep text-white rounded-xl font-semibold transition-all duration-200 shadow-soft hover:shadow-medium hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-deep focus:ring-offset-2 flex items-center gap-2"
                    >
                      <span>Ver Detalles Completos</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>

                  {selectedProject.description && (
                    <p className="text-gray-neutral mb-6 text-base leading-relaxed">{selectedProject.description}</p>
                  )}

                  {/* Estadísticas del proyecto - Mejoradas */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5 mb-6">
                    <div className="bg-blue-50 rounded-xl p-5 border-2 border-blue-100 hover:border-blue-deep/30 transition-all duration-200">
                      <div className="text-sm font-semibold text-gray-neutral mb-2 uppercase tracking-wide">Épicas</div>
                      <div className="text-3xl font-bold text-blue-deep">{selectedProject._count?.epics || 0}</div>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-5 border-2 border-purple-100 hover:border-purple-500/30 transition-all duration-200">
                      <div className="text-sm font-semibold text-gray-neutral mb-2 uppercase tracking-wide">Sprints</div>
                      <div className="text-3xl font-bold text-purple-600">{selectedProject._count?.sprints || 0}</div>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-5 border-2 border-emerald-100 hover:border-emerald-500/30 transition-all duration-200">
                      <div className="text-sm font-semibold text-gray-neutral mb-2 uppercase tracking-wide">Historias</div>
                      <div className="text-3xl font-bold text-emerald-600">{selectedProject._count?.userStories || 0}</div>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-5 border-2 border-orange-100 hover:border-orange-500/30 transition-all duration-200">
                      <div className="text-sm font-semibold text-gray-neutral mb-2 uppercase tracking-wide">Miembros</div>
                      <div className="text-3xl font-bold text-orange-600">{selectedProject._count?.members || 0}</div>
                    </div>
                  </div>

                  {/* Sprints activos - Mejorados */}
                  {selectedProject.sprints && selectedProject.sprints.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-5">Sprints</h3>
                      <div className="space-y-4">
                        {selectedProject.sprints.map((sprint) => (
                          <div key={sprint.id} className="border-2 border-gray-200 rounded-xl p-5 hover:border-blue-deep/30 hover:shadow-soft transition-all duration-200">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-lg font-bold text-gray-900">{sprint.name}</h4>
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">{sprint.status}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-neutral mb-2">
                              <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
                              </span>
                              <span className="text-gray-300">•</span>
                              <span className="font-semibold">{sprint._count?.userStories || 0} historias</span>
                              <span className="text-gray-300">•</span>
                              <span className="font-semibold">{sprint._count?.tasks || 0} tareas</span>
                            </div>
                            {sprint.goal && (
                              <p className="text-sm text-gray-neutral mt-3 italic bg-gray-50 rounded-lg p-3 border-l-4 border-blue-deep">
                                {sprint.goal}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Épicas - Mejoradas */}
                  {selectedProject.epics && selectedProject.epics.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-5">Épicas</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedProject.epics.map((epic) => (
                          <div key={epic.id} className="border-2 border-gray-200 rounded-xl p-5 hover:border-purple-500/30 hover:shadow-soft transition-all duration-200">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-lg font-bold text-gray-900">{epic.title}</h4>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(epic.status)} text-white shadow-soft`}>
                                {epic.status}
                              </span>
                            </div>
                            <div className="text-sm text-gray-neutral font-semibold">
                              {epic._count?.userStories || 0} historias de usuario
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppSidebarLayout>
  );
};

export default WeeklyReportDashboard;
