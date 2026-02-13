import React, { useState, useEffect } from 'react';
import AppSidebarLayout from '../../layout/AppSidebarLayout';
import { API_BASE_URL, authenticatedRequest } from '../../../config/api';

interface TaskFormData {
  title: string;
  description: string;
  userStoryId: number;
  sprintId?: number | null;
  type: 'DEVELOPMENT' | 'TESTING' | 'DESIGN' | 'DOCUMENTATION' | 'BUG_FIX' | 'RESEARCH' | 'REFACTORING';
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedHours?: number | null;
  assigneeId?: number | null;
}

interface TaskFormImprovedProps {
  initialData?: Partial<TaskFormData>;
  taskId?: string;
  mode?: 'create' | 'edit';
  userStoryId?: number;
  sprintId?: number;
  projectId?: number;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface UserStory {
  id: number;
  title: string;
  epicId?: number;
  sprintId?: number | null;
  epic?: {
    projectId?: number;
  };
  sprint?: {
    id: number;
    name: string;
    status: string;
  } | null;
}

interface Sprint {
  id: number;
  name: string;
  status: string;
}

const TaskFormImproved: React.FC<TaskFormImprovedProps> = ({ 
  initialData, 
  taskId,
  mode = 'create',
  userStoryId: propUserStoryId,
  sprintId: propSprintId,
  projectId: propProjectId
}) => {
  const [formData, setFormData] = useState<TaskFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    userStoryId: initialData?.userStoryId || propUserStoryId || 0,
    sprintId: null, // ✅ Las tareas no tienen sprintId directo
    type: initialData?.type || 'DEVELOPMENT',
    status: initialData?.status || 'TODO',
    priority: initialData?.priority || 'MEDIUM',
    estimatedHours: initialData?.estimatedHours || null,
    assigneeId: initialData?.assigneeId || null,
  });

  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(mode === 'edit' || !!propUserStoryId || !!propProjectId);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<number>(0);
  const [contextInfo, setContextInfo] = useState<{
    userStoryTitle?: string;
    projectName?: string;
    sprintName?: string;
  }>({});
  const [showHelp, setShowHelp] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingData(true);
      try {
        // Si estamos en modo edición, cargar la tarea
        if (mode === 'edit' && taskId) {
          const response = await authenticatedRequest(`${API_BASE_URL}/scrum/tasks/${taskId}`);
          const task = response.task || response.data?.task || response;
          
          if (task) {
            setFormData({
              title: task.title || '',
              description: task.description || '',
              userStoryId: task.userStoryId || 0,
              sprintId: null, // ✅ No usamos sprintId directo en tareas
              type: task.type || 'DEVELOPMENT',
              status: task.status || 'TODO',
              priority: task.priority || 'MEDIUM',
              estimatedHours: task.estimatedHours || null,
              assigneeId: task.assigneeId || null,
            });

            // Agregar la historia de usuario actual a la lista
            if (task.userStory) {
              setUserStories([task.userStory]);
              setContextInfo(prev => ({
                ...prev,
                userStoryTitle: task.userStory.title
              }));
            }

            // Cargar contexto del proyecto
            if (task.userStory?.epic?.projectId) {
              await loadProjectData(task.userStory.epic.projectId);
            }
          }
        } else {
          // Modo creación - cargar contexto según los parámetros
          if (propUserStoryId) {
            await loadUserStoryContext(propUserStoryId);
          } else if (propProjectId) {
            await loadProjectData(propProjectId);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar los datos');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadInitialData();
  }, [mode, taskId, propUserStoryId, propProjectId]);

  const loadUserStoryContext = async (userStoryId: number) => {
    try {
      const response = await authenticatedRequest(`${API_BASE_URL}/scrum/user-stories/${userStoryId}`);
      
      const userStory = response.userStory || response.data?.userStory || response;
      
      if (userStory) {
        // Agregar la historia actual a la lista para que aparezca en el select
        setUserStories([userStory]);
        
        // Asegurarnos de que el formData tiene el userStoryId correcto
        setFormData(prev => ({
          ...prev,
          userStoryId: userStory.id
        }));
        
        setContextInfo(prev => ({
          ...prev,
          userStoryTitle: userStory.title
        }));

        // Cargar el proyecto desde la épica
        const projectId = userStory.epic?.project?.id || userStory.epic?.projectId;
        
        if (projectId) {
          await loadProjectData(projectId);
        } else {
        }
      }
    } catch (err) {
    }
  };

  const loadProjectData = async (projectId: number) => {
    try {
      // Cargar información del proyecto
      const projectResponse = await authenticatedRequest(`${API_BASE_URL}/scrum/projects/${projectId}`);
      
      const project = projectResponse.project || projectResponse.data?.project || projectResponse;
      
      if (project) {
        setContextInfo(prev => ({
          ...prev,
          projectName: project.name
        }));
        
        setCurrentProjectId(projectId);

        // Cargar miembros del equipo
        if (project.members && Array.isArray(project.members)) {
          const members = project.members
            .filter((pm: any) => pm.user) // Filtrar solo los que tienen user
            .map((pm: any) => pm.user);
          setTeamMembers(members);
        } else {
          setTeamMembers([]);
        }
      }

      // Cargar sprints del proyecto
      const sprintsResponse = await authenticatedRequest(`${API_BASE_URL}/scrum/projects/${projectId}/sprints`);
      const sprintsData = sprintsResponse.sprints || sprintsResponse.data?.sprints || [];
      setSprints(sprintsData);

      // Cargar épicas y sus historias de usuario
      const epicsResponse = await authenticatedRequest(`${API_BASE_URL}/scrum/projects/${projectId}/epics`);
      const epics = epicsResponse.epics || epicsResponse.data?.epics || [];
      
      const allStories: UserStory[] = [];
      for (const epic of epics) {
        const storiesResponse = await authenticatedRequest(`${API_BASE_URL}/scrum/epics/${epic.id}/user-stories`);
        const stories = storiesResponse.userStories || storiesResponse.data?.userStories || [];
        allStories.push(...stories);
      }
      
      // Actualizar las historias disponibles
      // Si ya había historias cargadas (por ejemplo, la actual en modo edición), mantenerlas
      setUserStories(prevStories => {
        // Si no hay historias previas, usar las nuevas
        if (prevStories.length === 0) {
          return allStories;
        }
        
        // Combinar historias previas con las nuevas, evitando duplicados
        const combinedMap = new Map();
        
        // Primero agregar las historias previas (como la actual en edición)
        prevStories.forEach(story => {
          combinedMap.set(story.id, story);
        });
        
        // Luego agregar/actualizar con las nuevas historias
        allStories.forEach(story => {
          combinedMap.set(story.id, story);
        });
        
        return Array.from(combinedMap.values());
      });
    } catch (err) {
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    let processedValue: any = value;
    if (type === 'number') {
      processedValue = value === '' ? null : parseFloat(value);
    } else if (name === 'userStoryId' || name === 'sprintId' || name === 'assigneeId') {
      processedValue = value === '' ? null : parseInt(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
    
    // Limpiar error cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Función para recargar miembros después de agregar uno nuevo
  const reloadMembers = async () => {
    if (!currentProjectId) return;
    
    try {
      const projectResponse = await authenticatedRequest(`${API_BASE_URL}/scrum/projects/${currentProjectId}`);
      const project = projectResponse.project || projectResponse.data?.project || projectResponse;
      
      if (project && project.members && Array.isArray(project.members)) {
        const members = project.members
          .filter((pm: any) => pm.user)
          .map((pm: any) => pm.user);
        setTeamMembers(members);
      }
    } catch (err) {
    }
  };

  const handleMemberAdded = () => {
    setIsMemberModalOpen(false);
    reloadMembers();
  };

  // Calcular progreso del formulario
  const calculateProgress = () => {
    let completed = 0;
    const total = 6; // Total de campos importantes
    
    if (formData.title.trim()) completed++;
    if (formData.description.trim()) completed++;
    if (formData.userStoryId > 0) completed++;
    if (formData.type) completed++;
    if (formData.status) completed++;
    if (formData.priority) completed++;
    
    return Math.round((completed / total) * 100);
  };

  const getFieldHelp = (field: string): string => {
    const helpTexts: Record<string, string> = {
      title: 'Define una tarea específica y accionable. Ejemplo: "Crear endpoint de autenticación" o "Diseñar pantalla de login"',
      description: 'Detalla los requisitos técnicos, criterios de aceptación y cualquier consideración especial para completar esta tarea.',
      userStory: 'Selecciona la historia de usuario a la que pertenece esta tarea. Las tareas desglosan user stories en trabajo técnico específico.',
      type: 'DEVELOPMENT: Programación. TESTING: Pruebas. DESIGN: Diseño UI/UX. DOCUMENTATION: Documentación técnica.',
      status: 'TODO: Pendiente. IN_PROGRESS: En desarrollo. IN_REVIEW: En revisión de código. DONE: Completada.',
      priority: 'Define según urgencia y bloqueos. CRITICAL: Bloquea otras tareas o es error en producción.',
      estimatedHours: 'Estimación en horas de trabajo necesarias. Usa 0.5 para media hora, considera reuniones y revisiones.',
      assignee: 'Asigna a un miembro del equipo. Puede dejarse sin asignar para tomar en daily standup.'
    };
    return helpTexts[field] || '';
  };

  const getTaskTemplates = () => [
    { 
      title: 'Crear endpoint API REST',
      description: 'Desarrollar endpoint RESTful con validación de entrada, manejo de errores, autenticación JWT y documentación Swagger. Incluir tests unitarios.',
      type: 'DEVELOPMENT' as const,
      estimatedHours: 4
    },
    {
      title: 'Diseñar interfaz de usuario',
      description: 'Crear mockups en Figma, definir paleta de colores, tipografía y componentes reutilizables siguiendo guía de diseño institucional.',
      type: 'DESIGN' as const,
      estimatedHours: 6
    },
    {
      title: 'Escribir tests automatizados',
      description: 'Implementar suite completa de tests: unitarios, integración y E2E. Cobertura mínima 80%. Incluir casos edge y validaciones.',
      type: 'TESTING' as const,
      estimatedHours: 5
    },
    {
      title: 'Corregir bug crítico en producción',
      description: 'Investigar causa raíz del error, implementar fix, crear test de regresión y documentar solución en wiki técnico.',
      type: 'BUG_FIX' as const,
      priority: 'CRITICAL' as const,
      estimatedHours: 3
    }
  ];

  const applyTemplate = (template: { title: string; description: string; type: 'DEVELOPMENT' | 'TESTING' | 'DESIGN' | 'DOCUMENTATION' | 'BUG_FIX' | 'RESEARCH' | 'REFACTORING'; estimatedHours?: number; priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }) => {
    setFormData(prev => ({
      ...prev,
      title: template.title,
      description: template.description,
      type: template.type,
      estimatedHours: template.estimatedHours || prev.estimatedHours,
      priority: template.priority || prev.priority
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'El título es requerido';
    } else if (formData.title.length > 200) {
      newErrors.title = 'El título no puede exceder 200 caracteres';
    }

    if (formData.description.length > 1000) {
      newErrors.description = 'La descripción no puede exceder 1000 caracteres';
    }

    if (!formData.userStoryId || formData.userStoryId === 0) {
      newErrors.userStoryId = 'Debes seleccionar una historia de usuario';
    }

    if (formData.estimatedHours && formData.estimatedHours < 0) {
      newErrors.estimatedHours = 'Las horas estimadas no pueden ser negativas';
    }

    if (formData.estimatedHours && formData.estimatedHours > 200) {
      newErrors.estimatedHours = 'Las horas estimadas no pueden exceder 200';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError('Por favor corrige los errores en el formulario');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // ✅ Las tareas se asignan solo al userStoryId
      // ✅ El sprintId se deja como null (se obtiene navegando task.userStory.sprint)
      const submitData = {
        title: formData.title,
        description: formData.description,
        userStoryId: formData.userStoryId, // ✅ Solo asignar a historia de usuario
        // sprintId: null, // ✅ No enviamos sprintId directamente
        type: formData.type,
        status: formData.status,
        priority: formData.priority,
        estimatedHours: formData.estimatedHours || undefined,
        assigneeId: formData.assigneeId || undefined,
      };

      let response;
      if (mode === 'edit' && taskId) {
        response = await authenticatedRequest(
          `${API_BASE_URL}/scrum/tasks/${taskId}`,
          {
            method: 'PUT',
            body: JSON.stringify(submitData),
          }
        );
      } else {
        response = await authenticatedRequest(
          `${API_BASE_URL}/scrum/tasks`,
          {
            method: 'POST',
            body: JSON.stringify(submitData),
          }
        );
      }
      
      const task = response.task || response.data?.task;
      if (task) {
        setSuccess(true);
        // Disparar evento para actualizar el tablero Kanban
        window.dispatchEvent(new CustomEvent('task:created', { detail: { task } }));
        if (mode === 'edit') {
          window.dispatchEvent(new CustomEvent('task:updated', { detail: { task } }));
        }
        setTimeout(() => {
          window.location.href = `/tasks/detalle?id=${task.id}`;
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar la tarea');
    } finally {
      setIsLoading(false);
    }
  };

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'DEVELOPMENT':
        return '💻';
      case 'TESTING':
        return '🧪';
      case 'DESIGN':
        return '🎨';
      case 'DOCUMENTATION':
        return '📝';
      case 'BUG_FIX':
        return '🐛';
      case 'RESEARCH':
        return '🔍';
      case 'REFACTORING':
        return '♻️';
      default:
        return '📋';
    }
  };

  return (
    <AppSidebarLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center space-x-2">
                  <span>{mode === 'edit' ? 'Editar Tarea' : 'Nueva Tarea'}</span>
                  {mode === 'create' && (
                    <span className="text-2xl">✏️</span>
                  )}
                </h1>
                <p className="text-gray-600 mt-2">
                  {contextInfo.userStoryTitle && (
                    <span className="block">Historia: <span className="font-semibold">{contextInfo.userStoryTitle}</span></span>
                  )}
                  {contextInfo.projectName && (
                    <span className="block">Proyecto: <span className="font-semibold">{contextInfo.projectName}</span></span>
                  )}
                </p>
                
                {/* Barra de progreso */}
                {mode === 'create' && !success && (
                  <div className="mt-4 max-w-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-700">
                        Progreso del formulario
                      </span>
                      <span className="text-xs font-bold text-indigo-600">
                        {calculateProgress()}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${calculateProgress()}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowHelp(!showHelp)}
                  className="bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 text-purple-700 px-4 py-2 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 hover:scale-105 active:scale-95"
                  title="Ver ayuda"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="hidden sm:inline">Ayuda</span>
                </button>
                <button
                  onClick={() => window.history.back()}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors font-medium"
                >
                  ← Volver
                </button>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoadingData && (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando datos...</p>
            </div>
          )}

          {/* Panel de Ayuda */}
          {!isLoadingData && showHelp && mode === 'create' && (
            <div className="bg-white rounded-2xl shadow-lg border-2 border-purple-200 p-6 mb-6 animate-fadeIn">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Guía Rápida - Tareas</h3>
                    <p className="text-sm text-gray-600">Consejos para crear tareas efectivas</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHelp(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <p><strong>Específica y accionable:</strong> La tarea debe ser lo suficientemente detallada para que cualquier miembro del equipo pueda trabajar en ella</p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <p><strong>Estimación realista:</strong> Considera complejidad técnica, investigación necesaria, revisiones de código y tiempo de testing</p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <p><strong>Vinculada a User Story:</strong> Cada tarea debe contribuir directamente a completar una historia de usuario</p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-1">💡</span>
                  <p><strong>Siguiente paso:</strong> Después de crear la tarea, actualiza su estado regularmente en el tablero Kanban</p>
                </div>
              </div>
            </div>
          )}

          {/* Plantillas Rápidas */}
          {!isLoadingData && mode === 'create' && !formData.title && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl shadow-sm border border-indigo-200 p-6 mb-6">
              <div className="flex items-center space-x-2 mb-4">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className="text-lg font-bold text-gray-900">Plantillas de Tareas</h3>
              </div>
              <p className="text-sm text-gray-700 mb-4">Comienza con una plantilla según el tipo de trabajo técnico</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {getTaskTemplates().map((template, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className="text-left p-4 bg-white border-2 border-indigo-200 hover:border-indigo-400 rounded-xl transition-all hover:shadow-md group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-lg">{getTaskTypeIcon(template.type)}</span>
                          <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors text-sm">
                            {template.title}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{template.description}</p>
                        <p className="text-xs text-indigo-600 mt-1">⏱️ {template.estimatedHours}h estimadas</p>
                      </div>
                      <svg className="w-5 h-5 text-indigo-500 group-hover:text-indigo-700 transition-colors flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form */}
          {!isLoadingData && (
            <div className="bg-white rounded-xl shadow-lg p-8">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start">
                  <svg className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-start">
                  <svg className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>¡Tarea guardada exitosamente! Redirigiendo...</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Título */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="title" className="flex items-center text-sm font-semibold text-gray-700">
                      <svg className="w-5 h-5 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      Título de la Tarea <span className="text-red-500 ml-1">*</span>
                    </label>
                    <span className={`text-xs ${formData.title.length > 160 ? 'text-orange-600 font-bold' : 'text-gray-500'}`}>
                      {formData.title.length}/200
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      onFocus={() => setFocusedField('title')}
                      onBlur={() => setFocusedField(null)}
                      maxLength={200}
                      className={`w-full px-4 py-3 border-2 ${errors.title ? 'border-red-300' : formData.title ? 'border-green-300 bg-green-50/30' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all`}
                      placeholder="Ej: Implementar autenticación de usuarios"
                      disabled={isLoading}
                    />
                    {formData.title && !errors.title && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{errors.title}</span>
                    </p>
                  )}
                  {focusedField === 'title' && !errors.title && (
                    <p className="mt-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
                      💡 {getFieldHelp('title')}
                    </p>
                  )}
                </div>

                {/* Descripción */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="description" className="flex items-center text-sm font-semibold text-gray-700">
                      <svg className="w-5 h-5 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Descripción
                    </label>
                    <span className={`text-xs ${formData.description.length > 800 ? 'text-orange-600 font-bold' : 'text-gray-500'}`}>
                      {formData.description.length}/1000
                    </span>
                  </div>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    onFocus={() => setFocusedField('description')}
                    onBlur={() => setFocusedField(null)}
                    maxLength={1000}
                    rows={4}
                    className={`w-full px-4 py-3 border-2 ${formData.description ? 'border-green-300 bg-green-50/30' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all`}
                    placeholder="Describe los detalles de la tarea, requisitos técnicos, criterios de aceptación..."
                    disabled={isLoading}
                  />
                  {focusedField === 'description' && (
                    <p className="mt-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
                      💡 {getFieldHelp('description')}
                    </p>
                  )}
                </div>

                {/* Historia de Usuario y Sprint (Informativo) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="userStoryId" className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                      <svg className="w-5 h-5 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Historia de Usuario <span className="text-red-500 ml-1">*</span>
                      {propUserStoryId && mode === 'create' && (
                        <span className="ml-2 text-xs text-green-600 font-normal">
                          (Pre-seleccionada)
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <select
                        id="userStoryId"
                        name="userStoryId"
                        value={formData.userStoryId || ''}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField('userStory')}
                        onBlur={() => setFocusedField(null)}
                        className={`w-full px-4 py-3 border-2 ${errors.userStoryId ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none ${propUserStoryId && mode === 'create' ? 'bg-green-50 border-green-300' : ''}`}
                        disabled={isLoading || (!!propUserStoryId && mode === 'create')}
                      >
                        <option value="">Seleccionar historia</option>
                        {userStories.map(story => (
                          <option key={story.id} value={story.id}>
                            📖 {story.title}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    {errors.userStoryId && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {errors.userStoryId}
                      </p>
                    )}
                    {focusedField === 'userStory' ? (
                      <p className="mt-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
                        💡 {getFieldHelp('userStory')}
                      </p>
                    ) : propUserStoryId && mode === 'create' && !errors.userStoryId ? (
                      <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Tarea vinculada a esta historia de usuario
                      </p>
                    ) : userStories.length > 0 ? (
                      <p className="mt-1 text-xs text-gray-600">
                        📋 {userStories.length} historia{userStories.length > 1 ? 's' : ''} disponible{userStories.length > 1 ? 's' : ''}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Sprint (Informativo)
                      <span className="ml-2 text-xs text-gray-500 font-normal">
                        📋 Se obtiene de la Historia de Usuario
                      </span>
                    </label>
                    <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600">
                      {(() => {
                        const selectedStory = userStories.find(s => s.id === formData.userStoryId);
                        if (!selectedStory) {
                          return <span className="text-gray-400">Selecciona una historia primero</span>;
                        }
                        
                        // Intentar obtener el sprint desde la historia de usuario
                        if (selectedStory.sprint) {
                          return (
                            <span className="flex items-center gap-2">
                              🎯 <span className="font-medium text-gray-700">{selectedStory.sprint.name}</span>
                              <span className="text-xs text-gray-500">({selectedStory.sprint.status})</span>
                            </span>
                          );
                        } else if (selectedStory.sprintId) {
                          // Si tiene sprintId pero no el objeto sprint, buscar en la lista
                          const storySprint = sprints.find(s => s.id === selectedStory.sprintId);
                          if (storySprint) {
                            return (
                              <span className="flex items-center gap-2">
                                🎯 <span className="font-medium text-gray-700">{storySprint.name}</span>
                              </span>
                            );
                          }
                        }
                        
                        return <span className="text-gray-400">⚪ La historia aún no está en un sprint</span>;
                      })()}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      💡 El sprint se asigna a nivel de Historia de Usuario, no directamente a la tarea
                    </p>
                  </div>
                </div>

                {/* Tipo y Prioridad */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="type" className="block text-sm font-semibold text-gray-700 mb-2">
                      Tipo de Tarea
                    </label>
                    <select
                      id="type"
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                      disabled={isLoading}
                    >
                      <option value="DEVELOPMENT">{getTaskTypeIcon('DEVELOPMENT')} Desarrollo</option>
                      <option value="TESTING">{getTaskTypeIcon('TESTING')} Testing</option>
                      <option value="DESIGN">{getTaskTypeIcon('DESIGN')} Diseño</option>
                      <option value="DOCUMENTATION">{getTaskTypeIcon('DOCUMENTATION')} Documentación</option>
                      <option value="BUG_FIX">{getTaskTypeIcon('BUG_FIX')} Corrección de Errores</option>
                      <option value="RESEARCH">{getTaskTypeIcon('RESEARCH')} Investigación</option>
                      <option value="REFACTORING">{getTaskTypeIcon('REFACTORING')} Refactorización</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="priority" className="block text-sm font-semibold text-gray-700 mb-2">
                      Prioridad
                    </label>
                    <select
                      id="priority"
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                      disabled={isLoading}
                    >
                      <option value="LOW">🟢 Baja</option>
                      <option value="MEDIUM">🟡 Media</option>
                      <option value="HIGH">🟠 Alta</option>
                      <option value="CRITICAL">🔴 Crítica</option>
                    </select>
                  </div>
                </div>

                {/* Estado */}
                {mode === 'edit' && (
                  <div>
                    <label htmlFor="status" className="block text-sm font-semibold text-gray-700 mb-2">
                      Estado
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                      disabled={isLoading}
                    >
                      <option value="TODO">📋 Por Hacer</option>
                      <option value="IN_PROGRESS">🚧 En Progreso</option>
                      <option value="IN_REVIEW">👀 En Revisión</option>
                      <option value="DONE">✅ Completado</option>
                      <option value="CANCELLED">❌ Cancelado</option>
                    </select>
                  </div>
                )}

                {/* Horas y Asignación */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="estimatedHours" className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                      <svg className="w-5 h-5 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Horas Estimadas <span className="text-gray-400 text-xs font-normal ml-1">(opcional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        id="estimatedHours"
                        name="estimatedHours"
                        value={formData.estimatedHours || ''}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField('estimatedHours')}
                        onBlur={() => setFocusedField(null)}
                        min="0"
                        max="200"
                        step="0.5"
                        className={`w-full px-4 py-3 border-2 ${errors.estimatedHours ? 'border-red-300' : formData.estimatedHours ? 'border-green-300 bg-green-50/30' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all`}
                        placeholder="Ej: 4.5"
                        disabled={isLoading}
                      />
                    </div>
                    {errors.estimatedHours && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {errors.estimatedHours}
                      </p>
                    )}
                    {focusedField === 'estimatedHours' ? (
                      <p className="mt-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
                        💡 {getFieldHelp('estimatedHours')}
                      </p>
                    ) : formData.estimatedHours ? (
                      <p className="mt-1 text-xs text-indigo-600">
                        ⏱️ {formData.estimatedHours}h estimadas ({formData.estimatedHours >= 8 ? `${(formData.estimatedHours / 8).toFixed(1)} días` : `${Math.round(formData.estimatedHours * 60)} minutos`})
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-500">
                        Usa 0.5 para media hora, incrementos de 0.5
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="assigneeId" className="flex items-center text-sm font-semibold text-gray-700">
                        <svg className="w-5 h-5 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Asignar a <span className="text-gray-400 text-xs font-normal ml-1">(opcional)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsMemberModalOpen(true)}
                        disabled={!currentProjectId}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                        title="Agregar nuevo miembro al proyecto"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Agregar Miembro
                      </button>
                    </div>
                    <div className="relative">
                      <select
                        id="assigneeId"
                        name="assigneeId"
                        value={formData.assigneeId || ''}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField('assignee')}
                        onBlur={() => setFocusedField(null)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none"
                        disabled={isLoading}
                      >
                        <option value="">👤 Sin asignar</option>
                        {teamMembers.map(member => (
                          <option key={member.id} value={member.id}>
                            👨‍💻 {member.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    {focusedField === 'assignee' ? (
                      <p className="mt-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
                        💡 {getFieldHelp('assignee')}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-500">
                        Miembros disponibles: {teamMembers.length}
                      </p>
                    )}
                  </div>
                </div>

                {/* Resumen antes de guardar */}
                {mode === 'create' && formData.title && formData.userStoryId > 0 && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 mb-2">¡Todo listo para crear!</h4>
                        <p className="text-sm text-gray-700">
                          Tu tarea "{formData.title}" está completa al <strong>{calculateProgress()}%</strong>
                          {formData.estimatedHours && <span> con <strong>{formData.estimatedHours}h</strong> estimadas</span>}.
                          {calculateProgress() === 100 ? ' ¡Perfecto! ' : ' '}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botones */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-6 border-t">
                  <div className="text-sm text-gray-600">
                    <span className="font-semibold">Tip:</span> Usa <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs">Tab</kbd> para navegar entre campos
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => window.history.back()}
                      disabled={isLoading}
                      className="px-6 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold hover:scale-105 active:scale-95 flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Cancelar</span>
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || success}
                      className="px-8 py-3 text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold hover:scale-105 active:scale-95 flex items-center justify-center space-x-2 shadow-lg"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>{mode === 'edit' ? 'Actualizando...' : 'Creando Tarea...'}</span>
                        </>
                      ) : success ? (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>¡Guardado Exitosamente!</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                          <span>{mode === 'edit' ? 'Actualizar Tarea' : 'Crear Tarea'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modal para agregar miembro */}
        {isMemberModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              {/* Overlay */}
              <div 
                className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
                onClick={() => setIsMemberModalOpen(false)}
              ></div>

              {/* Modal */}
              <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-2xl rounded-2xl">
                {/* Header del Modal */}
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0264C5] to-[#11C0F1]">
                  <h3 className="text-lg font-chatgpt-semibold text-white">
                    Agregar Miembro al Proyecto
                  </h3>
                  <button
                    onClick={() => setIsMemberModalOpen(false)}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Contenido del Modal */}
                <div className="px-6 py-4">
                  <AddMemberForm 
                    projectId={currentProjectId}
                    onSuccess={handleMemberAdded}
                    onCancel={() => setIsMemberModalOpen(false)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppSidebarLayout>
  );
};

// Componente interno para el formulario de agregar miembro
interface AddMemberFormProps {
  projectId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const AddMemberForm: React.FC<AddMemberFormProps> = ({ projectId, onSuccess, onCancel }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('DEVELOPER');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Buscar usuarios en tiempo real
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 2) {
        setFilteredUsers([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await authenticatedRequest(`${API_BASE_URL}/users?search=${encodeURIComponent(searchQuery)}&limit=50`);
        const users = response.data?.users || response.users || [];
        setFilteredUsers(users);
      } catch (err) {
        setFilteredUsers([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setSearchQuery(user.name);
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) {
      setError('Debes seleccionar un usuario');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await authenticatedRequest(`${API_BASE_URL}/scrum/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          userId: selectedUser.id,
          role: selectedRole
        })
      });
      
      onSuccess();
      
    } catch (err: any) {
      setError(err.message || 'Error al agregar el miembro');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Usuario - Autocomplete */}
      <div className="relative">
        <label htmlFor="member-search" className="block text-sm font-chatgpt-medium text-gray-700 mb-1">
          Usuario <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            id="member-search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
              if (e.target.value !== selectedUser?.name) {
                setSelectedUser(null);
              }
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Escribe para buscar (nombre o email)..."
            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0264C5] focus:border-transparent text-sm"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0264C5]"></div>
            </div>
          )}
          {selectedUser && !showDropdown && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>

        {/* Dropdown de resultados */}
        {showDropdown && searchQuery.length >= 2 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredUsers.length > 0 ? (
              filteredUsers.map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleUserSelect(user)}
                  className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-chatgpt-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    {selectedUser?.id === user.id && (
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                {isSearching ? 'Buscando...' : 'No se encontraron usuarios'}
              </div>
            )}
          </div>
        )}
        
        {searchQuery.length < 2 && searchQuery.length > 0 && (
          <p className="mt-1 text-xs text-gray-500">Escribe al menos 2 caracteres para buscar</p>
        )}
        
        {selectedUser && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-700">
              ✓ Seleccionado: <span className="font-chatgpt-medium">{selectedUser.name}</span> ({selectedUser.email})
            </p>
          </div>
        )}
      </div>

          {/* Rol */}
          <div>
            <label htmlFor="member-role" className="block text-sm font-chatgpt-medium text-gray-700 mb-1">
              Rol
            </label>
            <select
              id="member-role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0264C5] focus:border-transparent text-sm"
            >
              <option value="DEVELOPER">Desarrollador</option>
              <option value="TESTER">Tester</option>
              <option value="DESIGNER">Diseñador</option>
              <option value="PRODUCT_OWNER">Product Owner</option>
              <option value="SCRUM_MASTER">Scrum Master</option>
              <option value="STAKEHOLDER">Stakeholder</option>
              <option value="INFRAESTRUCTURA">Infraestructura</option>
              <option value="REDES">Redes</option>
              <option value="SEGURIDAD">Seguridad</option>
            </select>
          </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-chatgpt-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading || !selectedUser}
          className="px-4 py-2 text-sm font-chatgpt-medium text-white bg-[#0264C5] rounded-lg hover:bg-[#11C0F1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              Agregando...
            </>
          ) : (
            'Agregar Miembro'
          )}
        </button>
      </div>
    </form>
  );
};

export default TaskFormImproved;

