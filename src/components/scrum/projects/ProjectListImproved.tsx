import React, { useState, useEffect } from 'react';
import AppSidebarLayout from '../../layout/AppSidebarLayout';
import { API_BASE_URL, authenticatedRequest } from '../../../config/api';

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
  };
}

const ProjectListImproved: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'name' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [allProjects, setAllProjects] = useState<Project[]>([]);

  // Cargar preferencias desde localStorage
  useEffect(() => {
    const savedViewMode = localStorage.getItem('projects-view-mode');
    const savedPageSize = localStorage.getItem('projects-page-size');
    const savedStatusFilter = localStorage.getItem('projects-status-filter');
    
    if (savedViewMode) setViewMode(savedViewMode as 'table' | 'cards');
    if (savedPageSize) setPageSize(Number(savedPageSize));
    if (savedStatusFilter) setStatusFilter(savedStatusFilter);
  }, []);

  // Guardar preferencias en localStorage
  useEffect(() => {
    localStorage.setItem('projects-view-mode', viewMode);
    localStorage.setItem('projects-page-size', String(pageSize));
    localStorage.setItem('projects-status-filter', statusFilter);
  }, [viewMode, pageSize, statusFilter]);

  // Cargar proyectos desde la API
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await authenticatedRequest(`${API_BASE_URL}/scrum/projects`);
        
        const projectsData = response.projects || response.data?.projects || [];
        
        setProjects(projectsData);
        setAllProjects(projectsData);
      } catch (err: any) {
        setError(err.message || 'Error al cargar los proyectos');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Cargar todos los proyectos cuando se abre el modal (sin filtros)
  useEffect(() => {
    if (showProjectsModal) {
      const fetchAllProjects = async () => {
        try {
          // Cargar todos los proyectos sin filtros usando el nuevo endpoint
          const response = await authenticatedRequest(`${API_BASE_URL}/scrum/projects/all`);
          const projectsData = response.projects || response.data?.projects || [];
          setAllProjects(projectsData);
        } catch (err: any) {
          console.error('Error al cargar todos los proyectos:', err);
          // Si falla, usar los proyectos ya cargados
        }
      };
      fetchAllProjects();
    }
  }, [showProjectsModal]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Sin fecha';
    return new Date(dateString).toLocaleDateString('es-PA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNING': return 'bg-blue-50 text-blue-deep border-blue-200';
      case 'ACTIVE': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ON_HOLD': return 'bg-yellow-50 text-yellow-sun border-yellow-200';
      case 'COMPLETED': return 'bg-gray-50 text-gray-neutral border-gray-200';
      case 'CANCELLED': return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-gray-50 text-gray-neutral border-gray-200';
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'PLANNING': return 'Planificación';
      case 'ACTIVE': return 'Activo';
      case 'ON_HOLD': return 'En Espera';
      case 'COMPLETED': return 'Completado';
      case 'CANCELLED': return 'Cancelado';
      default: return status;
    }
  };

  const getStats = () => {
    return {
      total: projects.length,
      planning: projects.filter(p => p.status === 'PLANNING').length,
      active: projects.filter(p => p.status === 'ACTIVE').length,
      onHold: projects.filter(p => p.status === 'ON_HOLD').length,
      completed: projects.filter(p => p.status === 'COMPLETED').length,
    };
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || project.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'updatedAt':
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const totalProjects = sortedProjects.length;
  const totalPages = Math.ceil(totalProjects / pageSize);
  const paginatedProjects = sortedProjects.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSelectProject = (id: number) => {
    setSelectedProjects(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedProjects.length === paginatedProjects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(paginatedProjects.map(p => p.id));
    }
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const handleStatClick = (status: string) => {
    if (statusFilter === status) {
      setStatusFilter('todos');
    } else {
      setStatusFilter(status);
      setCurrentPage(1);
    }
  };

  const handleBulkDelete = async () => {
    console.log('Eliminar proyectos:', selectedProjects);
    setSelectedProjects([]);
    setShowDeleteConfirm(false);
  };

  const renderSortIcon = (column: typeof sortBy) => {
    if (sortBy !== column) {
      return (
        <svg className="w-4 h-4 text-gray-neutral ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortOrder === 'asc' ? (
      <svg className="w-4 h-4 text-blue-deep ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-deep ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const stats = getStats();

  if (isLoading) {
    return (
      <AppSidebarLayout>
        <div className="h-full flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-blue-deep/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-blue-deep rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-neutral text-lg font-semibold">Cargando proyectos...</p>
          </div>
        </div>
      </AppSidebarLayout>
    );
  }

  if (error) {
    return (
      <AppSidebarLayout>
        <div className="h-full flex items-center justify-center bg-gray-50 p-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-red-600 mb-4 font-bold">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-blue-deep to-blue-light hover:from-blue-light hover:to-blue-deep text-white rounded-xl font-medium transition-all duration-200 shadow-soft hover:shadow-medium focus:outline-none focus:ring-2 focus:ring-blue-deep focus:ring-offset-2"
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
        {/* Header Principal - Mejorado */}
        <div className="bg-white border-b border-gray-200 shadow-soft">
          <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-deep to-blue-light rounded-xl flex items-center justify-center shadow-medium">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                        Gestor de Proyectos
                      </h1>
                      <p className="text-gray-neutral text-base">
                        {stats.total} proyecto{stats.total !== 1 ? 's' : ''} en total
                  </p>
                </div>
              </div>
              
                  {/* Estadísticas Rápidas - Mejoradas */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleStatClick('PLANNING')}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 ${
                        statusFilter === 'PLANNING'
                          ? 'bg-blue-50 border-blue-deep shadow-soft'
                          : 'bg-white border-gray-200 hover:border-blue-deep/30 hover:shadow-soft cursor-pointer'
                      }`}
                      title="Filtrar por proyectos en planificación"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-deep"></div>
                      <span className={`text-sm font-semibold ${
                        statusFilter === 'PLANNING' ? 'text-blue-deep' : 'text-gray-900'
                      }`}>
                    {stats.planning} Planificación
                  </span>
                    </button>
                    <button
                      onClick={() => handleStatClick('ACTIVE')}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 ${
                        statusFilter === 'ACTIVE'
                          ? 'bg-emerald-50 border-emerald-500 shadow-soft'
                          : 'bg-white border-gray-200 hover:border-emerald-500/30 hover:shadow-soft cursor-pointer'
                      }`}
                      title="Filtrar por proyectos activos"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                      <span className={`text-sm font-semibold ${
                        statusFilter === 'ACTIVE' ? 'text-emerald-700' : 'text-gray-900'
                      }`}>
                    {stats.active} Activos
                  </span>
                    </button>
                {stats.onHold > 0 && (
                      <button
                        onClick={() => handleStatClick('ON_HOLD')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 ${
                          statusFilter === 'ON_HOLD'
                            ? 'bg-yellow-50 border-yellow-sun shadow-soft'
                            : 'bg-white border-gray-200 hover:border-yellow-sun/30 hover:shadow-soft cursor-pointer'
                        }`}
                        title="Filtrar por proyectos en espera"
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-sun"></div>
                        <span className={`text-sm font-semibold ${
                          statusFilter === 'ON_HOLD' ? 'text-yellow-sun' : 'text-gray-900'
                        }`}>
                      {stats.onHold} En Espera
                    </span>
                      </button>
                )}
                {stats.completed > 0 && (
                      <button
                        onClick={() => handleStatClick('COMPLETED')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 ${
                          statusFilter === 'COMPLETED'
                            ? 'bg-gray-50 border-gray-neutral shadow-soft'
                            : 'bg-white border-gray-200 hover:border-gray-neutral/30 hover:shadow-soft cursor-pointer'
                        }`}
                        title="Filtrar por proyectos completados"
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-neutral"></div>
                        <span className={`text-sm font-semibold ${
                          statusFilter === 'COMPLETED' ? 'text-gray-neutral' : 'text-gray-900'
                        }`}>
                      {stats.completed} Completados
                    </span>
                      </button>
                )}
              </div>
            </div>
            
                {/* Botones de Acción - Mejorados */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <a
                    href="/proyectos/informe-semanal"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-all duration-200 shadow-soft hover:shadow-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    title="Ver informe semanal interactivo"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                    <span className="hidden sm:inline">Informe Semanal</span>
                  </a>
                  <button
                    onClick={() => setShowProjectsModal(true)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 rounded-xl font-medium transition-all duration-200 shadow-soft hover:shadow-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    title="Ver todos los proyectos"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span className="hidden sm:inline">Todos los proyectos</span>
                  </button>
              <a
                href="/proyectos/nuevo"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-deep to-blue-light hover:from-blue-light hover:to-blue-deep text-white rounded-xl font-medium transition-all duration-200 shadow-soft hover:shadow-medium focus:outline-none focus:ring-2 focus:ring-blue-deep focus:ring-offset-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Nuevo Proyecto</span>
              </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Acciones Masivas - Mejorada */}
        {selectedProjects.length > 0 && (
          <div className="bg-blue-deep/10 border-b border-blue-deep/20 px-4 sm:px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-blue-deep">
                  {selectedProjects.length} proyecto{selectedProjects.length !== 1 ? 's' : ''} seleccionado{selectedProjects.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedProjects([])}
                  className="text-sm text-gray-neutral hover:text-gray-900 font-medium px-4 py-2 rounded-xl hover:bg-white/50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Deseleccionar todo
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-soft hover:shadow-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  title="Eliminar proyectos seleccionados"
                >
                  Eliminar ({selectedProjects.length})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Panel de Búsqueda y Filtros - Mejorado */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-5">
          <div className="max-w-7xl mx-auto">
            {/* Indicador de resultados */}
            {(searchTerm || statusFilter !== 'todos') && totalProjects > 0 && (
              <div className="mb-4 flex items-center justify-between text-sm pt-2 border-t border-gray-200">
                <span className="text-gray-neutral">
                  <span className="font-semibold text-gray-900">{totalProjects}</span> resultado{totalProjects !== 1 ? 's' : ''} encontrado{totalProjects !== 1 ? 's' : ''}
                  {searchTerm && (
                    <span> para "<span className="font-medium">{searchTerm}</span>"</span>
                  )}
                  {statusFilter !== 'todos' && (
                    <span> con estado <span className="font-medium">{getStatusName(statusFilter)}</span></span>
                  )}
                </span>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('todos');
                  }}
                  className="text-blue-deep hover:text-blue-light font-medium flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-deep focus:ring-offset-2 rounded-lg px-2 py-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Limpiar filtros</span>
                </button>
              </div>
            )}
            
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Barra de búsqueda */}
            <div className="flex-1">
              <div className="relative">
                  <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-neutral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar proyectos por nombre o descripción..."
                  value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-11 pr-10 py-3 border-2 border-gray-200 rounded-xl hover:border-blue-light focus:ring-2 focus:ring-blue-deep focus:border-blue-deep transition-all duration-200 text-sm bg-white"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-neutral hover:text-gray-900 transition-colors p-1 rounded-lg hover:bg-gray-100"
                      title="Limpiar búsqueda"
                      aria-label="Limpiar búsqueda"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Filtros */}
              <div className="flex gap-3">
                <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-blue-light focus:ring-2 focus:ring-blue-deep focus:border-blue-deep transition-all duration-200 text-sm bg-white cursor-pointer appearance-none pr-10 min-w-[180px]"
              >
                <option value="todos">Todos los estados</option>
                <option value="PLANNING">Planificación</option>
                <option value="ACTIVE">Activo</option>
                <option value="ON_HOLD">En Espera</option>
                <option value="COMPLETED">Completado</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-neutral">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

              <button
                onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
                  className={`px-4 py-3 border-2 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-deep focus:ring-offset-2 ${
                    viewMode === 'table'
                      ? 'bg-gradient-to-r from-blue-deep to-blue-light text-white border-transparent shadow-soft'
                      : 'bg-white border-gray-200 hover:border-blue-light text-gray-neutral'
                  }`}
                title={viewMode === 'table' ? 'Vista de tarjetas' : 'Vista de tabla'}
              >
                {viewMode === 'table' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto">
          {totalProjects === 0 ? (
              <div className="bg-white rounded-2xl shadow-soft border border-gray-200 p-12 text-center">
              <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-blue-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {searchTerm || statusFilter !== 'todos' ? 'No se encontraron proyectos' : 'No hay proyectos'}
                </h3>
                <p className="text-gray-neutral mb-6">
                  {searchTerm || statusFilter !== 'todos' 
                    ? 'Intenta ajustar los filtros de búsqueda' 
                    : 'Comienza creando tu primer proyecto Scrum'}
                </p>
                {(!searchTerm && statusFilter === 'todos') && (
                  <a
                    href="/proyectos/nuevo"
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-deep to-blue-light hover:from-blue-light hover:to-blue-deep text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-soft hover:shadow-medium focus:outline-none focus:ring-2 focus:ring-blue-deep focus:ring-offset-2"
                  >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Crear Primer Proyecto
                  </a>
                )}
              </div>
            </div>
          ) : viewMode === 'table' ? (
              /* Vista de Tabla - Mejorada */
              <div className="bg-white rounded-2xl shadow-soft border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-12 px-4 sm:px-6 py-4 text-left">
                        <input
                          type="checkbox"
                          checked={selectedProjects.length === paginatedProjects.length && paginatedProjects.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-blue-deep focus:ring-blue-deep"
                        />
                      </th>
                      <th 
                          className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('createdAt')}
                      >
                        <div className="flex items-center">
                          ID
                          {renderSortIcon('createdAt')}
                        </div>
                      </th>
                      <th 
                          className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center">
                          Proyecto
                          {renderSortIcon('name')}
                        </div>
                      </th>
                      <th 
                          className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center">
                          Estado
                          {renderSortIcon('status')}
                        </div>
                      </th>
                        <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Fechas
                      </th>
                        <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Recursos
                      </th>
                        <th className="px-4 sm:px-6 py-4 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedProjects.map((project) => (
                      <tr
                        key={project.id}
                          className={`hover:bg-gray-50 transition-colors duration-200 group ${
                            selectedProjects.includes(project.id) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedProjects.includes(project.id)}
                            onChange={() => handleSelectProject(project.id)}
                            className="rounded border-gray-300 text-blue-deep focus:ring-blue-deep"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <a
                            href={`/proyectos/detalle?id=${project.id}`}
                              className="text-gray-900 font-mono text-sm hover:text-blue-deep transition-colors cursor-pointer font-semibold"
                            title="Ver detalle del proyecto"
                          >
                            #{project.id}
                          </a>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <a
                            href={`/proyectos/detalle?id=${project.id}`}
                            className="block"
                          >
                              <div className="text-base font-bold text-gray-900 group-hover:text-blue-deep transition-colors">
                              {project.name}
                            </div>
                            {project.description && (
                              <div className="text-sm text-gray-neutral truncate max-w-md mt-1">
                                {project.description}
                              </div>
                            )}
                          </a>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border ${getStatusColor(project.status)}`}>
                            {getStatusName(project.status)}
                          </span>
                        </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center gap-2 mb-1">
                              <svg className="w-4 h-4 text-gray-neutral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                              <span className="text-sm font-medium">{formatDate(project.startDate)}</span>
                          </div>
                          {project.endDate && (
                              <div className="flex items-center gap-2 text-xs text-gray-neutral">
                              <span>→</span>
                              <span>{formatDate(project.endDate)}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                              <div 
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 rounded-lg border border-purple-200"
                                title={`${project._count?.epics || 0} Épica${(project._count?.epics || 0) !== 1 ? 's' : ''}`}
                              >
                                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                                <span className="text-xs font-semibold text-purple-700">{project._count?.epics || 0}</span>
                            </div>
                              <div 
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-50 rounded-lg border border-orange-200"
                                title={`${project._count?.sprints || 0} Sprint${(project._count?.sprints || 0) !== 1 ? 's' : ''}`}
                              >
                                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                                <span className="text-xs font-semibold text-orange-700">{project._count?.sprints || 0}</span>
                            </div>
                              <div 
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200"
                                title={`${project._count?.members || 0} Miembro${(project._count?.members || 0) !== 1 ? 's' : ''}`}
                              >
                                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                                <span className="text-xs font-semibold text-emerald-700">{project._count?.members || 0}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                            <a
                              href={`/proyectos/detalle?id=${project.id}`}
                                className="p-2 text-gray-neutral hover:text-blue-deep hover:bg-blue-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-deep focus:ring-offset-2"
                              title="Ver detalle"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </a>
                            <a
                              href={`/proyectos/editar?id=${project.id}`}
                                className="p-2 text-gray-neutral hover:text-blue-deep hover:bg-blue-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-deep focus:ring-offset-2"
                              title="Editar proyecto"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
              /* Vista de Cards - Mejorada */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {paginatedProjects.map((project) => (
                <div
                  key={project.id}
                    className="bg-white rounded-2xl border-2 border-gray-200 p-6 hover:shadow-medium hover:border-blue-deep/30 transition-all duration-200 cursor-pointer group"
                  onClick={() => window.location.href = `/proyectos/detalle?id=${project.id}`}
                >
                  <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-deep transition-colors flex-1 pr-2">
                        {project.name}
                      </h3>
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold border flex-shrink-0 ${getStatusColor(project.status)}`}>
                      {getStatusName(project.status)}
                    </span>
                  </div>
                  {project.description && (
                    <p className="text-sm text-gray-neutral mb-4 line-clamp-2">{project.description}</p>
                  )}
                    <div className="space-y-2 text-sm text-gray-900 mb-4">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-neutral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                        <span className="font-medium">{formatDate(project.startDate)}</span>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                    <div className="flex gap-2">
                        <div 
                          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 rounded-lg border border-purple-200"
                          title={`${project._count?.epics || 0} Épica${(project._count?.epics || 0) !== 1 ? 's' : ''}`}
                        >
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                          <span className="text-xs font-semibold text-purple-700">{project._count?.epics || 0}</span>
                      </div>
                        <div 
                          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-50 rounded-lg border border-orange-200"
                          title={`${project._count?.sprints || 0} Sprint${(project._count?.sprints || 0) !== 1 ? 's' : ''}`}
                        >
                          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                          <span className="text-xs font-semibold text-orange-700">{project._count?.sprints || 0}</span>
                      </div>
                        <div 
                          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200"
                          title={`${project._count?.members || 0} Miembro${(project._count?.members || 0) !== 1 ? 's' : ''}`}
                        >
                          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                          <span className="text-xs font-semibold text-emerald-700">{project._count?.members || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

            {/* Paginación - Mejorada */}
          {totalPages > 1 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl border border-gray-200 px-4 sm:px-6 py-4 shadow-soft">
              <p className="text-sm text-gray-neutral">
                  Mostrando <span className="font-semibold text-gray-900">{(currentPage - 1) * pageSize + 1}</span> a{' '}
                  <span className="font-semibold text-gray-900">{Math.min(currentPage * pageSize, totalProjects)}</span> de{' '}
                  <span className="font-semibold text-gray-900">{totalProjects}</span> proyectos
              </p>
                <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                    className="px-4 py-2 border-2 border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Anterior
                </button>
                  <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-deep focus:ring-offset-2 ${
                          currentPage === pageNum
                              ? 'bg-gradient-to-r from-blue-deep to-blue-light text-white shadow-soft'
                              : 'border-2 border-gray-200 hover:bg-gray-50 text-gray-900'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                    className="px-4 py-2 border-2 border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Modal de Confirmación de Eliminación - Mejorado */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-medium max-w-md w-full p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Confirmar eliminación</h3>
                <p className="text-sm text-gray-neutral">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-gray-900 mb-6">
              ¿Estás seguro de que deseas eliminar <span className="font-semibold text-red-600">{selectedProjects.length}</span> proyecto{selectedProjects.length !== 1 ? 's' : ''}?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2.5 border-2 border-gray-200 rounded-xl hover:bg-gray-50 font-medium text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors shadow-soft hover:shadow-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Lista de Proyectos */}
      {showProjectsModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowProjectsModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-medium max-w-4xl w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-deep to-blue-light rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Todos los Proyectos</h3>
                  <p className="text-sm text-gray-neutral">{allProjects.length} proyecto{allProjects.length !== 1 ? 's' : ''} en total</p>
                </div>
              </div>
              <button
                onClick={() => setShowProjectsModal(false)}
                className="p-2 text-gray-neutral hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                title="Cerrar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Lista de Proyectos */}
            <div className="flex-1 overflow-y-auto p-6">
              {allProjects.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-neutral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <p className="text-gray-neutral text-lg">No hay proyectos disponibles</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...allProjects]
                    .sort((a, b) => {
                      // Ordenar por ID descendente (más recientes primero)
                      return b.id - a.id;
                    })
                    .map((project) => (
                    <a
                      key={project.id}
                      href={`/proyectos/detalle?id=${project.id}`}
                      className="block p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-deep hover:shadow-soft transition-all duration-200 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-mono text-gray-neutral">#{project.id}</span>
                            <h4 className="text-lg font-bold text-gray-900 group-hover:text-blue-deep transition-colors">
                              {project.name}
                            </h4>
                            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(project.status)}`}>
                              {getStatusName(project.status)}
                            </span>
                          </div>
                          {project.description && (
                            <p className="text-sm text-gray-neutral line-clamp-2">{project.description}</p>
                          )}
                        </div>
                        <svg className="w-5 h-5 text-gray-neutral group-hover:text-blue-deep transition-colors flex-shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppSidebarLayout>
  );
};

export default ProjectListImproved;
