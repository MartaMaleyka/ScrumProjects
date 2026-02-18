import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  userStoryId?: number;
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
  userStoryId,
  mode = 'create' 
}) => {
  const { t } = useTranslation();
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
  const [showTemplates, setShowTemplates] = useState(false);

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

  // Actualizar epicId cuando viene como prop
  useEffect(() => {
    if (epicId && epicId > 0) {
      setFormData(prev => ({ ...prev, epicId }));
    }
  }, [epicId]);

  // Actualizar formData cuando initialData cambia (modo edit)
  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData(prev => ({
        ...prev,
        title: initialData.title || prev.title,
        description: initialData.description || prev.description,
        acceptanceCriteria: initialData.acceptanceCriteria || prev.acceptanceCriteria,
        epicId: initialData.epicId || prev.epicId,
        sprintId: initialData.sprintId !== undefined ? initialData.sprintId : prev.sprintId,
        storyPoints: initialData.storyPoints !== undefined ? initialData.storyPoints : prev.storyPoints,
        status: initialData.status || prev.status,
        priority: initialData.priority || prev.priority,
      }));
    }
  }, [initialData, mode]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = t('stories.form.errors.titleRequired', 'El título de la historia es obligatorio');
    } else if (formData.title.trim().length < 10) {
      newErrors.title = t('stories.form.errors.titleMinLength', 'El título debe tener al menos 10 caracteres');
    }

    if (!formData.description.trim()) {
      newErrors.description = t('stories.form.errors.descriptionRequired', 'La descripción es obligatoria');
    } else if (formData.description.trim().length < 20) {
      newErrors.description = t('stories.form.errors.descriptionMinLength', 'La descripción debe tener al menos 20 caracteres');
    } else if (formData.description.length > 2000) {
      newErrors.description = t('stories.form.errors.descriptionMaxLength', 'La descripción no puede exceder 2000 caracteres');
    }

    if (!formData.epicId) {
      newErrors.epicId = t('stories.form.errors.epicRequired', 'Debes seleccionar una épica');
    }

    if (formData.storyPoints !== undefined && (formData.storyPoints < 1 || formData.storyPoints > 100)) {
      newErrors.storyPoints = t('stories.form.errors.storyPointsRange', 'Los story points deben estar entre 1 y 100');
    }

    if (formData.acceptanceCriteria && formData.acceptanceCriteria.length > 1500) {
      newErrors.acceptanceCriteria = t('stories.form.errors.acceptanceCriteriaMaxLength', 'Los criterios de aceptación no pueden exceder 1500 caracteres');
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
      let response;
      if (mode === 'edit' && userStoryId) {
        response = await scrumService.updateUserStory(userStoryId, formData);
      } else {
        response = await scrumService.createUserStory(formData);
      }
      
      if (response.success && response.data) {
        onSuccess?.(response.data.userStory);
      } else {
        throw new Error(response.message || (mode === 'edit' ? t('stories.form.errors.updateError', 'Error al actualizar la historia de usuario') : t('stories.form.errors.createError', 'Error al crear la historia de usuario')));
      }
    } catch (err: any) {
      setError(err.message || (mode === 'edit' ? t('stories.form.errors.updateError', 'Error al actualizar la historia de usuario') : t('stories.form.errors.createError', 'Error al crear la historia de usuario')));
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions: { value: UserStoryStatus; label: string }[] = [
    { value: 'DRAFT', label: t('stories.status.draft', 'Borrador') },
    { value: 'READY', label: t('stories.status.ready', 'Listo') },
    { value: 'IN_PROGRESS', label: t('stories.status.inProgress', 'En Progreso') },
    { value: 'COMPLETED', label: t('stories.status.completed', 'Completado') },
    { value: 'CANCELLED', label: t('stories.status.cancelled', 'Cancelado') },
  ];

  const priorityOptions: { value: ScrumPriority; label: string }[] = [
    { value: 'LOW', label: t('epics.priority.low', 'Baja') },
    { value: 'MEDIUM', label: t('epics.priority.medium', 'Media') },
    { value: 'HIGH', label: t('epics.priority.high', 'Alta') },
    { value: 'CRITICAL', label: t('epics.priority.critical', 'Crítica') },
  ];

  const storyPointsOptions = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

  const getUserStoryTemplates = () => [
    {
      title: 'Como usuario quiero poder autenticarme de manera segura para acceder a la plataforma',
      description: 'Los usuarios necesitan un sistema de autenticación seguro para acceder a la plataforma. Debe incluir login con email/username y contraseña, validación de credenciales, manejo seguro de sesiones, protección contra accesos no autorizados, mensajes de error claros y opción de recordar sesión (opcional). El sistema debe garantizar que solo usuarios autorizados accedan a sus datos y funcionalidades.',
      acceptanceCriteria: '• Dado que soy un usuario registrado con credenciales válidas\n• Cuando ingreso mi email/username y contraseña correctos\n• Entonces el sistema me autentica y redirige a mi dashboard principal\n\n• Dado que soy un usuario que ingresa credenciales incorrectas\n• Cuando intento iniciar sesión con email/username o contraseña inválidos\n• Entonces el sistema muestra un mensaje de error claro sin revelar qué campo es incorrecto\n\n• Dado que soy un usuario que olvidó su contraseña\n• Cuando hago clic en "Olvidé mi contraseña"\n• Entonces el sistema me permite recuperar o restablecer mi contraseña\n\n• Dado que soy un usuario autenticado\n• Cuando mi sesión expira por inactividad\n• Entonces el sistema me redirige al login con un mensaje informativo\n\n• Dado que soy un usuario que selecciona "Recordar sesión"\n• Cuando cierro el navegador y vuelvo a abrirlo\n• Entonces el sistema mantiene mi sesión activa (hasta que expire el token)'
    },
    {
      title: 'Como usuario quiero poder restablecer mi contraseña para recuperar el acceso a mi cuenta',
      description: 'Los usuarios necesitan poder recuperar su cuenta cuando olviden su contraseña. El sistema debe permitir solicitar un restablecimiento de contraseña mediante email, validar el token de restablecimiento, y permitir crear una nueva contraseña segura.',
      acceptanceCriteria: '• Dado que soy un usuario registrado que olvidó su contraseña\n• Cuando hago clic en "Olvidé mi contraseña" e ingreso mi email\n• Entonces recibo un email con un enlace para restablecer mi contraseña\n\n• Dado que recibí un enlace de restablecimiento válido\n• Cuando hago clic en el enlace\n• Entonces puedo ingresar una nueva contraseña segura\n\n• Dado que intento usar un enlace de restablecimiento expirado\n• Cuando hago clic en el enlace\n• Entonces el sistema me informa que el enlace ha expirado y debo solicitar uno nuevo'
    },
    {
      title: 'Como usuario quiero poder ver mi perfil para gestionar mi información personal',
      description: 'Los usuarios necesitan poder ver y editar su información personal en su perfil. Debe incluir visualización de datos actuales, edición de información personal, cambio de contraseña, y actualización de preferencias.',
      acceptanceCriteria: '• Dado que soy un usuario autenticado\n• Cuando accedo a mi perfil\n• Entonces veo toda mi información personal actual\n\n• Dado que estoy en mi perfil\n• Cuando edito mi información y guardo los cambios\n• Entonces el sistema actualiza mi perfil y muestra un mensaje de confirmación\n\n• Dado que quiero cambiar mi contraseña\n• Cuando ingreso mi contraseña actual y una nueva contraseña válida\n• Entonces el sistema actualiza mi contraseña y me notifica del cambio'
    },
    {
      title: 'Como usuario quiero poder crear un proyecto para organizar mi trabajo',
      description: 'Los usuarios necesitan poder crear nuevos proyectos Scrum para organizar y gestionar su trabajo. Debe incluir formulario de creación con campos esenciales, validación de datos, y asignación de miembros al proyecto.',
      acceptanceCriteria: '• Dado que soy un usuario autenticado\n• Cuando hago clic en "Crear Proyecto" y completo el formulario\n• Entonces el sistema crea el proyecto y me redirige a su vista de detalle\n\n• Dado que intento crear un proyecto sin nombre\n• Cuando intento guardar el formulario\n• Entonces el sistema muestra un error indicando que el nombre es obligatorio\n\n• Dado que creo un proyecto exitosamente\n• Cuando accedo al proyecto\n• Entonces puedo ver todas sus épicas, sprints e historias asociadas'
    },
    {
      title: 'Como usuario quiero poder crear épicas para organizar funcionalidades grandes',
      description: 'Los usuarios necesitan poder crear épicas dentro de un proyecto para organizar funcionalidades grandes que se dividirán en múltiples historias de usuario. Debe incluir formulario de creación, asignación a proyecto, y definición de prioridad y estado.',
      acceptanceCriteria: '• Dado que estoy en un proyecto\n• Cuando hago clic en "Crear Épica" y completo el formulario\n• Entonces el sistema crea la épica y la muestra en la lista del proyecto\n\n• Dado que creo una épica\n• Cuando la visualizo\n• Entonces puedo ver su título, descripción, estado, prioridad y valor de negocio\n\n• Dado que tengo una épica creada\n• Cuando creo historias de usuario\n• Entonces puedo asignarlas a esta épica'
    },
    {
      title: 'Como usuario quiero poder crear historias de usuario para definir funcionalidades',
      description: 'Los usuarios necesitan poder crear historias de usuario dentro de una épica para definir funcionalidades específicas. Debe incluir formulario con título, descripción, criterios de aceptación, asignación a épica, y estimación de story points.',
      acceptanceCriteria: '• Dado que estoy en una épica\n• Cuando hago clic en "Crear Historia" y completo el formulario\n• Entonces el sistema crea la historia y la asocia a la épica\n\n• Dado que creo una historia de usuario\n• Cuando la visualizo\n• Entonces puedo ver su título, descripción, criterios de aceptación y story points\n\n• Dado que tengo una historia creada\n• Cuando la asigno a un sprint\n• Entonces aparece en el backlog del sprint correspondiente'
    },
    {
      title: 'Como usuario quiero poder crear sprints para planificar iteraciones de trabajo',
      description: 'Los usuarios necesitan poder crear sprints dentro de un proyecto para planificar iteraciones de trabajo. Debe incluir definición de fechas de inicio y fin, capacidad del sprint, y asignación de historias de usuario.',
      acceptanceCriteria: '• Dado que estoy en un proyecto\n• Cuando hago clic en "Crear Sprint" y defino las fechas\n• Entonces el sistema crea el sprint con estado "Planificando"\n\n• Dado que tengo un sprint creado\n• Cuando asigno historias de usuario al sprint\n• Entonces puedo ver la capacidad utilizada y la capacidad total\n\n• Dado que inicio un sprint\n• Cuando cambio su estado a "Activo"\n• Entonces el sprint aparece como activo y puedo hacer seguimiento del progreso'
    },
    {
      title: 'Como usuario quiero poder ver el dashboard del proyecto para conocer el progreso',
      description: 'Los usuarios necesitan poder ver un dashboard que muestre el progreso general del proyecto, incluyendo métricas clave, estado de épicas, sprints activos, y resumen de historias completadas.',
      acceptanceCriteria: '• Dado que estoy en un proyecto\n• Cuando accedo al dashboard\n• Entonces veo métricas de progreso, épicas, sprints e historias\n\n• Dado que hay épicas completadas\n• Cuando visualizo el dashboard\n• Entonces puedo ver el porcentaje de completitud del proyecto\n\n• Dado que hay sprints activos\n• Cuando veo el dashboard\n• Entonces puedo ver el progreso de cada sprint activo'
    }
  ];

  const applyTemplate = (template: { title: string; description: string; acceptanceCriteria: string }) => {
    setFormData(prev => ({
      ...prev,
      title: template.title,
      description: template.description,
      acceptanceCriteria: template.acceptanceCriteria
    }));
    setShowTemplates(false); // Ocultar plantillas después de seleccionar una
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" text={t('stories.form.loadingData', 'Cargando datos...')} />
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'create' ? t('stories.form.new', 'Nueva') : t('common.edit', 'Editar')} <span className="text-indigo-600">{t('stories.title', 'Historia de Usuario')}</span>
            </h2>
            <p className="text-gray-600 mt-1">
              {mode === 'create' 
                ? t('stories.form.createSubtitle', 'Crea una nueva historia de usuario para el backlog')
                : t('stories.form.editSubtitle', 'Modifica la información de la historia de usuario')
              }
            </p>
          </div>
          {mode === 'create' && (
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border-2 border-purple-200 hover:border-purple-300 text-purple-700 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{showTemplates ? t('epics.form.hide', 'Ocultar') : t('epics.form.templates', 'Plantillas')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Error general */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Plantillas Rápidas */}
        {mode === 'create' && showTemplates && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl shadow-sm border border-purple-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">{t('stories.form.templatesTitle', 'Plantillas de Historias de Usuario')}</h3>
            </div>
            <p className="text-sm text-gray-700 mb-4">{t('stories.form.templatesDesc', 'Comienza con una plantilla predefinida y adáptala a tus necesidades')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {getUserStoryTemplates().map((template, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className="text-left p-4 bg-white border-2 border-purple-200 hover:border-purple-400 rounded-xl transition-all hover:shadow-md group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors text-sm line-clamp-2">
                        {template.title}
                      </h4>
                      <p className="text-xs text-gray-600 line-clamp-2">{template.description}</p>
                    </div>
                    <svg className="w-5 h-5 text-purple-500 group-hover:text-purple-700 transition-colors flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Título de la historia */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            {t('stories.form.titleLabel', 'Título de la Historia de Usuario')} *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className={`w-full bg-white border ${errors.title ? 'border-red-300' : 'border-gray-300'} rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors`}
            placeholder="Como [usuario], quiero [funcionalidad] para [beneficio]"
            disabled={isLoading}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title}</p>
          )}
          <p className="mt-1 text-xs text-gray-600">
            {t('stories.form.titleHint', 'Sigue el formato: "Como [tipo de usuario], quiero [funcionalidad] para [beneficio]"')}
          </p>
        </div>

        {/* Épica, Estado, Prioridad y Story Points */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label htmlFor="epicId" className="block text-sm font-medium text-gray-700 mb-2">
              {t('epics.title', 'Épica')} *
            </label>
            <select
              id="epicId"
              name="epicId"
              value={formData.epicId || ''}
              onChange={handleInputChange}
              className={`w-full bg-white border ${errors.epicId ? 'border-red-300' : 'border-gray-300'} rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${epicId ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              disabled={isLoading || (epicId !== undefined && epicId > 0)}
            >
              <option value="">{t('stories.form.selectEpic', 'Seleccionar épica')}</option>
              {epics.map(epic => (
                <option key={epic.id} value={epic.id}>
                  {epic.title}
                </option>
              ))}
            </select>
            {errors.epicId && (
              <p className="mt-1 text-sm text-red-600">{errors.epicId}</p>
            )}
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              {t('stories.form.statusLabel', 'Estado')}
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={isLoading}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
              {t('epics.priority', 'Prioridad')}
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={isLoading}
            >
              {priorityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="storyPoints" className="block text-sm font-medium text-gray-700 mb-2">
              {t('stories.storyPoints', 'Story Points')}
            </label>
            <select
              id="storyPoints"
              name="storyPoints"
              value={formData.storyPoints || ''}
              onChange={handleInputChange}
              className={`w-full bg-white border ${errors.storyPoints ? 'border-red-300' : 'border-gray-300'} rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
              disabled={isLoading}
            >
              <option value="">{t('stories.form.notEstimated', 'Sin estimar')}</option>
              {storyPointsOptions.map(points => (
                <option key={points} value={points}>
                  {points} {t('stories.points', 'puntos')}
                </option>
              ))}
            </select>
            {errors.storyPoints && (
              <p className="mt-1 text-sm text-red-600">{errors.storyPoints}</p>
            )}
          </div>
        </div>

        {/* Sprint (opcional) */}
        <div>
          <label htmlFor="sprintId" className="block text-sm font-medium text-gray-700 mb-2">
            {t('sprints.title', 'Sprint')} ({t('epics.form.optional', 'Opcional')})
          </label>
          <select
            id="sprintId"
            name="sprintId"
            value={formData.sprintId || ''}
            onChange={handleInputChange}
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={isLoading}
          >
            <option value="">{t('stories.form.unassignedSprint', 'Sin asignar a sprint')}</option>
            {sprints
              .filter(sprint => sprint.status === 'PLANNING' || sprint.status === 'ACTIVE')
              .map(sprint => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name} ({sprint.status === 'ACTIVE' ? t('sprints.status.active', 'Activo') : t('sprints.status.planning', 'Planificando')})
                </option>
              ))}
          </select>
          <p className="mt-1 text-xs text-gray-600">
            {t('stories.form.sprintHint', 'Puedes asignar la historia a un sprint más tarde durante la planificación')}
          </p>
        </div>

        {/* Descripción */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            {t('stories.form.descriptionLabel', 'Descripción de la Historia')} *
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
            value={formData.description}
            onChange={handleInputChange}
            className={`w-full bg-white border ${errors.description ? 'border-red-300' : 'border-gray-300'} rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-colors`}
            placeholder={t('stories.form.descriptionPlaceholder', 'Describe detalladamente qué debe hacer esta funcionalidad, por qué es importante y cómo beneficia al usuario...')}
            disabled={isLoading}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
          <div className="mt-1 text-xs text-gray-600 text-right">
            {formData.description?.length || 0} / 2000 {t('stories.form.characters', 'caracteres')}
          </div>
        </div>

        {/* Criterios de aceptación */}
        <div>
          <label htmlFor="acceptanceCriteria" className="block text-sm font-medium text-gray-700 mb-2">
            {t('stories.acceptanceCriteria', 'Criterios de Aceptación')}
          </label>
          <textarea
            id="acceptanceCriteria"
            name="acceptanceCriteria"
            rows={4}
            value={formData.acceptanceCriteria}
            onChange={handleInputChange}
            className={`w-full bg-white border ${errors.acceptanceCriteria ? 'border-red-300' : 'border-gray-300'} rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-colors`}
            placeholder={t('stories.form.acceptanceCriteriaPlaceholder', '• Dado que [contexto inicial]\n• Cuando [acción del usuario]\n• Entonces [resultado esperado]\n\n• Dado que [otro contexto]\n• Cuando [otra acción]\n• Entonces [otro resultado]')}
            disabled={isLoading}
          />
          {errors.acceptanceCriteria && (
            <p className="mt-1 text-sm text-red-600">{errors.acceptanceCriteria}</p>
          )}
          <div className="mt-1 text-xs text-gray-600 text-right">
            {formData.acceptanceCriteria?.length || 0} / 1500 {t('stories.form.characters', 'caracteres')}
          </div>
          <p className="mt-1 text-xs text-gray-600">
            {t('stories.form.acceptanceCriteriaHint', 'Define claramente cuándo esta historia estará "terminada". Usa el formato Dado-Cuando-Entonces.')}
          </p>
        </div>

        {/* Información sobre historias de usuario */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-2 text-gray-900">{t('stories.form.tipsTitle', 'Consejos para una buena historia de usuario')}:</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                <li>{t('stories.form.tip1', 'Debe ser independiente y poder ser desarrollada por sí sola')}</li>
                <li>{t('stories.form.tip2', 'Debe aportar valor al usuario final')}</li>
                <li>{t('stories.form.tip3', 'Debe ser estimable (poder asignar story points)')}</li>
                <li>{t('stories.form.tip4', 'Debe ser pequeña (completable en un sprint)')}</li>
                <li>{t('stories.form.tip5', 'Debe ser testeable (criterios de aceptación claros)')}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Ejemplo de historia */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-2 text-gray-900">{t('stories.form.exampleTitle', 'Ejemplo de historia bien definida')}:</p>
              <div className="text-xs space-y-1 text-gray-600">
                <p><strong>{t('stories.form.titleLabel', 'Título de la Historia de Usuario')}:</strong> "{t('stories.form.exampleTitleText', 'Como usuario registrado, quiero poder restablecer mi contraseña para recuperar el acceso a mi cuenta')}"</p>
                <p><strong>{t('stories.form.descriptionLabel', 'Descripción de la Historia')}:</strong> "{t('stories.form.exampleDescription', 'Los usuarios necesitan poder recuperar su cuenta cuando olviden su contraseña...')}"</p>
                <p><strong>{t('stories.acceptanceCriteria', 'Criterios de Aceptación')}:</strong></p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>{t('stories.form.exampleCriteria1', 'Dado que soy un usuario registrado que olvidó su contraseña')}</li>
                  <li>{t('stories.form.exampleCriteria2', 'Cuando hago clic en \'Olvidé mi contraseña\' e ingreso mi email')}</li>
                  <li>{t('stories.form.exampleCriteria3', 'Entonces recibo un email con un enlace para restablecer mi contraseña')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
          {(onCancel || onClose) && (
            <button
              type="button"
              onClick={onClose || onCancel}
              disabled={isLoading}
              className="px-6 py-3 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.cancel', 'Cancelar')}
            </button>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2 shadow-lg"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" color="white" />
                <span>{t('common.processing', 'Procesando...')}</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{mode === 'create' ? t('stories.form.createButton', 'Crear Historia') : t('common.saveChanges', 'Guardar Cambios')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserStoryForm;
