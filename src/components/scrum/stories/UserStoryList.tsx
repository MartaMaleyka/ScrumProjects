import React, { useState, useEffect } from 'react';
import { scrumService } from '../../../services/scrumService';
import type { UserStory, UserStoryFilters, Epic } from '../../../types/scrum';
import UserStoryCard from './UserStoryCard';
import LoadingSpinner from '../common/LoadingSpinner';

interface UserStoryListProps {
  projectId: number;
  epicId?: number;
  sprintId?: number;
}

const UserStoryList: React.FC<UserStoryListProps> = ({ projectId, epicId, sprintId }) => {
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UserStoryFilters>({});
  const [viewMode, setViewMode] = useState<'backlog' | 'cards'>('backlog');

  // Cargar épicas del proyecto para los filtros
  useEffect(() => {
    const fetchEpics = async () => {
      try {
        const response = await scrumService.getProjectEpics(projectId);
        if (response.success && response.data) {
          setEpics(response.data.epics || []);
        }
      } catch (err) {
      }
    };

    fetchEpics();
  }, [projectId]);

  // Cargar historias de usuario
  useEffect(() => {
    const fetchUserStories = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        let stories: UserStory[] = [];
        
        if (epicId) {
          // Si se especifica una épica, cargar sus historias
          const response = await scrumService.getEpicUserStories(epicId, filters);
          if (response.success && response.data) {
            stories = response.data.userStories || [];
          }
        } else {
          // Si no, cargar todas las historias del proyecto
          // Esto requeriría un endpoint adicional en el servicio
          // Por ahora, cargaremos de todas las épicas
          const epicsResponse = await scrumService.getProjectEpics(projectId);
          if (epicsResponse.success && epicsResponse.data) {
            const allEpics = epicsResponse.data.epics || [];
            const storyPromises = allEpics.map(epic => 
              scrumService.getEpicUserStories(epic.id, filters)
            );
            
            const storyResponses = await Promise.all(storyPromises);
            stories = storyResponses
              .filter(response => response.success && response.data)
              .flatMap(response => response.data!.userStories || []);
          }
        }
        
        // Aplicar filtros adicionales si es necesario
        if (sprintId) {
          stories = stories.filter(story => story.sprintId === sprintId);
        }
        
        setUserStories(stories);
      } catch (err: any) {
        setError(err.message || 'Error al cargar las historias de usuario');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserStories();
  }, [projectId, epicId, sprintId, filters]);

  const handleFilterChange = (key: keyof UserStoryFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getStatusStats = () => {
    const stats = {
      total: userStories.length,
      draft: userStories.filter(s => s.status === 'DRAFT').length,
      ready: userStories.filter(s => s.status === 'READY').length,
      inProgress: userStories.filter(s => s.status === 'IN_PROGRESS').length,
      testing: userStories.filter(s => s.status === 'TESTING').length,
      completed: userStories.filter(s => s.status === 'COMPLETED').length,
      totalPoints: userStories.reduce((sum, story) => sum + (story.storyPoints || 0), 0),
      inSprints: userStories.filter(s => s.sprintId).length,
      notInSprints: userStories.filter(s => !s.sprintId).length,
    };
    return stats;
  };

  const stats = getStatusStats();

  // Ordenar historias por prioridad y estado
  const sortedStories = [...userStories].sort((a, b) => {
    // Primero por prioridad (CRITICAL > HIGH > MEDIUM > LOW)
    const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    if (priorityDiff !== 0) return priorityDiff;
    
    // Luego por estado (READY > DRAFT > IN_PROGRESS > TESTING > COMPLETED)
    const statusOrder = { 'READY': 5, 'DRAFT': 4, 'IN_PROGRESS': 3, 'TESTING': 2, 'COMPLETED': 1 };
    return (statusOrder[b.status] || 0) - (statusOrder[a.status] || 0);
  });

  // Mostrar estado de carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" text="Cargando historias de usuario..." />
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
          <h3 className="text-lg font-medium text-white mb-2">Error al cargar historias</h3>
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
            {epicId ? 'Historias de la Épica' : sprintId ? 'Historias del Sprint' : 'Product'} <span className="text-[#FFCD00]">Backlog</span>
          </h2>
          <p className="text-blue-200">
            Gestiona y prioriza las historias de usuario del proyecto
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="bg-gradient-to-r from-[#0EA5E9] to-[#0264C5] hover:from-[#0D94D1] hover:to-[#0252A3] text-white py-3 px-6 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Nueva Historia</span>
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-white mb-1">{stats.total}</div>
          <div className="text-blue-200 text-xs">Total</div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-gray-300 mb-1">{stats.draft}</div>
          <div className="text-blue-200 text-xs">Borrador</div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-blue-300 mb-1">{stats.ready}</div>
          <div className="text-blue-200 text-xs">Listas</div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-purple-300 mb-1">{stats.inProgress}</div>
          <div className="text-blue-200 text-xs">En Progreso</div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-indigo-300 mb-1">{stats.testing}</div>
          <div className="text-blue-200 text-xs">Testing</div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-green-300 mb-1">{stats.completed}</div>
          <div className="text-blue-200 text-xs">Completadas</div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-yellow-300 mb-1">{stats.totalPoints}</div>
          <div className="text-blue-200 text-xs">Story Points</div>
        </div>
      </div>

      {/* Filtros y controles */}
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Filtro de Estado */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">Estado</label>
            <select
              value={filters.status || 'all'}
              onChange={(e) => handleFilterChange('status', e.target.value === 'all' ? undefined : e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">Todos</option>
              <option value="DRAFT">Borrador</option>
              <option value="READY">Listo</option>
              <option value="IN_PROGRESS">En Progreso</option>
              <option value="TESTING">Testing</option>
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
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">Todas</option>
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
              <option value="CRITICAL">Crítica</option>
            </select>
          </div>

          {/* Filtro de Épica */}
          {!epicId && (
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">Épica</label>
              <select
                value={filters.sprintId || 'all'}
                onChange={(e) => handleFilterChange('sprintId', e.target.value === 'all' ? undefined : Number(e.target.value))}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">Todas</option>
                {epics.map(epic => (
                  <option key={epic.id} value={epic.id} className="bg-gray-800">
                    {epic.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro de Sprint */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">Sprint</label>
            <select
              value={filters.sprintId || 'all'}
              onChange={(e) => handleFilterChange('sprintId', e.target.value === 'all' ? undefined : Number(e.target.value))}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">Todos</option>
              <option value="unassigned">Sin asignar</option>
              {/* Aquí se cargarían los sprints del proyecto */}
            </select>
          </div>

          {/* Vista */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">Vista</label>
            <div className="flex bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setViewMode('backlog')}
                className={`p-2 rounded-md transition-colors flex-1 text-xs ${
                  viewMode === 'backlog' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-blue-300 hover:text-white hover:bg-white/10'
                }`}
              >
                Backlog
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-md transition-colors flex-1 text-xs ${
                  viewMode === 'cards' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-blue-300 hover:text-white hover:bg-white/10'
                }`}
              >
                Tarjetas
              </button>
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
          <div className="text-sm text-blue-300">
            {stats.inSprints} historias en sprints • {stats.notInSprints} sin asignar • {stats.totalPoints} story points total
          </div>
          
          {(filters.status || filters.priority || filters.sprintId) && (
            <button
              onClick={() => setFilters({})}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-red-200 border border-red-500/30 rounded-lg transition-colors text-sm"
            >
              🗑️ Limpiar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Lista de Historias de Usuario */}
      {sortedStories.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-6 max-w-md mx-auto">
            <svg className="w-16 h-16 text-blue-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-white mb-2">No hay historias disponibles</h3>
            <p className="text-blue-200 mb-4">
              {epicId 
                ? 'Esta épica no tiene historias de usuario aún.' 
                : 'Comienza creando tu primera historia de usuario.'
              }
            </p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors inline-block">
              Crear Historia
            </button>
          </div>
        </div>
      ) : (
        <div className={
          viewMode === 'backlog' 
            ? 'space-y-3' 
            : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
        }>
          {sortedStories.map((story, index) => (
            <UserStoryCard 
              key={story.id} 
              story={story}
              viewMode={viewMode}
              priority={index + 1}
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

export default UserStoryList;
