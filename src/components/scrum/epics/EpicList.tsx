import React, { useState, useEffect } from 'react';
import { scrumService } from '../../../services/scrumService';
import type { Epic, EpicFilters } from '../../../types/scrum';
import EpicCard from './EpicCard';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';
import PriorityBadge from '../common/PriorityBadge';

interface EpicListProps {
  projectId: number;
}

const EpicList: React.FC<EpicListProps> = ({ projectId }) => {
  const [epics, setEpics] = useState<Epic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EpicFilters>({});
  const [expandedEpic, setExpandedEpic] = useState<number | null>(null);

  // Cargar épicas
  useEffect(() => {
    const fetchEpics = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await scrumService.getProjectEpics(projectId, filters);
        
        if (response.success && response.data) {
          setEpics(response.data.epics || []);
        } else {
          throw new Error(response.message || 'Error al cargar épicas');
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar las épicas');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEpics();
  }, [projectId, filters]);

  const handleFilterChange = (key: keyof EpicFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getStatusStats = () => {
    const stats = {
      total: epics.length,
      draft: epics.filter(e => e.status === 'DRAFT').length,
      ready: epics.filter(e => e.status === 'READY').length,
      inProgress: epics.filter(e => e.status === 'IN_PROGRESS').length,
      completed: epics.filter(e => e.status === 'COMPLETED').length,
    };
    return stats;
  };

  const stats = getStatusStats();

  // Mostrar estado de carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" text="Cargando épicas..." />
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
          <h3 className="text-lg font-medium text-white mb-2">Error al cargar épicas</h3>
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
            Épicas del <span className="text-[#FFCD00]">Proyecto</span>
          </h2>
          <p className="text-blue-200">
            Gestiona las épicas y su progreso en el proyecto
          </p>
        </div>
        
        <button className="bg-gradient-to-r from-[#0EA5E9] to-[#0264C5] hover:from-[#0D94D1] hover:to-[#0252A3] text-white py-3 px-6 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 flex items-center space-x-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Nueva Épica</span>
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white mb-1">{stats.total}</div>
          <div className="text-blue-200 text-sm">Total</div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gray-300 mb-1">{stats.draft}</div>
          <div className="text-blue-200 text-sm">Borrador</div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-300 mb-1">{stats.ready}</div>
          <div className="text-blue-200 text-sm">Listas</div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-300 mb-1">{stats.inProgress}</div>
          <div className="text-blue-200 text-sm">En Progreso</div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-300 mb-1">{stats.completed}</div>
          <div className="text-blue-200 text-sm">Completadas</div>
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
              <option value="DRAFT">Borrador</option>
              <option value="READY">Listo</option>
              <option value="IN_PROGRESS">En Progreso</option>
              <option value="COMPLETED">Completado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>

          {/* Filtro de Prioridad */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">Prioridad</label>
            <select
              value={filters.priority || 'all'}
              onChange={(e) => handleFilterChange('priority', e.target.value === 'all' ? undefined : e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas</option>
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
              <option value="CRITICAL">Crítica</option>
            </select>
          </div>

          {/* Botón limpiar filtros */}
          <div className="flex items-end">
            {(filters.status || filters.priority) && (
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

      {/* Lista de Épicas */}
      {epics.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-6 max-w-md mx-auto">
            <svg className="w-16 h-16 text-blue-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-medium text-white mb-2">No hay épicas disponibles</h3>
            <p className="text-blue-200 mb-4">Comienza creando tu primera épica para este proyecto.</p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors inline-block">
              Crear Épica
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {epics.map((epic) => (
            <EpicCard 
              key={epic.id} 
              epic={epic}
              isExpanded={expandedEpic === epic.id}
              onToggleExpand={() => setExpandedEpic(expandedEpic === epic.id ? null : epic.id)}
              onUpdate={() => {
                // Refrescar la lista después de una actualización
                setFilters(prev => ({ ...prev }));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default EpicList;
