import React, { useState, useEffect } from 'react';
import AppSidebarLayout from '../../layout/AppSidebarLayout';
import { API_BASE_URL, authenticatedRequest } from '../../../config/api';

interface UserStoryFormData {
  title: string;
  description: string;
  acceptanceCriteria: string;
  epicId: number;
  sprintId?: number | null;
  storyPoints?: number | null;
  status: 'DRAFT' | 'READY' | 'IN_PROGRESS' | 'TESTING' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface UserStoryFormImprovedProps {
  initialData?: Partial<UserStoryFormData>;
  userStoryId?: string;
  mode?: 'create' | 'edit';
}

interface Sprint {
  id: number;
  name: string;
  status: string;
}

interface Epic {
  id: number;
  title: string;
  status: string;
}

const UserStoryFormImproved: React.FC<UserStoryFormImprovedProps> = ({ 
  initialData, 
  userStoryId,
  mode = 'create' 
}) => {
  const [epicId, setEpicId] = useState<number>(initialData?.epicId || 0);
  const [formData, setFormData] = useState<UserStoryFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    acceptanceCriteria: initialData?.acceptanceCriteria || '',
    epicId: initialData?.epicId || 0,
    sprintId: initialData?.sprintId || null,
    storyPoints: initialData?.storyPoints || null,
    status: initialData?.status || 'DRAFT',
    priority: initialData?.priority || 'MEDIUM',
  });
  
  const [epics, setEpics] = useState<Epic[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSprints, setIsLoadingSprints] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(mode === 'edit');
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [projectId, setProjectId] = useState<number>(0);
  const [showHelp, setShowHelp] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Cargar datos de la user story en modo edición
  useEffect(() => {
    const loadUserStoryData = async () => {
      if (mode === 'edit' && userStoryId) {
        setIsLoadingData(true);
        try {
          const response = await authenticatedRequest(`${API_BASE_URL}/scrum/user-stories/${userStoryId}`);
          const userStory = response.userStory || response.data?.userStory || response;
          
          if (userStory) {
            const newEpicId = userStory.epicId || 0;
            
            setFormData({
              title: userStory.title || '',
              description: userStory.description || '',
              acceptanceCriteria: userStory.acceptanceCriteria || '',
              epicId: newEpicId,
              sprintId: userStory.sprintId || null,
              storyPoints: userStory.storyPoints || null,
              status: userStory.status || 'DRAFT',
              priority: userStory.priority || 'MEDIUM',
            });
            setEpicId(newEpicId);
            
            // Cargar sprints inmediatamente después de obtener el epicId
            if (newEpicId > 0 && userStory.epic?.project?.id) {
              setIsLoadingSprints(true);
              try {
                const sprintsResponse = await authenticatedRequest(
                  `${API_BASE_URL}/scrum/projects/${userStory.epic.project.id}/sprints`
                );
                const sprintsData = sprintsResponse.sprints || sprintsResponse.data?.sprints || [];
                setSprints(sprintsData);
              } catch (err) {
              } finally {
                setIsLoadingSprints(false);
              }
            } else {
            }
          }
        } catch (err: any) {
          setError('Error al cargar los datos de la historia de usuario');
        } finally {
          setIsLoadingData(false);
        }
      }
    };

    loadUserStoryData();
  }, [mode, userStoryId]);

  // Obtener epicId o projectId de la URL si no viene en initialData (modo crear)
  useEffect(() => {
    if (typeof window !== 'undefined' && mode === 'create' && !initialData?.epicId) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlEpicId = urlParams.get('epicId');
      const urlProjectId = urlParams.get('projectId');
      
      if (urlEpicId) {
        const eid = parseInt(urlEpicId);
        setEpicId(eid);
        setFormData(prev => ({ ...prev, epicId: eid }));
      } else if (urlProjectId) {
        // Si viene projectId pero no epicId, solo guardamos el projectId
        const pid = parseInt(urlProjectId);
        setProjectId(pid);
      }
    }
  }, [initialData, mode]);

  // Cargar épicas y sprints disponibles (para modo crear con epicId o projectId desde URL)
  useEffect(() => {
    const loadProjectData = async () => {
      if (mode === 'edit') return; // En modo edición se cargan junto con los datos
      
      setIsLoadingSprints(true);
      try {
        let extractedProjectId = projectId;
        
        // Si tenemos epicId pero no projectId, obtener el projectId del epic
        if (epicId && !projectId) {
        const epicResponse = await authenticatedRequest(`${API_BASE_URL}/scrum/epics/${epicId}`);
        
        const epic = epicResponse.epic || epicResponse.data?.epic || epicResponse;
          extractedProjectId = epic?.project?.id || epic?.projectId;
        
        
        setProjectId(extractedProjectId || 0);
        }
        
        // Si tenemos projectId (directo o extraído del epic), cargar épicas y sprints
        if (extractedProjectId) {
          
          // Cargar épicas del proyecto
          const epicsResponse = await authenticatedRequest(
            `${API_BASE_URL}/scrum/projects/${extractedProjectId}/epics`
          );
          const epicsData = epicsResponse.data?.epics || epicsResponse.epics || [];
          setEpics(epicsData);
          
          // Cargar sprints del proyecto
          const sprintsResponse = await authenticatedRequest(
            `${API_BASE_URL}/scrum/projects/${extractedProjectId}/sprints`
          );
          const sprintsData = sprintsResponse.data?.sprints || sprintsResponse.sprints || [];
          setSprints(sprintsData);
        }
      } catch (err) {
      } finally {
        setIsLoadingSprints(false);
      }
    };

    // Solo ejecutar si tenemos epicId o projectId
    if (epicId || projectId) {
      loadProjectData();
    }
  }, [epicId, projectId, mode]);

  // Función para recargar sprints después de crear uno nuevo
  const reloadSprints = async () => {
    if (!projectId) return;
    
    setIsLoadingSprints(true);
    try {
      const sprintsResponse = await authenticatedRequest(
        `${API_BASE_URL}/scrum/projects/${projectId}/sprints`
      );
      const sprintsData = sprintsResponse.data?.sprints || sprintsResponse.sprints || [];
      setSprints(sprintsData);
    } catch (err) {
    } finally {
      setIsLoadingSprints(false);
    }
  };

  const handleSprintCreated = () => {
    setIsSprintModalOpen(false);
    reloadSprints();
  };

  // Calcular progreso del formulario
  const calculateProgress = () => {
    let completed = 0;
    const total = 6; // Total de campos importantes
    
    if (formData.title.trim()) completed++;
    if (formData.description.trim()) completed++;
    if (formData.acceptanceCriteria.trim()) completed++;
    if (formData.epicId > 0) completed++;
    if (formData.status) completed++;
    if (formData.priority) completed++;
    
    return Math.round((completed / total) * 100);
  };

  const getFieldHelp = (field: string): string => {
    const helpTexts: Record<string, string> = {
      title: 'Usa el formato: "Como [rol], quiero [acción], para [beneficio]". Ejemplo: "Como usuario, quiero resetear mi contraseña, para recuperar el acceso a mi cuenta"',
      description: 'Detalla la funcionalidad, contexto y cualquier información adicional que el equipo necesite conocer.',
      acceptanceCriteria: 'Define condiciones específicas usando Dado-Cuando-Entonces. Ej: "Dado que estoy en la página de login, cuando ingreso credenciales válidas, entonces accedo al dashboard"',
      storyPoints: 'Usa escala Fibonacci (1,2,3,5,8,13,21). 1=muy simple, 21=muy complejo. Considera esfuerzo, complejidad y riesgo.',
      sprint: 'Asigna esta historia a un sprint específico o déjala en el backlog para planificación futura.',
      status: 'DRAFT: En definición. READY: Lista para desarrollo. IN_PROGRESS: En ejecución. TESTING: En pruebas.',
      priority: 'Define según impacto en el usuario y urgencia del negocio. CRITICAL: Bloqueante o crítico para producción.'
    };
    return helpTexts[field] || '';
  };

  const getUserStoryTemplates = () => [
    { 
      title: 'Como usuario, quiero iniciar sesión con mi email, para acceder a mi cuenta de forma segura',
      description: 'Implementar funcionalidad de login que permita a los usuarios autenticarse usando su email y contraseña. Debe incluir validación de credenciales, mensajes de error claros y redirección al dashboard tras login exitoso.',
      acceptanceCriteria: 'Dado que estoy en la página de login\nCuando ingreso email y contraseña válidos\nEntonces accedo al dashboard\n\nDado que ingreso credenciales inválidas\nCuando intento iniciar sesión\nEntonces veo un mensaje de error claro'
    },
    {
      title: 'Como administrador, quiero gestionar usuarios del sistema, para controlar los accesos y permisos',
      description: 'Crear panel de administración que permita listar, crear, editar y eliminar usuarios. Debe incluir asignación de roles, cambio de estado (activo/inactivo) y búsqueda/filtrado de usuarios.',
      acceptanceCriteria: 'Dado que soy administrador\nCuando accedo al panel de usuarios\nEntonces veo lista completa de usuarios con sus roles\n\nDado que creo un nuevo usuario\nCuando guardo los datos\nEntonces el usuario recibe email de bienvenida'
    },
    {
      title: 'Como usuario, quiero recuperar mi contraseña olvidada, para recuperar acceso a mi cuenta',
      description: 'Implementar flujo de recuperación de contraseña mediante email. Usuario solicita recuperación, recibe link temporal, ingresa nueva contraseña y puede acceder nuevamente.',
      acceptanceCriteria: 'Dado que olvid é mi contraseña\nCuando ingreso mi email en recuperación\nEntonces recibo un link de reseteo válido por 24h\n\nDado que uso el link de reseteo\nCuando ingreso nueva contraseña\nEntonces puedo iniciar sesión con la nueva contraseña'
    },
    {
      title: 'Como usuario, quiero buscar y filtrar información, para encontrar rápidamente lo que necesito',
      description: 'Agregar barra de búsqueda con filtros avanzados que permita buscar por múltiples criterios, ordenar resultados y aplicar filtros dinámicos. Resultados deben mostrarse paginados.',
      acceptanceCriteria: 'Dado que ingreso un término de búsqueda\nCuando presiono buscar\nEntonces veo resultados relevantes ordenados por relevancia\n\nDado que aplico filtros\nCuando combino múltiples filtros\nEntonces veo resultados que cumplan todos los criterios'
    }
  ];

  const applyTemplate = (template: { title: string; description: string; acceptanceCriteria: string }) => {
    setFormData(prev => ({
      ...prev,
      title: template.title,
      description: template.description,
      acceptanceCriteria: template.acceptanceCriteria
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'El título de la historia es obligatorio';
    } else if (formData.title.trim().length < 5) {
      newErrors.title = 'El título debe tener al menos 5 caracteres';
    } else if (formData.title.length > 200) {
      newErrors.title = 'El título no puede exceder 200 caracteres';
    }

    if (!formData.description?.trim()) {
      newErrors.description = 'La descripción es obligatoria';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'La descripción debe tener al menos 10 caracteres';
    } else if (formData.description.length > 1000) {
      newErrors.description = 'La descripción no puede exceder 1000 caracteres';
    }

    if (!formData.epicId || formData.epicId <= 0) {
      newErrors.epicId = 'Debes seleccionar un epic';
    }

    if (formData.storyPoints && (formData.storyPoints < 1 || formData.storyPoints > 100)) {
      newErrors.storyPoints = 'Los story points deben estar entre 1 y 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    let processedValue: any = value;
    
    // Procesar valores numéricos
    if (name === 'storyPoints') {
      processedValue = value === '' ? null : parseInt(value);
    } else if (name === 'sprintId') {
      processedValue = value === '' ? null : parseInt(value);
    }
    
    setFormData(prev => ({ ...prev, [name]: processedValue }));
    
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
      const url = mode === 'edit' && userStoryId 
        ? `${API_BASE_URL}/scrum/user-stories/${userStoryId}`
        : `${API_BASE_URL}/scrum/user-stories`;
      
      const method = mode === 'edit' ? 'PUT' : 'POST';
      
      // Limpiar datos: remover campos null/undefined opcionales
      const cleanData: any = {
        title: formData.title,
        description: formData.description,
        acceptanceCriteria: formData.acceptanceCriteria,
        epicId: formData.epicId,
        status: formData.status,
        priority: formData.priority
      };

      // Solo agregar campos opcionales si tienen valores válidos
      if (formData.sprintId && formData.sprintId > 0) {
        cleanData.sprintId = formData.sprintId;
      }
      
      if (formData.storyPoints && formData.storyPoints > 0) {
        cleanData.storyPoints = formData.storyPoints;
      }
      
      const response = await authenticatedRequest(url, {
        method,
        body: JSON.stringify(cleanData)
      });
      
      setSuccess(true);
      
      // Disparar evento para actualizar componentes relacionados
      const userStory = response.userStory || response.data?.userStory;
      if (userStory) {
        if (mode === 'edit') {
          window.dispatchEvent(new CustomEvent('userStory:updated', { detail: { userStory } }));
        } else {
          window.dispatchEvent(new CustomEvent('userStory:created', { detail: { userStory } }));
        }
      }
      
      setTimeout(() => {
        window.location.href = `/epics/detalle?id=${formData.epicId}`;
      }, 1500);
      
    } catch (err: any) {
      setError(err.message || 'Error al guardar la historia de usuario');
    } finally {
      setIsLoading(false);
    }
  };

  // Mostrar loading mientras se cargan los datos en modo edición
  if (isLoadingData) {
    return (
      <AppSidebarLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0264C5] mx-auto mb-4"></div>
            <p className="text-gray-neutral">Cargando datos de la historia...</p>
          </div>
        </div>
      </AppSidebarLayout>
    );
  }

  return (
    <AppSidebarLayout>
      <div className="h-full flex flex-col">
        {/* Breadcrumbs */}
        <div className="bg-gradient-to-r from-[#F2ECDF] to-gray-50 border-b border-gray-200 px-4 sm:px-6 py-3">
          <div className="flex justify-center">
            <div className="max-w-7xl w-full">
              <nav className="flex items-center space-x-2 text-sm">
                <a href="/proyectos" className="text-[#777777] hover:text-[#0264C5] transition-colors duration-200">
                  Proyectos
                </a>
                <svg className="w-4 h-4 text-[#777777]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {epicId > 0 && (
                  <>
                    <a href={`/epics/detalle?id=${epicId}`} className="text-[#777777] hover:text-[#0264C5] transition-colors duration-200">
                      Epic #{epicId}
                    </a>
                    <svg className="w-4 h-4 text-[#777777]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
                <span className="text-[#0264C5] font-chatgpt-medium">
                  {mode === 'edit' ? 'Editar User Story' : 'Nueva User Story'}
                </span>
              </nav>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex justify-center">
            <div className="max-w-7xl w-full">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-2xl font-chatgpt-semibold text-gray-900 flex items-center space-x-2">
                    <span>{mode === 'edit' ? 'Editar User Story' : 'Crear Nueva User Story'}</span>
                    {mode === 'create' && (
                      <span className="text-lg">📖</span>
                    )}
              </h1>
              <p className="text-sm text-[#777777] mt-1">
                {mode === 'edit' 
                  ? 'Modifica la información de la historia de usuario' 
                      : 'Las historias de usuario definen funcionalidades desde la perspectiva del usuario'}
                  </p>
                  
                  {/* Barra de progreso */}
                  {mode === 'create' && !success && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-chatgpt-medium text-gray-700">
                          Progreso del formulario
                        </span>
                        <span className="text-xs font-chatgpt-semibold text-[#0264C5]">
                          {calculateProgress()}%
                        </span>
            </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-[#0264C5] to-[#11C0F1] h-2 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${calculateProgress()}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => setShowHelp(!showHelp)}
                  className="ml-4 bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 text-purple-700 px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-300 flex items-center space-x-2 hover:scale-105 active:scale-95"
                  title="Ver ayuda"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="hidden sm:inline">Ayuda</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="flex-1 bg-gradient-to-br from-[#F2ECDF] to-gray-50 px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto">
          <div className="flex justify-center">
            <div className="max-w-4xl w-full space-y-4">
              
              {/* Panel de Ayuda */}
              {showHelp && mode === 'create' && (
                <div className="bg-white rounded-2xl shadow-sm border-2 border-purple-200 p-6 animate-fadeIn">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-chatgpt-semibold text-gray-900">Guía Rápida - User Stories</h3>
                        <p className="text-sm text-[#777777]">Consejos para crear historias de usuario efectivas</p>
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
                  
                  <div className="space-y-3 text-sm text-gray-700 mb-4">
                    <div className="flex items-start space-x-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <p><strong>Formato correcto:</strong> "Como [rol], quiero [acción], para [beneficio]" - enfócate en el valor para el usuario</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <p><strong>INVEST:</strong> Independiente, Negociable, Valiosa, Estimable, Small (pequeña), Testeable</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <p><strong>Criterios de Aceptación:</strong> Usa formato Dado-Cuando-Entonces para definir comportamiento esperado</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-blue-500 mt-1">💡</span>
                      <p><strong>Siguiente paso:</strong> Después de crear la user story, desglósala en tareas técnicas específicas</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Plantillas Rápidas */}
              {mode === 'create' && !formData.title && (
                <div className="bg-gradient-to-r from-cyan-50 to-teal-50 rounded-2xl shadow-sm border border-cyan-200 p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <h3 className="text-lg font-chatgpt-semibold text-gray-900">Plantillas de User Stories</h3>
                  </div>
                  <p className="text-sm text-gray-700 mb-4">Comienza con una plantilla predefinida siguiendo el formato correcto</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {getUserStoryTemplates().map((template, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => applyTemplate(template)}
                        className="text-left p-4 bg-white border-2 border-cyan-200 hover:border-cyan-400 rounded-xl transition-all hover:shadow-md group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-chatgpt-semibold text-gray-900 mb-1 group-hover:text-[#0264C5] transition-colors text-sm">
                              {template.title}
                            </h4>
                            <p className="text-xs text-gray-600 line-clamp-2">{template.description}</p>
                          </div>
                          <svg className="w-5 h-5 text-cyan-500 group-hover:text-cyan-700 transition-colors flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                {error && (
                  <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-red-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                )}

                {success && (
                  <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-green-800">
                        {mode === 'edit' ? '¡User Story actualizada exitosamente!' : '¡User Story creada exitosamente!'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Título */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="title" className="flex items-center text-sm font-chatgpt-medium text-gray-700">
                        <svg className="w-5 h-5 text-[#0264C5] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        Título de la User Story <span className="text-red-500 ml-1">*</span>
                    </label>
                      <span className={`text-xs ${formData.title.length > 160 ? 'text-orange-600 font-chatgpt-semibold' : 'text-gray-500'}`}>
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
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-[#0264C5] focus:border-transparent transition-all ${
                          errors.title ? 'border-red-300' : formData.title ? 'border-green-300 bg-green-50/30' : 'border-gray-300'
                      }`}
                      placeholder="Como [usuario], quiero [funcionalidad], para [beneficio]"
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
                      <label htmlFor="description" className="flex items-center text-sm font-chatgpt-medium text-gray-700">
                        <svg className="w-5 h-5 text-[#0264C5] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Descripción <span className="text-red-500 ml-1">*</span>
                      </label>
                      <span className={`text-xs ${formData.description.length > 800 ? 'text-orange-600 font-chatgpt-semibold' : 'text-gray-500'}`}>
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
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-[#0264C5] focus:border-transparent transition-all resize-none ${
                        errors.description ? 'border-red-300' : formData.description ? 'border-green-300 bg-green-50/30' : 'border-gray-300'
                      }`}
                      placeholder="Describe la funcionalidad, contexto y detalles relevantes..."
                    />
                    {errors.description && (
                      <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{errors.description}</span>
                      </p>
                    )}
                    {focusedField === 'description' && !errors.description && (
                      <p className="mt-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
                        💡 {getFieldHelp('description')}
                      </p>
                    )}
                  </div>

                  {/* Criterios de Aceptación */}
                  <div>
                    <label htmlFor="acceptanceCriteria" className="flex items-center text-sm font-chatgpt-medium text-gray-700 mb-2">
                      <svg className="w-5 h-5 text-[#0264C5] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Criterios de Aceptación
                    </label>
                    <textarea
                      id="acceptanceCriteria"
                      name="acceptanceCriteria"
                      value={formData.acceptanceCriteria}
                      onChange={handleInputChange}
                      onFocus={() => setFocusedField('acceptanceCriteria')}
                      onBlur={() => setFocusedField(null)}
                      rows={5}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-[#0264C5] focus:border-transparent transition-all resize-none font-mono text-sm ${
                        formData.acceptanceCriteria ? 'border-green-300 bg-green-50/30' : 'border-gray-300'
                      }`}
                      placeholder="Dado que [contexto]&#10;Cuando [acción]&#10;Entonces [resultado esperado]&#10;&#10;Dado que [otro contexto]&#10;Cuando [otra acción]&#10;Entonces [otro resultado]"
                    />
                    {focusedField === 'acceptanceCriteria' && (
                      <p className="mt-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
                        💡 {getFieldHelp('acceptanceCriteria')}
                      </p>
                    )}
                    {!focusedField && (
                      <p className="mt-1 text-xs text-[#777777] flex items-center space-x-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Usa formato: "Dado que..., cuando..., entonces..."</span>
                      </p>
                    )}
                  </div>

                  {/* Selección de Épica (solo si viene con projectId) */}
                  {projectId && !epicId && epics.length > 0 && (
                    <div>
                      <label htmlFor="epicId" className="flex items-center text-sm font-chatgpt-medium text-gray-700 mb-2">
                        <svg className="w-5 h-5 text-[#0264C5] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Épica <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="relative">
                        <select
                          id="epicId"
                          name="epicId"
                          value={formData.epicId || ''}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-[#0264C5] focus:border-transparent appearance-none bg-white transition-all ${
                            errors.epicId ? 'border-red-300' : formData.epicId ? 'border-green-300 bg-green-50/30' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Seleccionar épica...</option>
                          {epics.map(epic => (
                            <option key={epic.id} value={epic.id}>
                              ⚡ {epic.title} ({epic.status})
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {errors.epicId && (
                        <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{errors.epicId}</span>
                        </p>
                      )}
                      <p className="mt-1 text-xs text-[#777777]">
                        Selecciona la épica a la que pertenece esta user story
                      </p>
                    </div>
                  )}

                  {/* Story Points y Sprint */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="storyPoints" className="flex items-center text-sm font-chatgpt-medium text-gray-700 mb-2">
                        <svg className="w-5 h-5 text-[#0264C5] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                        </svg>
                        Story Points <span className="text-gray-400 text-xs font-normal ml-1">(opcional)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          id="storyPoints"
                          name="storyPoints"
                          value={formData.storyPoints || ''}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField('storyPoints')}
                          onBlur={() => setFocusedField(null)}
                          min="1"
                          max="100"
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-[#0264C5] focus:border-transparent transition-all ${
                            errors.storyPoints ? 'border-red-300' : formData.storyPoints ? 'border-green-300 bg-green-50/30' : 'border-gray-300'
                          }`}
                          placeholder="Ej: 1, 2, 3, 5, 8, 13, 21..."
                        />
                      </div>
                      {errors.storyPoints && (
                        <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{errors.storyPoints}</span>
                        </p>
                      )}
                      {focusedField === 'storyPoints' ? (
                        <p className="mt-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
                          💡 {getFieldHelp('storyPoints')}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-[#777777]">
                          Estimación de complejidad (Fibonacci: 1, 2, 3, 5, 8, 13, 21...)
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label htmlFor="sprintId" className="flex items-center text-sm font-chatgpt-medium text-gray-700">
                          <svg className="w-5 h-5 text-[#0264C5] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Sprint <span className="text-gray-400 text-xs font-normal ml-1">(opcional)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsSprintModalOpen(true)}
                          disabled={!projectId}
                          className="flex items-center gap-1 px-3 py-1 text-xs font-chatgpt-medium text-[#0264C5] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                          title="Crear nuevo sprint"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Nuevo Sprint
                        </button>
                      </div>
                      <div className="relative">
                        <select
                          id="sprintId"
                          name="sprintId"
                          value={formData.sprintId || ''}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField('sprint')}
                          onBlur={() => setFocusedField(null)}
                          disabled={isLoadingSprints}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0264C5] focus:border-transparent disabled:bg-gray-100 appearance-none bg-white transition-all"
                        >
                          <option value="">🗂️ Backlog (Sin asignar)</option>
                          {sprints.map(sprint => (
                            <option key={sprint.id} value={sprint.id}>
                              🏃 {sprint.name} ({sprint.status})
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {focusedField === 'sprint' ? (
                        <p className="mt-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
                          💡 {getFieldHelp('sprint')}
                        </p>
                      ) : isLoadingSprints ? (
                        <p className="mt-1 text-xs text-[#777777]">Cargando sprints...</p>
                      ) : (
                        <p className="mt-1 text-xs text-[#777777]">
                          Sprints disponibles: {sprints.length}
                          {sprints.length === 0 && ' (Crea un sprint o déjalo en backlog)'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Estado y Prioridad */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="status" className="flex items-center text-sm font-chatgpt-medium text-gray-700 mb-2">
                        <svg className="w-5 h-5 text-[#0264C5] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Estado de la User Story
                      </label>
                      <div className="relative">
                        <select
                          id="status"
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField('status')}
                          onBlur={() => setFocusedField(null)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0264C5] focus:border-transparent appearance-none bg-white transition-all"
                        >
                          <option value="DRAFT">📝 Borrador</option>
                          <option value="READY">✅ Listo</option>
                          <option value="IN_PROGRESS">🚀 En Progreso</option>
                          <option value="TESTING">🧪 En Pruebas</option>
                          <option value="COMPLETED">🎉 Completado</option>
                          <option value="CANCELLED">❌ Cancelado</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {focusedField === 'status' && (
                        <p className="mt-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
                          💡 {getFieldHelp('status')}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="priority" className="flex items-center text-sm font-chatgpt-medium text-gray-700 mb-2">
                        <svg className="w-5 h-5 text-[#0264C5] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Prioridad
                      </label>
                      <div className="relative">
                        <select
                          id="priority"
                          name="priority"
                          value={formData.priority}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField('priority')}
                          onBlur={() => setFocusedField(null)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0264C5] focus:border-transparent appearance-none bg-white transition-all"
                        >
                          <option value="LOW">🟢 Baja</option>
                          <option value="MEDIUM">🟡 Media</option>
                          <option value="HIGH">🟠 Alta</option>
                          <option value="CRITICAL">🔴 Crítica</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {focusedField === 'priority' && (
                        <p className="mt-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
                          💡 {getFieldHelp('priority')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Resumen antes de guardar */}
                {mode === 'create' && formData.title && formData.description && formData.epicId > 0 && (
                  <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-chatgpt-semibold text-gray-900 mb-2">¡Todo listo para crear!</h4>
                        <p className="text-sm text-gray-700">
                          Tu user story está completa al <strong>{calculateProgress()}%</strong>. 
                          {calculateProgress() === 100 ? ' ¡Perfecto! ' : ' '}
                          Puedes guardar ahora o seguir completando los campos opcionales.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botones */}
                <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-3">
                  <div className="text-sm text-gray-600">
                    <span className="font-chatgpt-medium">Tip:</span> Usa <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs">Tab</kbd> para navegar entre campos
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <a
                      href={epicId > 0 ? `/epics/detalle?id=${epicId}` : '/proyectos'}
                      className="bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 px-6 py-3 rounded-xl font-chatgpt-medium transition-all duration-300 hover:scale-105 active:scale-95 text-center flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Cancelar</span>
                    </a>
                    <button
                      type="submit"
                      disabled={isLoading || success}
                      className="bg-gradient-to-r from-[#0264C5] to-[#11C0F1] hover:shadow-2xl text-white px-8 py-3 rounded-xl font-chatgpt-semibold transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center space-x-2 shadow-lg"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>{mode === 'edit' ? 'Actualizando...' : 'Creando User Story...'}</span>
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          <span>{mode === 'edit' ? 'Actualizar User Story' : 'Crear User Story'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Modal para crear Sprint */}
        {isSprintModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              {/* Overlay */}
              <div 
                className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
                onClick={() => setIsSprintModalOpen(false)}
              ></div>

              {/* Modal */}
              <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-2xl rounded-2xl">
                {/* Header del Modal */}
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0264C5] to-[#11C0F1]">
                  <h3 className="text-lg font-chatgpt-semibold text-white">
                    Crear Nuevo Sprint
                  </h3>
                  <button
                    onClick={() => setIsSprintModalOpen(false)}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Contenido del Modal */}
                <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                  <SprintFormModal 
                    projectId={projectId}
                    onSuccess={handleSprintCreated}
                    onCancel={() => setIsSprintModalOpen(false)}
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

// Componente interno para el formulario de Sprint en el modal
interface SprintFormModalProps {
  projectId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const SprintFormModal: React.FC<SprintFormModalProps> = ({ projectId, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    goal: '',
    startDate: '',
    endDate: '',
    projectId: projectId,
    status: 'PLANNING' as const,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del sprint es obligatorio';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!formData.goal?.trim()) {
      newErrors.goal = 'El objetivo del sprint es obligatorio';
    } else if (formData.goal.trim().length < 10) {
      newErrors.goal = 'El objetivo debe tener al menos 10 caracteres';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'La fecha de inicio es obligatoria';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'La fecha de fin es obligatoria';
    }

    if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
      newErrors.endDate = 'La fecha de fin debe ser posterior a la fecha de inicio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
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
      const response = await authenticatedRequest(`${API_BASE_URL}/scrum/sprints`, {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      // Disparar evento para actualizar componentes relacionados
      const sprint = response.sprint || response.data?.sprint;
      if (sprint) {
        window.dispatchEvent(new CustomEvent('sprint:created', { detail: { sprint } }));
      }
      
      onSuccess();
      
    } catch (err: any) {
      setError(err.message || 'Error al crear el sprint');
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

      {/* Nombre */}
      <div>
        <label htmlFor="sprint-name" className="block text-sm font-chatgpt-medium text-gray-700 mb-1">
          Nombre del Sprint <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="sprint-name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0264C5] focus:border-transparent text-sm ${
            errors.name ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Ej: Sprint 1 - Mejoras de UX"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-600">{errors.name}</p>
        )}
      </div>

      {/* Objetivo */}
      <div>
        <label htmlFor="sprint-goal" className="block text-sm font-chatgpt-medium text-gray-700 mb-1">
          Objetivo del Sprint <span className="text-red-500">*</span>
        </label>
        <textarea
          id="sprint-goal"
          name="goal"
          value={formData.goal}
          onChange={handleInputChange}
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0264C5] focus:border-transparent text-sm ${
            errors.goal ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Define el objetivo principal..."
        />
        {errors.goal && (
          <p className="mt-1 text-xs text-red-600">{errors.goal}</p>
        )}
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="sprint-startDate" className="block text-sm font-chatgpt-medium text-gray-700 mb-1">
            Fecha de Inicio <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="sprint-startDate"
            name="startDate"
            value={formData.startDate}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0264C5] focus:border-transparent text-sm ${
              errors.startDate ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.startDate && (
            <p className="mt-1 text-xs text-red-600">{errors.startDate}</p>
          )}
        </div>

        <div>
          <label htmlFor="sprint-endDate" className="block text-sm font-chatgpt-medium text-gray-700 mb-1">
            Fecha de Fin <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="sprint-endDate"
            name="endDate"
            value={formData.endDate}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0264C5] focus:border-transparent text-sm ${
              errors.endDate ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.endDate && (
            <p className="mt-1 text-xs text-red-600">{errors.endDate}</p>
          )}
        </div>
      </div>

      {/* Estado */}
      <div>
        <label htmlFor="sprint-status" className="block text-sm font-chatgpt-medium text-gray-700 mb-1">
          Estado
        </label>
        <select
          id="sprint-status"
          name="status"
          value={formData.status}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0264C5] focus:border-transparent text-sm"
        >
          <option value="PLANNING">Planificación</option>
          <option value="ACTIVE">Activo</option>
          <option value="COMPLETED">Completado</option>
          <option value="CANCELLED">Cancelado</option>
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
          disabled={isLoading}
          className="px-4 py-2 text-sm font-chatgpt-medium text-white bg-[#0264C5] rounded-lg hover:bg-[#11C0F1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              Creando...
            </>
          ) : (
            'Crear Sprint'
          )}
        </button>
      </div>
    </form>
  );
};

export default UserStoryFormImproved;

