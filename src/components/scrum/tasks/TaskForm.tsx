import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { scrumService } from '../../../services/scrumService';
import type { 
  Task, 
  CreateTaskData, 
  TaskType, 
  TaskStatus, 
  ScrumPriority,
  UserStory,
  User,
  Sprint
} from '../../../types/scrum';
import LoadingSpinner from '../common/LoadingSpinner';

interface TaskFormProps {
  projectId: number;
  sprintId?: number;
  userStoryId?: number;
  task?: Task;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (task: Task) => void;
}

const TaskForm: React.FC<TaskFormProps> = ({
  projectId,
  sprintId,
  userStoryId,
  task,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<CreateTaskData & { actualHours?: number; projectId?: number; assignedUserId?: number }>({
    title: '',
    description: '',
    type: 'DEVELOPMENT',
    status: 'TODO',
    priority: 'MEDIUM',
    estimatedHours: 0,
    actualHours: 0,
    projectId: projectId,
    sprintId: sprintId,
    userStoryId: userStoryId || 0
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);

  const isEditing = !!task;

  useEffect(() => {
    console.log('🔵 TaskForm renderizado con props:', {
      isOpen,
      projectId,
      userStoryId,
      sprintId,
      isEditing
    });
  }, [isOpen, projectId, userStoryId, sprintId, isEditing]);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        type: task.type,
        status: task.status,
        priority: task.priority,
        estimatedHours: task.estimatedHours || 0,
        actualHours: task.actualHours || 0,
        projectId: projectId,
        sprintId: task.sprintId || undefined,
        userStoryId: task.userStoryId,
        assigneeId: task.assigneeId || undefined,
        assignedUserId: task.assigneeId || undefined
      });
    }
  }, [task]);

  useEffect(() => {
    if (isOpen && projectId) {
      loadFormData();
    }
  }, [isOpen, projectId]);

  const loadFormData = async () => {
    try {
      setIsLoading(true);
      
      // Cargar historias de usuario del proyecto a través de épicas
      const epicsResponse = await scrumService.getProjectEpics(projectId);
      if (epicsResponse.success && epicsResponse.data) {
        const allStories: UserStory[] = [];
        for (const epic of epicsResponse.data.epics) {
          const storiesResponse = await scrumService.getEpicUserStories(epic.id);
          if (storiesResponse.success && storiesResponse.data) {
            allStories.push(...storiesResponse.data.userStories);
          }
        }
        setUserStories(allStories);
      }

      // Cargar miembros del proyecto
      const projectResponse = await scrumService.getProjectById(projectId);
      if (projectResponse.success && projectResponse.data?.project.members) {
        const members = projectResponse.data.project.members.map((pm: any) => pm.user);
        setTeamMembers(members);
      }

      // Cargar sprints del proyecto
      const sprintsResponse = await scrumService.getProjectSprints(projectId);
      if (sprintsResponse.success && sprintsResponse.data) {
        setSprints(sprintsResponse.data.sprints);
      }
    } catch (err) {
      setError(t('tasks.form.loadError', 'Error al cargar los datos del formulario'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    let processedValue: any = value;
    if (type === 'number') {
      processedValue = value === '' ? 0 : parseFloat(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
    
    // Limpiar error cuando el usuario empiece a escribir
    if (error) setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError(t('tasks.form.errors.titleRequired', 'El título de la tarea es requerido'));
      return false;
    }

    if (formData.estimatedHours && formData.estimatedHours < 0) {
      setError(t('tasks.form.errors.estimatedHoursNegative', 'Las horas estimadas no pueden ser negativas'));
      return false;
    }

    if (formData.actualHours && formData.actualHours < 0) {
      setError(t('tasks.form.errors.actualHoursNegative', 'Las horas reales no pueden ser negativas'));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let response;
      
      if (isEditing && task) {
        const updateData = {
          title: formData.title,
          description: formData.description,
          type: formData.type,
          status: formData.status,
          priority: formData.priority,
          estimatedHours: formData.estimatedHours,
          assigneeId: formData.assignedUserId
        };
        response = await scrumService.updateTask(task.id, updateData);
      } else {
        const createData: CreateTaskData = {
          title: formData.title,
          description: formData.description,
          userStoryId: formData.userStoryId || 0,
          sprintId: formData.sprintId,
          type: formData.type,
          status: formData.status,
          priority: formData.priority,
          estimatedHours: formData.estimatedHours,
          assigneeId: formData.assignedUserId
        };
        response = await scrumService.createTask(createData);
      }
      
      if (response.success && response.data) {
        onSuccess(response.data.task);
        handleClose();
      } else {
        setError(response.message || t('tasks.form.errors.saveError', 'Error al guardar la tarea'));
      }
    } catch (err) {
      setError(t('tasks.form.errors.saveError', 'Error al guardar la tarea'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      type: 'DEVELOPMENT',
      status: 'TODO',
      priority: 'MEDIUM',
      estimatedHours: 0,
      actualHours: 0,
      projectId: projectId,
      sprintId: sprintId,
      userStoryId: userStoryId || 0
    });
    setError(null);
    onClose();
  };

  const getTaskTypeIcon = (type: TaskType) => {
    switch (type) {
      case 'DEVELOPMENT':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
      case 'TESTING':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'DESIGN':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
          </svg>
        );
      case 'DOCUMENTATION':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'BUG_FIX':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'RESEARCH':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
      case 'REFACTORING':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
    }
  };

  const getPriorityColor = (priority: ScrumPriority) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200';
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'LOW': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (!isOpen) {
    console.log('❌ TaskForm no renderizado: isOpen es false');
    return null;
  }

  console.log('✅ TaskForm renderizando modal con projectId:', projectId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                {isEditing ? t('tasks.editTask', 'Editar Tarea') : t('tasks.form.createTitle', 'Crear Nueva Tarea')}
              </h2>
              <p className="text-indigo-100 text-sm mt-1">
                {userStoryId ? t('tasks.form.userStoryTask', 'Tarea de Historia de Usuario') : sprintId ? t('tasks.form.sprintTask', 'Tarea de Sprint') : t('tasks.form.generalTask', 'Tarea General')}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información Básica */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                {t('tasks.form.titleLabel', 'Título de la Tarea')} *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder={t('tasks.form.titlePlaceholder', 'Ej: Implementar autenticación de usuarios')}
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                {t('tasks.form.descriptionLabel', 'Descripción')}
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                placeholder={t('tasks.form.descriptionPlaceholder', 'Describe los detalles de la tarea, criterios de aceptación, etc...')}
              />
            </div>

            {/* Tipo y Estado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tasks.form.typeLabel', 'Tipo de Tarea')}
                </label>
                <div className="relative">
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
                  >
                    <option value="DEVELOPMENT">{t('tasks.types.development', 'Desarrollo')}</option>
                    <option value="TESTING">{t('tasks.types.testing', 'Testing')}</option>
                    <option value="DESIGN">{t('tasks.types.design', 'Diseño')}</option>
                    <option value="DOCUMENTATION">{t('tasks.types.documentation', 'Documentación')}</option>
                    <option value="BUG_FIX">{t('tasks.types.bugFix', 'Corrección de Errores')}</option>
                    <option value="RESEARCH">{t('tasks.types.research', 'Investigación')}</option>
                    <option value="REFACTORING">{t('tasks.types.refactoring', 'Refactorización')}</option>
                  </select>
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    {getTaskTypeIcon(formData.type || 'DEVELOPMENT')}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tasks.form.statusLabel', 'Estado')}
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="TODO">{t('tasks.status.todo', 'Por Hacer')}</option>
                  <option value="IN_PROGRESS">{t('tasks.status.inProgress', 'En Progreso')}</option>
                  <option value="IN_REVIEW">{t('tasks.status.inReview', 'En Revisión')}</option>
                  <option value="COMPLETED">{t('tasks.status.completed', 'Completado')}</option>
                  <option value="CANCELLED">{t('common.statusCancelled', 'Cancelado')}</option>
                </select>
              </div>
            </div>

            {/* Prioridad */}
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                {t('tasks.form.priorityLabel', 'Prioridad')}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as ScrumPriority[]).map(priority => (
                  <label
                    key={priority}
                    className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.priority === priority
                        ? getPriorityColor(priority)
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={priority}
                      checked={formData.priority === priority}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">
                      {priority === 'LOW' ? t('epics.priority.low', 'Baja') :
                       priority === 'MEDIUM' ? t('epics.priority.medium', 'Media') :
                       priority === 'HIGH' ? t('epics.priority.high', 'Alta') : t('epics.priority.critical', 'Crítica')}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Horas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="estimatedHours" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tasks.form.estimatedHoursLabel', 'Horas Estimadas')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="estimatedHours"
                    name="estimatedHours"
                    value={formData.estimatedHours || ''}
                    onChange={handleInputChange}
                    min="0"
                    step="0.5"
                    className="w-full pl-3 pr-12 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                    {t('tasks.form.hours', 'hrs')}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="actualHours" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tasks.form.actualHoursLabel', 'Horas Reales')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="actualHours"
                    name="actualHours"
                    value={formData.actualHours || ''}
                    onChange={handleInputChange}
                    min="0"
                    step="0.5"
                    className="w-full pl-3 pr-12 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                    {t('tasks.form.hours', 'hrs')}
                  </div>
                </div>
              </div>
            </div>

            {/* Asignaciones */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="assignedUserId" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tasks.form.assigneeLabel', 'Asignado a')}
                </label>
                <select
                  id="assignedUserId"
                  name="assignedUserId"
                  value={formData.assignedUserId || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">{t('tasks.unassigned', 'Sin asignar')}</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="sprintId" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('sprints.title', 'Sprint')}
                </label>
                <select
                  id="sprintId"
                  name="sprintId"
                  value={formData.sprintId || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">{t('tasks.form.noSprint', 'Sin sprint')}</option>
                  {sprints.map(sprint => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="userStoryId" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tasks.userStory', 'Historia de Usuario')}
                </label>
                <select
                  id="userStoryId"
                  name="userStoryId"
                  value={formData.userStoryId || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">{t('tasks.form.noUserStory', 'Sin historia')}</option>
                  {userStories.map(story => (
                    <option key={story.id} value={story.id}>
                      {story.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('common.cancel', 'Cancelar')}
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 border border-transparent rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
          >
            {isLoading && <LoadingSpinner size="sm" />}
            {isEditing ? t('tasks.form.updateButton', 'Actualizar Tarea') : t('tasks.form.createButton', 'Crear Tarea')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskForm;