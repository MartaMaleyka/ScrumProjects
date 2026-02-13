import React, { useState, useEffect } from 'react';
import { scrumService } from '../../../services/scrumService';
import type { CreateUserStoryData, UserStoryStatus, ScrumPriority, Epic, Sprint } from '../../../types/scrum';
import LoadingSpinner from '../common/LoadingSpinner';

interface UserStoryFormProps {
  projectId: number;
  epicId?: number;
  sprintId?: number;
  isOpen?: boolean;
  onSuccess?: (userStory: any) => void;
  onCancel?: () => void;
  onClose?: () => void;
  initialData?: Partial<CreateUserStoryData>;
  mode?: 'create' | 'edit';
}

const UserStoryForm: React.FC<UserStoryFormProps> = ({ 
  projectId,
  epicId,
  sprintId,
  isOpen = true,
  onSuccess, 
  onCancel, 
  onClose,
  initialData,
  mode = 'create' 
}) => {
  const [formData, setFormData] = useState<CreateUserStoryData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    acceptanceCriteria: initialData?.acceptanceCriteria || '',
    epicId: epicId || initialData?.epicId || 0,
    sprintId: sprintId || initialData?.sprintId || undefined,
    storyPoints: initialData?.storyPoints || undefined,
    status: initialData?.status || 'DRAFT',
    priority: initialData?.priority || 'MEDIUM',
  });
  
  const [epics, setEpics] = useState<Epic[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cargar épicas y sprints del proyecto
  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        setIsLoadingData(true);
        
        const [epicsResponse, sprintsResponse] = await Promise.all([
          scrumService.getProjectEpics(projectId),
          scrumService.getProjectSprints(projectId)
        ]);

        if (epicsResponse.success && epicsResponse.data) {
          setEpics(epicsResponse.data.epics || []);
        }

        if (sprintsResponse.success && sprintsResponse.data) {
          setSprints(sprintsResponse.data.sprints || []);
        }
      } catch (err) {
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchProjectData();
  }, [projectId]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'El título de la historia es obligatorio';
    } else if (formData.title.trim().length < 10) {
      newErrors.title = 'El título debe tener al menos 10 caracteres';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es obligatoria';
    } else if (formData.description.trim().length < 20) {
      newErrors.description = 'La descripción debe tener al menos 20 caracteres';
    } else if (formData.description.length > 2000) {
      newErrors.description = 'La descripción no puede exceder 2000 caracteres';
    }

    if (!formData.epicId) {
      newErrors.epicId = 'Debes seleccionar una épica';
    }

    if (formData.storyPoints !== undefined && (formData.storyPoints < 1 || formData.storyPoints > 100)) {
      newErrors.storyPoints = 'Los story points deben estar entre 1 y 100';
    }

    if (formData.acceptanceCriteria && formData.acceptanceCriteria.length > 1500) {
      newErrors.acceptanceCriteria = 'Los criterios de aceptación no pueden exceder 1500 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    let processedValue: any = value;
    if (type === 'number') {
      processedValue = value === '' ? undefined : Number(value);
    } else if (name === 'epicId' || name === 'sprintId') {
      processedValue = value === '' ? undefined : Number(value);
    }
    
    setFormData(prev => ({ ...prev, [name]: processedValue }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await scrumService.createUserStory(formData);
      
      if (response.success && response.data) {
        onSuccess?.(response.data.userStory);
      } else {
        throw new Error(response.message || 'Error al crear la historia de usuario');
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear la historia de usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions: { value: UserStoryStatus; label: string }[] = [
    { value: 'DRAFT', label: 'Borrador' },
    { value: 'READY', label: 'Listo' },
    { value: 'IN_PROGRESS', label: 'En Progreso' },
    { value: 'TESTING', label: 'En Testing' },
    { value: 'COMPLETED', label: 'Completado' },
    { value: 'CANCELLED', label: 'Cancelado' },
  ];

  const priorityOptions: { value: ScrumPriority; label: string }[] = [
    { value: 'LOW', label: 'Baja' },
    { value: 'MEDIUM', label: 'Media' },
    { value: 'HIGH', label: 'Alta' },
    { value: 'CRITICAL', label: 'Crítica' },
  ];

  const storyPointsOptions = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" text="Cargando datos..." />
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {mode === 'create' ? 'Nueva' : 'Editar'} <span className="text-[#FFCD00]">Historia de Usuario</span>
          </h2>
          <p className="text-blue-200 mt-1">
            {mode === 'create' 
              ? 'Crea una nueva historia de usuario para el backlog' 
              : 'Modifica la información de la historia de usuario'
            }
          </p>
        </div>
        
        {(onCancel || onClose) && (
          <button
            onClick={onClose || onCancel}
            className="text-blue-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
            title="Cerrar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Error general */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-red-200">{error}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Título de la historia */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-blue-200 mb-2">
            Título de la Historia de Usuario *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className={`w-full bg-white/10 border ${errors.title ? 'border-red-500/50' : 'border-white/20'} rounded-lg px-4 py-3 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors`}
            placeholder="Como [usuario], quiero [funcionalidad] para [beneficio]"
            disabled={isLoading}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-300">{errors.title}</p>
          )}
          <p className="mt-1 text-xs text-blue-300">
            Sigue el formato: "Como [tipo de usuario], quiero [funcionalidad] para [beneficio]"
          </p>
        </div>

        {/* Épica, Estado, Prioridad y Story Points */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label htmlFor="epicId" className="block text-sm font-medium text-blue-200 mb-2">
              Épica *
            </label>
            <select
              id="epicId"
              name="epicId"
              value={formData.epicId || ''}
              onChange={handleInputChange}
              className={`w-full bg-white/10 border ${errors.epicId ? 'border-red-500/50' : 'border-white/20'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              disabled={isLoading}
            >
              <option value="">Seleccionar épica</option>
              {epics.map(epic => (
                <option key={epic.id} value={epic.id} className="bg-gray-800">
                  {epic.title}
                </option>
              ))}
            </select>
            {errors.epicId && (
              <p className="mt-1 text-sm text-red-300">{errors.epicId}</p>
            )}
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-blue-200 mb-2">
              Estado
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value} className="bg-gray-800">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-blue-200 mb-2">
              Prioridad
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            >
              {priorityOptions.map(option => (
                <option key={option.value} value={option.value} className="bg-gray-800">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="storyPoints" className="block text-sm font-medium text-blue-200 mb-2">
              Story Points
            </label>
            <select
              id="storyPoints"
              name="storyPoints"
              value={formData.storyPoints || ''}
              onChange={handleInputChange}
              className={`w-full bg-white/10 border ${errors.storyPoints ? 'border-red-500/50' : 'border-white/20'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              disabled={isLoading}
            >
              <option value="">Sin estimar</option>
              {storyPointsOptions.map(points => (
                <option key={points} value={points} className="bg-gray-800">
                  {points} puntos
                </option>
              ))}
            </select>
            {errors.storyPoints && (
              <p className="mt-1 text-sm text-red-300">{errors.storyPoints}</p>
            )}
          </div>
        </div>

        {/* Sprint (opcional) */}
        <div>
          <label htmlFor="sprintId" className="block text-sm font-medium text-blue-200 mb-2">
            Sprint (Opcional)
          </label>
          <select
            id="sprintId"
            name="sprintId"
            value={formData.sprintId || ''}
            onChange={handleInputChange}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          >
            <option value="">Sin asignar a sprint</option>
            {sprints
              .filter(sprint => sprint.status === 'PLANNING' || sprint.status === 'ACTIVE')
              .map(sprint => (
                <option key={sprint.id} value={sprint.id} className="bg-gray-800">
                  {sprint.name} ({sprint.status === 'ACTIVE' ? 'Activo' : 'Planificando'})
                </option>
              ))}
          </select>
          <p className="mt-1 text-xs text-blue-300">
            Puedes asignar la historia a un sprint más tarde durante la planificación
          </p>
        </div>

        {/* Descripción */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-blue-200 mb-2">
            Descripción de la Historia *
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
            value={formData.description}
            onChange={handleInputChange}
            className={`w-full bg-white/10 border ${errors.description ? 'border-red-500/50' : 'border-white/20'} rounded-lg px-4 py-3 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-colors`}
            placeholder="Describe detalladamente qué debe hacer esta funcionalidad, por qué es importante y cómo beneficia al usuario..."
            disabled={isLoading}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-300">{errors.description}</p>
          )}
          <div className="mt-1 text-xs text-blue-300 text-right">
            {formData.description?.length || 0} / 2000 caracteres
          </div>
        </div>

        {/* Criterios de aceptación */}
        <div>
          <label htmlFor="acceptanceCriteria" className="block text-sm font-medium text-blue-200 mb-2">
            Criterios de Aceptación
          </label>
          <textarea
            id="acceptanceCriteria"
            name="acceptanceCriteria"
            rows={4}
            value={formData.acceptanceCriteria}
            onChange={handleInputChange}
            className={`w-full bg-white/10 border ${errors.acceptanceCriteria ? 'border-red-500/50' : 'border-white/20'} rounded-lg px-4 py-3 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-colors`}
            placeholder="• Dado que [contexto inicial]&#10;• Cuando [acción del usuario]&#10;• Entonces [resultado esperado]&#10;&#10;• Dado que [otro contexto]&#10;• Cuando [otra acción]&#10;• Entonces [otro resultado]"
            disabled={isLoading}
          />
          {errors.acceptanceCriteria && (
            <p className="mt-1 text-sm text-red-300">{errors.acceptanceCriteria}</p>
          )}
          <div className="mt-1 text-xs text-blue-300 text-right">
            {formData.acceptanceCriteria?.length || 0} / 1500 caracteres
          </div>
          <p className="mt-1 text-xs text-blue-300">
            Define claramente cuándo esta historia estará "terminada". Usa el formato Dado-Cuando-Entonces.
          </p>
        </div>

        {/* Información sobre historias de usuario */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-200">
              <p className="font-medium mb-2">Consejos para una buena historia de usuario:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Debe ser independiente y poder ser desarrollada por sí sola</li>
                <li>Debe aportar valor al usuario final</li>
                <li>Debe ser estimable (poder asignar story points)</li>
                <li>Debe ser pequeña (completable en un sprint)</li>
                <li>Debe ser testeable (criterios de aceptación claros)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Ejemplo de historia */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <div className="text-sm text-green-200">
              <p className="font-medium mb-2">Ejemplo de historia bien definida:</p>
              <div className="text-xs space-y-1">
                <p><strong>Título:</strong> "Como usuario registrado, quiero poder restablecer mi contraseña para recuperar el acceso a mi cuenta"</p>
                <p><strong>Descripción:</strong> "Los usuarios necesitan poder recuperar su cuenta cuando olviden su contraseña..."</p>
                <p><strong>Criterios:</strong></p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>Dado que soy un usuario registrado que olvidó su contraseña</li>
                  <li>Cuando hago clic en 'Olvidé mi contraseña' e ingreso mi email</li>
                  <li>Entonces recibo un email con un enlace para restablecer mi contraseña</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-white/20">
          {(onCancel || onClose) && (
            <button
              type="button"
              onClick={onClose || onCancel}
              disabled={isLoading}
              className="px-6 py-3 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            className="px-8 py-3 bg-gradient-to-r from-[#0EA5E9] to-[#0264C5] hover:from-[#0D94D1] hover:to-[#0252A3] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" color="white" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{mode === 'create' ? 'Crear Historia' : 'Guardar Cambios'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserStoryForm;
