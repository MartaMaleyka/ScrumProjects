import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { scrumService } from '../../../services/scrumService';
import type { Epic, UserStory } from '../../../types/scrum';
import StatusBadge from '../common/StatusBadge';
import PriorityBadge from '../common/PriorityBadge';
import ProgressBar from '../common/ProgressBar';

interface EpicCardProps {
  epic: Epic;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onEdit?: () => void;
  onAddStory?: () => void;
  onEditStory?: (story: UserStory) => void;
  onUpdate?: number | (() => void);
}

const EpicCard: React.FC<EpicCardProps> = ({ 
  epic, 
  isExpanded = false, 
  onToggleExpand, 
  onEdit,
  onAddStory,
  onEditStory,
  onUpdate 
}) => {
  const { t } = useTranslation();
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [isLoadingStories, setIsLoadingStories] = useState(false);

  // Función para cargar historias
  const fetchUserStories = async () => {
    if (!epic.id) return;
    
    try {
      setIsLoadingStories(true);
      const response = await scrumService.getEpicUserStories(epic.id);
      
      if (response.success && response.data) {
        setUserStories(response.data.userStories || []);
      }
    } catch (err) {
    } finally {
      setIsLoadingStories(false);
    }
  };

  // Cargar historias de usuario cuando se expande la épica
  useEffect(() => {
    if (isExpanded && epic.id) {
      fetchUserStories();
    }
  }, [isExpanded, epic.id]);

  // Recargar historias cuando se actualiza (después de crear una nueva)
  useEffect(() => {
    if (isExpanded && epic.id && onUpdate !== undefined && onUpdate !== null) {
      // Si onUpdate es un número (trigger), recargar historias
      if (typeof onUpdate === 'number') {
        fetchUserStories();
      }
    }
  }, [onUpdate, isExpanded, epic.id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(t('common.locale', 'es-ES') as string, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getProgressData = () => {
    const totalStories = epic._count?.userStories || userStories.length || 0;
    const completedStories = userStories.filter(story => story.status === 'COMPLETED').length;
    const progress = totalStories > 0 ? (completedStories / totalStories) * 100 : 0;
    
    return { progress, completed: completedStories, total: totalStories };
  };

  const getTotalStoryPoints = () => {
    return userStories.reduce((total, story) => total + (story.storyPoints || 0), 0);
  };

  const getEpicIcon = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        );
      case 'READY':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'IN_PROGRESS':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'COMPLETED':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
    }
  };

  const { progress, completed, total } = getProgressData();

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 animate-fade-in shadow-sm">
      {/* Header de la épica (siempre visible) */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-4 flex-1">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white shadow-sm">
              {getEpicIcon(epic.status)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-xl font-semibold text-gray-900 line-clamp-1">{epic.title}</h3>
                <StatusBadge status={epic.status} type="epic" size="sm" />
                <PriorityBadge priority={epic.priority} size="sm" />
              </div>
              
              <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                {epic.description || t('common.noDescription', 'Sin descripción disponible')}
              </p>
              
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>{epic._count?.userStories || 0} {t('stories.title', 'historias')}</span>
                </div>
                
                {isExpanded && (
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>{getTotalStoryPoints()} {t('epics.points', 'puntos')}</span>
                  </div>
                )}
                
                <div className="text-xs">
                  {t('projects.detail.created', 'Creado')}: {formatDate(epic.createdAt)}
                </div>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center space-x-2 ml-4">
            {onEdit && (
              <button
                onClick={onEdit}
                className="text-gray-500 hover:text-indigo-600 transition-colors p-2 rounded-lg hover:bg-indigo-50"
                title={t('epics.edit', 'Editar épica')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            
            {onToggleExpand && (
              <button
                onClick={onToggleExpand}
                className="text-gray-500 hover:text-indigo-600 transition-colors p-2 rounded-lg hover:bg-indigo-50"
                title={isExpanded ? t('epics.collapse', 'Contraer') : t('epics.expand', 'Expandir')}
              >
                <svg 
                  className={`w-5 h-5 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
            
            <div className="relative group">
              <button className="text-gray-500 hover:text-indigo-600 transition-colors p-2 rounded-lg hover:bg-indigo-50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              
              {/* Dropdown de acciones */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                <div className="py-2">
                  {onAddStory && (
                    <button 
                      onClick={onAddStory}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      {t('epics.newStory', 'Nueva historia')}
                    </button>
                  )}
                  <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                    {t('epics.duplicate', 'Duplicar épica')}
                  </button>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {t('common.delete', 'Eliminar')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progreso de la épica */}
        <div className="mb-4">
          <ProgressBar 
            progress={progress} 
            completed={completed}
            total={total}
            label={t('epics.storyProgress', 'Progreso de historias')}
            size="md"
            color="purple"
            showPercentage={true}
            showNumbers={true}
          />
        </div>

        {/* Valor de negocio */}
        {epic.businessValue && (
          <div className="flex items-center space-x-2 text-sm">
            <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            <span className="text-gray-600">{t('epics.businessValue', 'Valor de negocio')}:</span>
            <span className="text-yellow-600 font-medium">{epic.businessValue}</span>
          </div>
        )}
      </div>

      {/* Contenido expandido */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium text-gray-900">{t('epics.relatedStories', 'Historias de Usuario Relacionadas')}</h4>
              {onAddStory && (
                <button 
                  onClick={onAddStory}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-3 py-1 rounded-lg transition-colors text-sm flex items-center space-x-1 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>{t('epics.addStory', 'Agregar Historia')}</span>
                </button>
              )}
            </div>

            {/* Lista de historias de usuario */}
            {isLoadingStories ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-2"></div>
                <p className="text-gray-600 text-sm">{t('epics.loadingStories', 'Cargando historias...')}</p>
              </div>
            ) : userStories.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-indigo-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-600 text-sm mb-3">{t('epics.noStories', 'No hay historias de usuario en esta épica')}</p>
                {onAddStory && (
                  <button 
                    onClick={onAddStory}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm shadow-sm"
                  >
                    {t('epics.createFirstStory', 'Crear primera historia')}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {userStories.map((story) => (
                  <div key={story.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h5 className="text-gray-900 font-medium line-clamp-1">{story.title}</h5>
                          <StatusBadge status={story.status} type="story" size="sm" />
                          <PriorityBadge priority={story.priority} size="sm" />
                          {story.storyPoints && (
                            <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs font-medium border border-indigo-200">
                              {story.storyPoints} pts
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm line-clamp-2">{story.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span>{t('tasks.title', 'Tareas')}: {story._count?.tasks || 0}</span>
                          {story.sprint && (
                            <span>{t('sprints.title', 'Sprint')}: {story.sprint.name}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button className="text-gray-500 hover:text-indigo-600 transition-colors p-1 rounded hover:bg-indigo-50">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        {onEditStory && (
                          <button 
                            onClick={() => onEditStory(story)}
                            className="text-gray-500 hover:text-indigo-600 transition-colors p-1 rounded hover:bg-indigo-50"
                            title={t('stories.edit', 'Editar historia')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sprints asociados */}
            {epic.associatedSprints && epic.associatedSprints.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-lg font-medium text-gray-900 mb-3">{t('epics.relatedSprints', 'Sprints Relacionados')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {epic.associatedSprints.map((sprint) => (
                    <div key={sprint.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-gray-900 font-medium">{sprint.name}</h5>
                          <div className="text-xs text-gray-600 mt-1">
                            {sprint.userStories.length} {t('stories.title', 'historias')} • {sprint.totalStoryPoints} {t('epics.points', 'puntos')}
                          </div>
                        </div>
                        <StatusBadge status={sprint.status} type="sprint" size="sm" />
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
  );
};

export default EpicCard;
