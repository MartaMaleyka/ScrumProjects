import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { scrumService } from '../../../services/scrumService';
import type { Sprint, SprintFilters } from '../../../types/scrum';
import SprintCard from './SprintCard';
import SprintFormImproved from './SprintFormImproved';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';

interface SprintListProps {
  projectId: number;
  onSprintSelect?: (sprint: Sprint) => void;
}

const SprintList: React.FC<SprintListProps> = ({ projectId, onSprintSelect }) => {
  const { t } = useTranslation();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SprintFilters>({});
  const [selectedSprint, setSelectedSprint] = useState<number | null>(null);
  const [showSprintForm, setShowSprintForm] = useState(false);

  // Cargar sprints
  useEffect(() => {
    const fetchSprints = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await scrumService.getProjectSprints(projectId, filters);
        
        if (response.success && response.data) {
          setSprints(response.data.sprints || []);
        } else {
          throw new Error(response.message || t('sprints.loadError', 'Error al cargar sprints'));
        }
      } catch (err: any) {
        setError(err.message || t('sprints.loadError', 'Error al cargar los sprints'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchSprints();
  }, [projectId, filters]);

  const handleFilterChange = (key: keyof SprintFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getStatusStats = () => {
    const stats = {
      total: sprints.length,
      planning: sprints.filter(s => s.status === 'PLANNING').length,
      active: sprints.filter(s => s.status === 'ACTIVE').length,
      completed: sprints.filter(s => s.status === 'COMPLETED').length,
      cancelled: sprints.filter(s => s.status === 'CANCELLED').length,
    };
    return stats;
  };

  const stats = getStatusStats();

  // Ordenar sprints (activos primero, luego por fecha de inicio)
  const sortedSprints = [...sprints].sort((a, b) => {
    // Sprints activos primero
    if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
    if (b.status === 'ACTIVE' && a.status !== 'ACTIVE') return 1;
    
    // Luego sprints en planificación
    if (a.status === 'PLANNING' && b.status !== 'PLANNING') return -1;
    if (b.status === 'PLANNING' && a.status !== 'PLANNING') return 1;
    
    // Finalmente por fecha de inicio (más recientes primero)
    const dateA = new Date(a.startDate || a.createdAt).getTime();
    const dateB = new Date(b.startDate || b.createdAt).getTime();
    return dateB - dateA;
  });

  // Mostrar estado de carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" text={t('sprints.loading', 'Cargando sprints...')} />
      </div>
    );
  }

  // Mostrar error
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('sprints.loadError', 'Error al cargar sprints')}</h3>
          <p className="text-red-600 mb-4">{error}</p>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('sprints.projectSprints', 'Sprints del Proyecto')}
          </h2>
          <p className="text-gray-600">
            {t('sprints.subtitle', 'Gestiona los sprints y su progreso')}
          </p>
        </div>
        
        <button 
          onClick={() => setShowSprintForm(true)}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 px-6 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 flex items-center space-x-2 shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>{t('sprints.newSprint', 'Nuevo Sprint')}</span>
        </button>
      </div>

      {/* Estadísticas - Compactas */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilters({})}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium shadow-sm hover:shadow-md transition-all"
        >
          <span className="font-bold">{stats.total}</span>
          <span>{t('common.total', 'Total')}</span>
        </button>
        <button
          onClick={() => handleFilterChange('status', 'PLANNING')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500 text-white text-sm font-medium shadow-sm hover:shadow-md transition-all"
        >
          <span className="font-bold">{stats.planning}</span>
          <span>{t('sprints.status.planning', 'Planificando')}</span>
        </button>
        <button
          onClick={() => handleFilterChange('status', 'ACTIVE')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm font-medium shadow-sm hover:shadow-md transition-all"
        >
          <span className="font-bold">{stats.active}</span>
          <span>{t('sprints.status.active', 'Activos')}</span>
        </button>
        <button
          onClick={() => handleFilterChange('status', 'COMPLETED')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500 text-white text-sm font-medium shadow-sm hover:shadow-md transition-all"
        >
          <span className="font-bold">{stats.completed}</span>
          <span>{t('sprints.status.completed', 'Completados')}</span>
        </button>
        <button
          onClick={() => handleFilterChange('status', 'CANCELLED')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm font-medium shadow-sm hover:shadow-md transition-all"
        >
          <span className="font-bold">{stats.cancelled}</span>
          <span>{t('sprints.status.cancelled', 'Cancelados')}</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Filtro de Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('sprints.statusLabel', 'Estado')}</label>
            <select
              value={filters.status || 'all'}
              onChange={(e) => handleFilterChange('status', e.target.value === 'all' ? undefined : e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">{t('common.all', 'Todos')}</option>
              <option value="PLANNING">{t('sprints.status.planning', 'Planificando')}</option>
              <option value="ACTIVE">{t('sprints.status.active', 'Activo')}</option>
              <option value="COMPLETED">{t('sprints.status.completed', 'Completado')}</option>
              <option value="CANCELLED">{t('sprints.status.cancelled', 'Cancelado')}</option>
            </select>
          </div>

          {/* Filtro incluir completados */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('sprints.show', 'Mostrar')}</label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.includeCompleted !== false}
                onChange={(e) => handleFilterChange('includeCompleted', e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
              />
              <span className="text-gray-700 text-sm">{t('sprints.includeCompleted', 'Incluir completados')}</span>
            </label>
          </div>

          {/* Botón limpiar filtros */}
          <div className="flex items-end">
            {(filters.status || filters.includeCompleted === false) && (
              <button
                onClick={() => setFilters({})}
                className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 rounded-lg transition-colors text-sm"
              >
                🗑️ {t('sprints.clearFilters', 'Limpiar Filtros')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Layout de Sprints */}
      {sortedSprints.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-md mx-auto shadow-sm">
            <svg className="w-16 h-16 text-indigo-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('sprints.noSprints', 'No hay sprints disponibles')}</h3>
            <p className="text-gray-600 mb-4">{t('sprints.createFirstSprint', 'Comienza creando tu primer sprint para este proyecto.')}</p>
            <button 
              onClick={() => setShowSprintForm(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg transition-colors inline-block shadow-sm"
            >
              {t('sprints.createSprint', 'Crear Sprint')}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Lista de Sprints (sidebar) */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('sprints.sprintList', 'Lista de Sprints')}</h3>
            {sortedSprints.map((sprint) => (
              <div
                key={sprint.id}
                onClick={() => setSelectedSprint(sprint.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 shadow-sm ${
                  selectedSprint === sprint.id
                    ? 'bg-indigo-50 border-indigo-300'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-gray-900 font-medium line-clamp-1">{sprint.name}</h4>
                  <div className="flex-shrink-0 ml-2">
                    <StatusBadge status={sprint.status} type="sprint" size="sm" />
                  </div>
                </div>
                
                <div className="text-xs text-gray-600 space-y-1">
                  {sprint.startDate && sprint.endDate && (
                    <div>
                      {new Date(sprint.startDate).toLocaleDateString(t('common.locale', 'es-ES') as string, { day: '2-digit', month: '2-digit' })} - {' '}
                      {new Date(sprint.endDate).toLocaleDateString(t('common.locale', 'es-ES') as string, { day: '2-digit', month: '2-digit' })}
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>{t('stories.title', 'Historias')}: {sprint._count?.userStories || 0}</span>
                    <span>{t('tasks.title', 'Tareas')}: {sprint._count?.tasks || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detalle del Sprint seleccionado */}
          <div className="lg:col-span-3">
            {selectedSprint ? (
              <SprintCard 
                sprint={sortedSprints.find(s => s.id === selectedSprint)!}
                isDetailed={true}
                onUpdate={() => {
                  // Refrescar la lista después de una actualización
                  setFilters(prev => ({ ...prev }));
                }}
                onViewTasks={() => {
                  const sprint = sortedSprints.find(s => s.id === selectedSprint)!;
                  onSprintSelect?.(sprint);
                }}
              />
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
                <svg className="w-16 h-16 text-indigo-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('sprints.selectSprint', 'Selecciona un Sprint')}</h3>
                <p className="text-gray-600">
                  {t('sprints.selectSprintDesc', 'Haz clic en un sprint de la lista para ver sus detalles, historias y progreso.')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de SprintFormImproved */}
      {ReactDOM.createPortal(
        <SprintFormImproved
          projectId={projectId}
          isOpen={showSprintForm}
          onClose={() => setShowSprintForm(false)}
          onSuccess={() => {
            setShowSprintForm(false);
            // Refrescar la lista de sprints
            setFilters(prev => ({ ...prev }));
          }}
          asModal={true}
        />,
        document.body
      )}
    </div>
  );
};

export default SprintList;
