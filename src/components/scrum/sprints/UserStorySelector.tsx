import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { scrumService } from '../../../services/scrumService';
import type { UserStory } from '../../../types/scrum';
import LoadingSpinner from '../common/LoadingSpinner';

interface UserStorySelectorProps {
  projectId: number;
  sprintId: number;
  currentSprintStories: UserStory[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const UserStorySelector: React.FC<UserStorySelectorProps> = ({
  projectId,
  sprintId,
  currentSprintStories,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { t } = useTranslation();
  const [availableStories, setAvailableStories] = useState<UserStory[]>([]);
  const [selectedStoryIds, setSelectedStoryIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    epic: ''
  });

  useEffect(() => {
    if (isOpen && projectId) {
      fetchAvailableStories();
      // Pre-seleccionar las historias que ya están en el sprint
      setSelectedStoryIds(currentSprintStories.map(story => story.id));
    }
  }, [isOpen, projectId, sprintId]);

  const fetchAvailableStories = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Obtener todas las historias del proyecto que no están asignadas a otro sprint
      // o que ya están en el sprint actual
      const response = await scrumService.getProjectUserStories(projectId, {
        sprintId: undefined // Obtener historias sin sprint asignado
      });

      if (response.success && response.data) {
        // Filtrar historias que no tienen sprint o que están en el sprint actual
        const stories = response.data.userStories.filter(story => 
          !story.sprintId || story.sprintId === sprintId
        );
        setAvailableStories(stories);
      } else {
        setError(response.message || t('sprints.selector.loadError', 'Error al cargar las historias de usuario'));
      }
    } catch (err: any) {
      console.error('Error al cargar historias:', err);
      setError(err.message || t('sprints.selector.loadError', 'Error al cargar las historias de usuario'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStory = (storyId: number) => {
    setSelectedStoryIds(prev => {
      if (prev.includes(storyId)) {
        return prev.filter(id => id !== storyId);
      } else {
        return [...prev, storyId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedStoryIds.length === availableStories.length) {
      setSelectedStoryIds([]);
    } else {
      setSelectedStoryIds(availableStories.map(story => story.id));
    }
  };

  const handleAssociate = async () => {
    if (selectedStoryIds.length === 0) {
      setError(t('sprints.selector.selectAtLeastOne', 'Por favor selecciona al menos una historia de usuario'));
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Obtener los datos completos de cada historia antes de actualizar
      const storyDetailsPromises = selectedStoryIds.map(storyId =>
        scrumService.getUserStoryById(storyId)
      );

      const storyDetailsResponses = await Promise.all(storyDetailsPromises);
      
      // Verificar que todas las historias se obtuvieron correctamente
      const invalidStories = storyDetailsResponses.filter(response => !response.success || !response.data);
      if (invalidStories.length > 0) {
        throw new Error(t('sprints.selector.fetchError', 'Error al obtener los datos de algunas historias de usuario'));
      }

      // Actualizar cada historia con todos los campos requeridos más el sprintId
      const updatePromises = storyDetailsResponses.map((response, index) => {
        const story = response.data!.userStory;
        const storyId = selectedStoryIds[index];
        
        // Preparar datos de actualización asegurando que los campos requeridos estén presentes
        const updateData: any = {
          title: story.title,
          description: story.description ?? '',
          epicId: story.epicId,
          sprintId: sprintId
        };
        
        // Agregar campos opcionales solo si existen
        if (story.acceptanceCriteria !== null && story.acceptanceCriteria !== undefined) {
          updateData.acceptanceCriteria = story.acceptanceCriteria;
        }
        if (story.storyPoints !== null && story.storyPoints !== undefined) {
          updateData.storyPoints = story.storyPoints;
        }
        if (story.status) {
          updateData.status = story.status;
        }
        if (story.priority) {
          updateData.priority = story.priority;
        }
        
        return scrumService.updateUserStory(storyId, updateData);
      });

      // Desasociar historias que estaban en el sprint pero ya no están seleccionadas
      const currentStoryIds = currentSprintStories.map(story => story.id);
      const storiesToRemove = currentStoryIds.filter(id => !selectedStoryIds.includes(id));
      
      const removePromises = storiesToRemove.map(storyId => {
        return scrumService.getUserStoryById(storyId).then(response => {
          if (response.success && response.data) {
            const story = response.data.userStory;
            const updateData: any = {
              title: story.title,
              description: story.description ?? '',
              epicId: story.epicId,
              sprintId: null // Remover del sprint
            };
            
            if (story.acceptanceCriteria !== null && story.acceptanceCriteria !== undefined) {
              updateData.acceptanceCriteria = story.acceptanceCriteria;
            }
            if (story.storyPoints !== null && story.storyPoints !== undefined) {
              updateData.storyPoints = story.storyPoints;
            }
            if (story.status) {
              updateData.status = story.status;
            }
            if (story.priority) {
              updateData.priority = story.priority;
            }
            
            return scrumService.updateUserStory(storyId, updateData);
          }
        });
      });

      await Promise.all([...updatePromises, ...removePromises]);

      // Limpiar selección y cerrar modal
      setSelectedStoryIds([]);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || t('sprints.selector.associateError', 'Error al asociar las historias de usuario'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  // Filtrar historias según los filtros
  const filteredStories = availableStories.filter(story => {
    const matchesSearch = filters.search === '' || 
      story.title.toLowerCase().includes(filters.search.toLowerCase());
    const matchesEpic = filters.epic === '' || 
      story.epicId.toString() === filters.epic;
    return matchesSearch && matchesEpic;
  });

  // Obtener épicas únicas para el filtro
  const epics = Array.from(new Set(availableStories.map(story => story.epicId)))
    .map(epicId => {
      const story = availableStories.find(s => s.epicId === epicId);
      return story?.epic ? { id: epicId, title: story.epic.title } : null;
    })
    .filter(Boolean) as Array<{ id: number; title: string }>;

  const content = (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">{t('sprints.associateStories', 'Asociar Historias de Usuario')}</h2>
            <p className="text-indigo-100 text-sm mt-1">
              {t('sprints.selector.subtitle', 'Selecciona las historias de usuario que deseas asociar a este sprint')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-indigo-200 transition-colors p-2 rounded-lg hover:bg-white/10"
            title={t('common.close', 'Cerrar')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-red-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('sprints.selector.searchByTitle', 'Buscar por título')}
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder={t('sprints.selector.searchPlaceholder', 'Buscar historias...')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('sprints.selector.filterByEpic', 'Filtrar por épica')}
              </label>
              <select
                value={filters.epic}
                onChange={(e) => setFilters(prev => ({ ...prev, epic: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">{t('sprints.selector.allEpics', 'Todas las épicas')}</option>
                {epics.map(epic => (
                  <option key={epic.id} value={epic.id.toString()}>
                    {epic.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lista de historias */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" text={t('sprints.selector.loading', 'Cargando historias de usuario...')} />
            </div>
          ) : (
            <>
              {/* Seleccionar todas */}
              <div className="mb-4 flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStoryIds.length === availableStories.length && availableStories.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {t('sprints.selector.selectAll', 'Seleccionar todas')} ({selectedStoryIds.length} {t('common.of', 'de')} {availableStories.length})
                  </span>
                </label>
              </div>

              {/* Lista */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredStories.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {t('sprints.selector.noStories', 'No hay historias de usuario disponibles')}
                  </div>
                ) : (
                  filteredStories.map(story => (
                    <div
                      key={story.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedStoryIds.includes(story.id)
                          ? 'bg-indigo-50 border-indigo-500 shadow-md'
                          : 'bg-white border-gray-200 hover:border-indigo-300'
                      }`}
                      onClick={() => handleToggleStory(story.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedStoryIds.includes(story.id)}
                          onChange={() => handleToggleStory(story.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{story.title}</h4>
                          {story.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {story.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            {story.epic && (
                              <span className="flex items-center space-x-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <span>{story.epic.title}</span>
                              </span>
                            )}
                            {story.storyPoints && (
                              <span className="flex items-center space-x-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <span>{story.storyPoints} {t('stories.points', 'pts')}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-gray-600">
            {selectedStoryIds.length} {selectedStoryIds.length === 1 ? t('sprints.selector.storySelected', 'historia seleccionada') : t('sprints.selector.storiesSelected', 'historias seleccionadas')}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('common.cancel', 'Cancelar')}
            </button>
            <button
              onClick={handleAssociate}
              disabled={isSaving || selectedStoryIds.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{t('sprints.selector.associating', 'Asociando...')}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('sprints.selector.associateStories', 'Asociar Historias')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return content;
};

export default UserStorySelector;

