import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { scrumService } from '../../../services/scrumService';
import type { Project, ProjectFilters, ProjectStatus } from '../../../types/scrum';
import ProjectCard from './ProjectCard';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';
import { EmptyState } from '../../ui/EmptyState';
import { useToast } from '../../ui/Toast';

interface ProjectListProps {
  onProjectSelect?: (project: Project) => void;
  onCreateProject?: () => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ onProjectSelect, onCreateProject }) => {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const [filters, setFilters] = useState<ProjectFilters>({
    page: 1,
    limit: 12,
    search: '',
    status: undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Cargar proyectos
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await scrumService.getProjects(filters);
        
        if (response.success && response.data) {
          // La API devuelve projects
          setProjects(response.data.projects);
        } else {
          throw new Error(response.message || 'Error al cargar proyectos');
        }
      } catch (err: any) {
        const errorMessage = err.message || 'Error al cargar los proyectos';
        setError(errorMessage);
        toast.error('Error al cargar proyectos', errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [filters]);

  // Resetear página cuando cambien los filtros
  useEffect(() => {
    setFilters(prev => ({ ...prev, page: 1 }));
  }, [filters.search, filters.status]);

  const handleFilterChange = (key: keyof ProjectFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getStatusStats = () => {
    const stats = {
      total: projects.length,
      planning: projects.filter(p => p.status === 'PLANNING').length,
      active: projects.filter(p => p.status === 'ACTIVE').length,
      completed: projects.filter(p => p.status === 'COMPLETED').length,
      onHold: projects.filter(p => p.status === 'ON_HOLD').length,
    };
    return stats;
  };

  const stats = getStatusStats();

  // Mostrar estado de carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" text={t('projects.loadingProjects', 'Cargando proyectos...')} />
      </div>
    );
  }

  // Mostrar error
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto shadow-sm">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('projects.errorLoadingProjects', 'Error al cargar proyectos')}</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          >
            {t('common.retry', 'Reintentar')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('projects.title')}
          </h1>
          <p className="text-gray-600">
            {t('projects.subtitle')}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={onCreateProject}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>{t('projects.newProject')}</span>
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-gray-900 mb-1">{stats.total}</div>
          <div className="text-gray-600 text-sm">{t('projects.total', 'Total')}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-yellow-600 mb-1">{stats.planning}</div>
          <div className="text-gray-600 text-sm">{t('projects.planning', 'Planificando')}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-green-600 mb-1">{stats.active}</div>
          <div className="text-gray-600 text-sm">{t('projects.active', 'Activos')}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-blue-600 mb-1">{stats.completed}</div>
          <div className="text-gray-600 text-sm">{t('projects.completed', 'Completados')}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-orange-600 mb-1">{stats.onHold}</div>
          <div className="text-gray-600 text-sm">{t('projects.onHold', 'En Pausa')}</div>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Búsqueda */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('common.search', 'Buscar')}</label>
            <div className="relative">
              <input
                type="text"
                placeholder={t('projects.searchPlaceholder', 'Buscar proyectos...')}
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <svg className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Filtro de Estado */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('projects.status', 'Estado')}</label>
            <select
              value={filters.status || 'all'}
              onChange={(e) => handleFilterChange('status', e.target.value === 'all' ? undefined : e.target.value as ProjectStatus)}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">{t('projects.all', 'Todos')}</option>
              <option value="PLANNING">{t('projects.planning', 'Planificando')}</option>
              <option value="ACTIVE">{t('projects.statusActive', 'Activo')}</option>
              <option value="ON_HOLD">{t('projects.onHold', 'En Pausa')}</option>
              <option value="COMPLETED">{t('projects.statusCompleted', 'Completado')}</option>
              <option value="CANCELLED">{t('projects.statusCancelled', 'Cancelado')}</option>
            </select>
          </div>

          {/* Ordenar por */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('projects.sortBy', 'Ordenar por')}</label>
            <select
              value={filters.sortBy || 'createdAt'}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="createdAt">{t('projects.sortByCreatedAt', 'Fecha de creación')}</option>
              <option value="name">{t('projects.sortByName', 'Nombre')}</option>
              <option value="status">{t('projects.sortByStatus', 'Estado')}</option>
              <option value="startDate">{t('projects.sortByStartDate', 'Fecha de inicio')}</option>
              <option value="endDate">{t('projects.sortByEndDate', 'Fecha de fin')}</option>
            </select>
          </div>

          {/* Orden */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('projects.order', 'Orden')}</label>
            <select
              value={filters.sortOrder || 'desc'}
              onChange={(e) => handleFilterChange('sortOrder', e.target.value as 'asc' | 'desc')}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="desc">{t('projects.orderDesc', 'Descendente')}</option>
              <option value="asc">{t('projects.orderAsc', 'Ascendente')}</option>
            </select>
          </div>

          {/* Vista */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('projects.view', 'Vista')}</label>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors flex-1 ${
                  viewMode === 'grid' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
                title={t('projects.viewGrid', 'Vista de grilla')}
              >
                <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors flex-1 ${
                  viewMode === 'list' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
                title={t('projects.viewList', 'Vista de lista')}
              >
                <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Limpiar filtros */}
        {(filters.search || filters.status) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => setFilters({ page: 1, limit: 12, sortBy: 'createdAt', sortOrder: 'desc' })}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 rounded-lg transition-colors text-sm font-medium"
            >
              {t('projects.clearFilters', 'Limpiar Filtros')}
            </button>
          </div>
        )}
      </div>

      {/* Lista de Proyectos */}
      {projects.length === 0 ? (
        <EmptyState
          title={filters.search || filters.status ? t('projects.noProjectsFound', 'No se encontraron proyectos') : t('projects.noProjects', 'No hay proyectos disponibles')}
          description={
            filters.search || filters.status
              ? t('projects.noProjectsFoundDesc', 'Intenta ajustar los filtros de búsqueda para encontrar más resultados.')
              : t('projects.noProjectsDesc', 'Comienza creando tu primer proyecto Scrum para organizar tu trabajo.')
          }
          illustration="empty"
          action={
            filters.search || filters.status ? (
              <button
                onClick={() => setFilters({ page: 1, limit: 12, sortBy: 'createdAt', sortOrder: 'desc' })}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                {t('projects.clearFilters', 'Limpiar Filtros')}
              </button>
            ) : (
              <button
                onClick={onCreateProject}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 font-medium shadow-md hover:shadow-lg"
              >
                {t('projects.createFirstProject', 'Crear Primer Proyecto')}
              </button>
            )
          }
        />
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}>
          {projects.map((project) => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              viewMode={viewMode}
              onUpdate={() => {
                // Refrescar la lista después de una actualización
                setFilters(prev => ({ ...prev }));
              }}
              onSelect={onProjectSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectList;
