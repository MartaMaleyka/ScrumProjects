import React, { useState, useEffect } from 'react';
import { scrumService } from '../../../services/scrumService';
import type { Sprint, SprintFilters } from '../../../types/scrum';
import SprintCard from './SprintCard';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';

interface SprintListProps {
  projectId: number;
  onSprintSelect?: (sprint: Sprint) => void;
}

const SprintList: React.FC<SprintListProps> = ({ projectId, onSprintSelect }) => {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SprintFilters>({});
  const [selectedSprint, setSelectedSprint] = useState<number | null>(null);

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
          throw new Error(response.message || 'Error al cargar sprints');
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar los sprints');
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
        <LoadingSpinner size="lg" text="Cargando sprints..." />
      </div>
    );
  }

  // Mostrar error
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-6 max-w-md mx-auto">
          <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-medium text-white mb-2">Error al cargar sprints</h3>
          <p className="text-red-200 mb-4">{error}</p>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Sprints del <span className="text-[#FFCD00]">Proyecto</span>
          </h2>
          <p className="text-blue-200">
            Gestiona los sprints y su progreso
          </p>
        </div>
        
        <button 
          onClick={() => window.location.href = `/sprints/nuevo?projectId=${projectId}`}
          className="bg-gradient-to-r from-[#0EA5E9] to-[#0264C5] hover:from-[#0D94D1] hover:to-[#0252A3] text-white py-3 px-6 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Nuevo Sprint</span>
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white mb-1">{stats.total}</div>
          <div className="text-blue-200 text-sm">Total</div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-300 mb-1">{stats.planning}</div>
          <div className="text-blue-200 text-sm">Planificando</div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-300 mb-1">{stats.active}</div>
          <div className="text-blue-200 text-sm">Activos</div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-300 mb-1">{stats.completed}</div>
          <div className="text-blue-200 text-sm">Completados</div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-300 mb-1">{stats.cancelled}</div>
          <div className="text-blue-200 text-sm">Cancelados</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Filtro de Estado */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">Estado</label>
            <select
              value={filters.status || 'all'}
              onChange={(e) => handleFilterChange('status', e.target.value === 'all' ? undefined : e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="PLANNING">Planificando</option>
              <option value="ACTIVE">Activo</option>
              <option value="COMPLETED">Completado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>

          {/* Filtro incluir completados */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">Mostrar</label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.includeCompleted !== false}
                onChange={(e) => handleFilterChange('includeCompleted', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-white text-sm">Incluir completados</span>
            </label>
          </div>

          {/* Botón limpiar filtros */}
          <div className="flex items-end">
            {(filters.status || filters.includeCompleted === false) && (
              <button
                onClick={() => setFilters({})}
                className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-red-200 border border-red-500/30 rounded-lg transition-colors text-sm"
              >
                🗑️ Limpiar Filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Layout de Sprints */}
      {sortedSprints.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-6 max-w-md mx-auto">
            <svg className="w-16 h-16 text-blue-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 className="text-lg font-medium text-white mb-2">No hay sprints disponibles</h3>
            <p className="text-blue-200 mb-4">Comienza creando tu primer sprint para este proyecto.</p>
            <button 
              onClick={() => window.location.href = `/sprints/nuevo?projectId=${projectId}`}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors inline-block"
            >
              Crear Sprint
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Lista de Sprints (sidebar) */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Lista de Sprints</h3>
            {sortedSprints.map((sprint) => (
              <div
                key={sprint.id}
                onClick={() => setSelectedSprint(sprint.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                  selectedSprint === sprint.id
                    ? 'bg-blue-500/20 border-blue-500/50'
                    : 'bg-white/10 border-white/20 hover:bg-white/15'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium line-clamp-1">{sprint.name}</h4>
                  <div className="flex-shrink-0 ml-2">
                    <StatusBadge status={sprint.status} type="sprint" size="sm" />
                  </div>
                </div>
                
                <div className="text-xs text-blue-300 space-y-1">
                  {sprint.startDate && sprint.endDate && (
                    <div>
                      {new Date(sprint.startDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })} - {' '}
                      {new Date(sprint.endDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Historias: {sprint._count?.userStories || 0}</span>
                    <span>Tareas: {sprint._count?.tasks || 0}</span>
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
              <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-8 text-center">
                <svg className="w-16 h-16 text-blue-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className="text-lg font-medium text-white mb-2">Selecciona un Sprint</h3>
                <p className="text-blue-200">
                  Haz clic en un sprint de la lista para ver sus detalles, historias y progreso.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SprintList;
