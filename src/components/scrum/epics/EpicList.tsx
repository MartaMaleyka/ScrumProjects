import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { scrumService } from '../../../services/scrumService';
import type { Epic, EpicFilters } from '../../../types/scrum';
import EpicCard from './EpicCard';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';
import PriorityBadge from '../common/PriorityBadge';
import EpicFormImproved from './EpicFormImproved';
import UserStoryForm from '../stories/UserStoryForm';

interface EpicListProps {
  projectId: number;
}

const EpicList: React.FC<EpicListProps> = ({ projectId }) => {
  const { t } = useTranslation();
  const [epics, setEpics] = useState<Epic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EpicFilters>({});
  const [expandedEpic, setExpandedEpic] = useState<number | null>(null);
  const [showEpicForm, setShowEpicForm] = useState(false);
  const [editingEpic, setEditingEpic] = useState<Epic | null>(null);
  const [showStoryForm, setShowStoryForm] = useState(false);
  const [selectedEpicId, setSelectedEpicId] = useState<number | null>(null);
  const [editingStory, setEditingStory] = useState<any | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
          throw new Error(response.message || t('epics.loadError', 'Error al cargar épicas'));
        }
      } catch (err: any) {
        setError(err.message || t('epics.loadError', 'Error al cargar las épicas'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchEpics();
  }, [projectId, filters]);

  const handleEpicCreated = () => {
    setShowEpicForm(false);
    setEditingEpic(null);
    // Recargar la lista de épicas
    const fetchEpics = async () => {
      try {
        const response = await scrumService.getProjectEpics(projectId, filters);
        if (response.success && response.data) {
          setEpics(response.data.epics || []);
        }
      } catch (err) {
        console.error('Error al recargar épicas:', err);
      }
    };
    fetchEpics();
  };

  const handleEditEpic = (epic: Epic) => {
    setEditingEpic(epic);
    setShowEpicForm(true);
  };

  const handleAddStory = (epicId: number) => {
    setSelectedEpicId(epicId);
    setEditingStory(null);
    setShowStoryForm(true);
  };

  const handleEditStory = (story: any) => {
    setEditingStory(story);
    setSelectedEpicId(story.epicId);
    setShowStoryForm(true);
  };

  const handleStoryCreated = () => {
    setShowStoryForm(false);
    const createdEpicId = selectedEpicId;
    setSelectedEpicId(null);
    setEditingStory(null);
    
    // Recargar la lista de épicas para actualizar los contadores
    const fetchEpics = async () => {
      try {
        const response = await scrumService.getProjectEpics(projectId, filters);
        if (response.success && response.data) {
          setEpics(response.data.epics || []);
          // Forzar actualización del EpicCard que tiene la épica expandida
          if (createdEpicId && expandedEpic === createdEpicId) {
            setRefreshTrigger(prev => prev + 1);
          }
        }
      } catch (err) {
        console.error('Error al recargar épicas:', err);
      }
    };
    fetchEpics();
  };

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
        <LoadingSpinner size="lg" text={t('epics.loading', 'Cargando épicas...')} />
      </div>
    );
  }

  // Mostrar error
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto shadow-sm">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-medium text-red-900 mb-2">{t('epics.loadError', 'Error al cargar épicas')}</h3>
          <p className="text-red-700 mb-4">{error}</p>
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('epics.title', 'Épicas')} {t('epics.ofProject', 'del')} <span className="text-indigo-600">{t('projects.title', 'Proyecto')}</span>
          </h2>
          <p className="text-gray-600">
            {t('epics.subtitle', 'Gestiona las épicas y su progreso en el proyecto')}
          </p>
        </div>
        
        <button 
          onClick={() => setShowEpicForm(true)}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 px-6 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 flex items-center space-x-2 shadow-md"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>{t('epics.new', 'Nueva Épica')}</span>
        </button>
      </div>

      {/* Estadísticas - Compactas */}
      <div className="flex items-center gap-3 flex-wrap">
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
          <span>{t('epics.status.draft', 'Borrador')}</span>
        </button>
        <button
          onClick={() => handleFilterChange('status', 'READY')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-sm font-medium shadow-sm hover:shadow-md transition-all"
        >
          <span className="font-bold">{stats.ready}</span>
          <span>{t('epics.status.ready', 'Listas')}</span>
        </button>
        <button
          onClick={() => handleFilterChange('status', 'IN_PROGRESS')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500 text-white text-sm font-medium shadow-sm hover:shadow-md transition-all"
        >
          <span className="font-bold">{stats.inProgress}</span>
          <span>{t('epics.status.inProgress', 'En Progreso')}</span>
        </button>
        <button
          onClick={() => handleFilterChange('status', 'COMPLETED')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm font-medium shadow-sm hover:shadow-md transition-all"
        >
          <span className="font-bold">{stats.completed}</span>
          <span>{t('epics.status.completed', 'Completadas')}</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Filtro de Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('projects.status', 'Estado')}</label>
            <select
              value={filters.status || 'all'}
              onChange={(e) => handleFilterChange('status', e.target.value === 'all' ? undefined : e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">{t('projects.all', 'Todos')}</option>
              <option value="DRAFT">{t('epics.status.draft', 'Borrador')}</option>
              <option value="READY">{t('epics.status.ready', 'Listo')}</option>
              <option value="IN_PROGRESS">{t('epics.status.inProgress', 'En Progreso')}</option>
              <option value="COMPLETED">{t('epics.status.completed', 'Completado')}</option>
              <option value="CANCELLED">{t('epics.status.cancelled', 'Cancelado')}</option>
            </select>
          </div>

          {/* Filtro de Prioridad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('epics.priority', 'Prioridad')}</label>
            <select
              value={filters.priority || 'all'}
              onChange={(e) => handleFilterChange('priority', e.target.value === 'all' ? undefined : e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">{t('epics.allPriorities', 'Todas')}</option>
              <option value="LOW">{t('epics.priority.low', 'Baja')}</option>
              <option value="MEDIUM">{t('epics.priority.medium', 'Media')}</option>
              <option value="HIGH">{t('epics.priority.high', 'Alta')}</option>
              <option value="CRITICAL">{t('epics.priority.critical', 'Crítica')}</option>
            </select>
          </div>

          {/* Botón limpiar filtros */}
          <div className="flex items-end">
            {(filters.status || filters.priority) && (
              <button
                onClick={() => setFilters({})}
                className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border border-red-200 rounded-lg transition-colors text-sm font-medium"
              >
                🗑️ {t('projects.clearFilters', 'Limpiar Filtros')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Épicas */}
      {epics.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 max-w-md mx-auto shadow-sm">
            <svg className="w-16 h-16 text-indigo-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('epics.noEpics', 'No hay épicas disponibles')}</h3>
            <p className="text-gray-600 mb-4">{t('epics.noEpicsDesc', 'Comienza creando tu primera épica para este proyecto.')}</p>
            <button 
              onClick={() => setShowEpicForm(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg transition-colors inline-block font-medium shadow-md"
            >
              {t('epics.create', 'Crear Épica')}
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
              onEdit={() => handleEditEpic(epic)}
              onAddStory={() => handleAddStory(epic.id)}
              onEditStory={handleEditStory}
              onUpdate={expandedEpic === epic.id ? refreshTrigger : undefined}
            />
          ))}
        </div>
      )}

      {/* Modal del Formulario de Épica */}
      {showEpicForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8 relative">
            {/* Botón cerrar en la esquina superior derecha */}
            <button
              onClick={() => {
                setShowEpicForm(false);
                setEditingEpic(null);
              }}
              className="sticky top-0 float-right m-4 text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-gray-100 z-30 bg-white shadow-sm"
              title={t('common.close', 'Cerrar')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="p-6">
              <EpicFormImproved
                initialData={editingEpic ? {
                  title: editingEpic.title,
                  description: editingEpic.description,
                  projectId: editingEpic.projectId,
                  status: editingEpic.status,
                  priority: editingEpic.priority,
                  businessValue: editingEpic.businessValue ? String(editingEpic.businessValue) : '',
                } : { projectId }}
                epicId={editingEpic ? String(editingEpic.id) : undefined}
                mode={editingEpic ? 'edit' : 'create'}
                asModal={true}
                onSuccess={handleEpicCreated}
                onClose={() => {
                  setShowEpicForm(false);
                  setEditingEpic(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal del Formulario de Historia de Usuario */}
      {showStoryForm && selectedEpicId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8 relative">
            {/* Botón cerrar en la esquina superior derecha */}
            <button
              onClick={() => {
                setShowStoryForm(false);
                setSelectedEpicId(null);
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
              epicId={selectedEpicId}
              isOpen={showStoryForm}
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
              userStoryId={editingStory ? editingStory.id : undefined}
              mode={editingStory ? 'edit' : 'create'}
              onSuccess={handleStoryCreated}
              onCancel={() => {
                setShowStoryForm(false);
                setSelectedEpicId(null);
                setEditingStory(null);
              }}
              onClose={() => {
                setShowStoryForm(false);
                setSelectedEpicId(null);
                setEditingStory(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EpicList;
