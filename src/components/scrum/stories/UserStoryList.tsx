import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { scrumService } from '../../../services/scrumService';
import type { UserStory, UserStoryFilters, Epic } from '../../../types/scrum';
import UserStoryCard from './UserStoryCard';
import UserStoryForm from './UserStoryForm';
import LoadingSpinner from '../common/LoadingSpinner';

interface UserStoryListProps {
  projectId: number;
  epicId?: number;
  sprintId?: number;
}

const UserStoryList: React.FC<UserStoryListProps> = ({ projectId, epicId, sprintId }) => {
  const { t } = useTranslation();
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UserStoryFilters>({});
  const [viewMode, setViewMode] = useState<'backlog' | 'cards'>('backlog');
  const [showStoryForm, setShowStoryForm] = useState(false);
  const [editingStory, setEditingStory] = useState<UserStory | null>(null);

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
          // Cargar todas las historias del proyecto usando el endpoint directo
          const response = await scrumService.getProjectUserStories(projectId, filters);
          if (response.success && response.data) {
            stories = response.data.userStories || [];
          }
        }
        
        // Aplicar filtros adicionales si es necesario
        if (sprintId) {
          stories = stories.filter(story => story.sprintId === sprintId);
        }
        
        setUserStories(stories);
      } catch (err: any) {
        setError(err.message || t('stories.loadError', 'Error al cargar las historias de usuario'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserStories();
  }, [projectId, epicId, sprintId, filters]);

  const handleFilterChange = (key: keyof UserStoryFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleEditStory = (story: UserStory) => {
    setEditingStory(story);
    setShowStoryForm(true);
  };

  const handleStoryCreated = () => {
    setShowStoryForm(false);
    setEditingStory(null);
    // Refrescar la lista
    setFilters(prev => ({ ...prev }));
  };

  const getStatusStats = () => {
    const stats = {
      total: userStories.length,
      draft: userStories.filter(s => s.status === 'DRAFT').length,
      ready: userStories.filter(s => s.status === 'READY').length,
      inProgress: userStories.filter(s => s.status === 'IN_PROGRESS').length,
      completed: userStories.filter(s => s.status === 'COMPLETED').length,
      cancelled: userStories.filter(s => s.status === 'CANCELLED').length,
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
    const priorityOrder: Record<string, number> = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    if (priorityDiff !== 0) return priorityDiff;
    
    // Luego por estado (READY > DRAFT > IN_PROGRESS > COMPLETED > CANCELLED)
    const statusOrder: Record<string, number> = { 
      'READY': 5, 
      'DRAFT': 4, 
      'IN_PROGRESS': 3, 
      'COMPLETED': 2, 
      'CANCELLED': 1 
    };
    return (statusOrder[b.status] || 0) - (statusOrder[a.status] || 0);
  });

  // Mostrar estado de carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" text={t('stories.loading', 'Cargando historias de usuario...')} />
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('stories.loadError', 'Error al cargar historias')}</h3>
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
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {epicId ? t('stories.epicStories', 'Historias de la Épica') : sprintId ? t('stories.sprintStories', 'Historias del Sprint') : t('stories.product', 'Product')} <span className="text-indigo-600">{t('stories.backlog', 'Backlog')}</span>
            </h2>
            <p className="text-gray-600">
              {t('stories.subtitle', 'Gestiona y prioriza las historias de usuario del proyecto')}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => {
                setEditingStory(null);
                setShowStoryForm(true);
              }}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 px-6 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 flex items-center space-x-2 shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>{t('stories.newStory', 'Nueva Historia')}</span>
            </button>
          </div>
        </div>
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
          onClick={() => handleFilterChange('status', 'DRAFT')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-500 text-white text-sm font-medium shadow-sm hover:shadow-md transition-all"
        >
          <span className="font-bold">{stats.draft}</span>
          <span>{t('stories.status.draft', 'Borrador')}</span>
        </button>
        <button
          onClick={() => handleFilterChange('status', 'READY')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-sm font-medium shadow-sm hover:shadow-md transition-all"
        >
          <span className="font-bold">{stats.ready}</span>
          <span>{t('stories.status.ready', 'Listas')}</span>
        </button>
        <button
          onClick={() => handleFilterChange('status', 'IN_PROGRESS')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500 text-white text-sm font-medium shadow-sm hover:shadow-md transition-all"
        >
          <span className="font-bold">{stats.inProgress}</span>
          <span>{t('stories.status.inProgress', 'En Progreso')}</span>
        </button>
        <button
          onClick={() => handleFilterChange('status', 'COMPLETED')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm font-medium shadow-sm hover:shadow-md transition-all"
        >
          <span className="font-bold">{stats.completed}</span>
          <span>{t('stories.status.completed', 'Completadas')}</span>
        </button>
        <button
          onClick={() => handleFilterChange('status', 'CANCELLED')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-400 text-white text-sm font-medium shadow-sm hover:shadow-md transition-all"
        >
          <span className="font-bold">{stats.cancelled}</span>
          <span>{t('stories.status.cancelled', 'Canceladas')}</span>
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 text-sm font-medium border border-indigo-200">
          <span className="font-bold">{stats.totalPoints}</span>
          <span>{t('stories.storyPoints', 'Story Points')}</span>
        </div>
      </div>

      {/* Controles */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Información adicional */}
          <div className="text-sm text-gray-600">
            {stats.inSprints} {t('stories.inSprints', 'historias en sprints')} • {stats.notInSprints} {t('stories.unassigned', 'sin asignar')} • {stats.totalPoints} {t('stories.totalStoryPoints', 'story points total')}
          </div>
          
          {/* Vista */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">{t('projects.view', 'Vista')}:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('backlog')}
                className={`px-3 py-1.5 rounded-md transition-colors text-xs font-medium ${
                  viewMode === 'backlog' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'
                }`}
              >
                {t('stories.backlog', 'Backlog')}
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-md transition-colors text-xs font-medium ${
                  viewMode === 'cards' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'
                }`}
              >
                {t('stories.cards', 'Tarjetas')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Historias de Usuario */}
      {sortedStories.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 max-w-md mx-auto shadow-sm">
            <svg className="w-16 h-16 text-indigo-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('stories.noStories', 'No hay historias disponibles')}</h3>
            <p className="text-gray-600 mb-4">
              {epicId 
                ? t('stories.noStoriesInEpic', 'Esta épica no tiene historias de usuario aún.')
                : t('stories.createFirstStory', 'Comienza creando tu primera historia de usuario.')
              }
            </p>
            <button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg transition-colors inline-block shadow-md">
              {t('stories.create', 'Crear Historia')}
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
              onEdit={handleEditStory}
            />
          ))}
        </div>
      )}

      {/* Modal del Formulario de Historia de Usuario */}
      {showStoryForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8 relative">
            {/* Botón cerrar en la esquina superior derecha */}
            <button
              onClick={() => {
                setShowStoryForm(false);
                setEditingStory(null);
              }}
              className="sticky top-0 float-right m-4 text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-gray-100 z-30 bg-white shadow-sm"
              title={t('common.close', 'Cerrar')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <UserStoryForm
              projectId={projectId}
              epicId={editingStory ? editingStory.epicId : (epicId || undefined)}
              isOpen={showStoryForm}
              mode={editingStory ? 'edit' : 'create'}
              userStoryId={editingStory?.id}
              initialData={editingStory ? {
                title: editingStory.title,
                description: editingStory.description,
                acceptanceCriteria: editingStory.acceptanceCriteria || '',
                epicId: editingStory.epicId,
                sprintId: editingStory.sprintId,
                storyPoints: editingStory.storyPoints,
                status: editingStory.status,
                priority: editingStory.priority,
              } : undefined}
              onSuccess={handleStoryCreated}
              onClose={() => {
                setShowStoryForm(false);
                setEditingStory(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default UserStoryList;
