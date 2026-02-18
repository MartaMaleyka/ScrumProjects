import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppSidebarLayout from '../../layout/AppSidebarLayout';
import { API_BASE_URL, authenticatedRequest } from '../../../config/api';

interface SprintFormData {
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  projectId: number;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

interface SprintFormImprovedProps {
  initialData?: Partial<SprintFormData>;
  sprintId?: string;
  mode?: 'create' | 'edit';
  asModal?: boolean;
  isOpen?: boolean;
  projectId?: number;
  onSuccess?: () => void;
  onClose?: () => void;
}

const SprintFormImproved: React.FC<SprintFormImprovedProps> = ({ 
  initialData, 
  sprintId,
  mode = 'create',
  asModal = false,
  isOpen = true,
  projectId: propProjectId,
  onSuccess,
  onClose
}) => {
  const { t } = useTranslation();
  const [projectId, setProjectId] = useState<number>(propProjectId || initialData?.projectId || 0);
  const [formData, setFormData] = useState<SprintFormData>({
    name: initialData?.name || '',
    goal: initialData?.goal || '',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    projectId: initialData?.projectId || 0,
    status: initialData?.status || 'PLANNING',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(mode === 'edit');
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Cargar datos del sprint en modo edición
  useEffect(() => {
    const loadSprintData = async () => {
      if (mode === 'edit' && sprintId) {
        setIsLoadingData(true);
        try {
          const response = await authenticatedRequest(`${API_BASE_URL}/scrum/sprints/${sprintId}`);
          const sprint = response.sprint || response.data?.sprint || response;
          
          if (sprint) {
            setFormData({
              name: sprint.name || '',
              goal: sprint.goal || '',
              startDate: sprint.startDate ? sprint.startDate.split('T')[0] : '',
              endDate: sprint.endDate ? sprint.endDate.split('T')[0] : '',
              projectId: sprint.projectId || 0,
              status: sprint.status || 'PLANNING',
            });
            setProjectId(sprint.projectId || 0);
          }
        } catch (err: any) {
          setError(t('sprints.form.loadError', 'Error al cargar los datos del sprint'));
        } finally {
          setIsLoadingData(false);
        }
      }
    };

    loadSprintData();
  }, [mode, sprintId]);

  // Obtener projectId de la URL si no viene en initialData (modo crear)
  useEffect(() => {
    if (propProjectId) {
      setProjectId(propProjectId);
      setFormData(prev => ({ ...prev, projectId: propProjectId }));
    } else if (typeof window !== 'undefined' && mode === 'create' && !initialData?.projectId) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlProjectId = urlParams.get('projectId');
      if (urlProjectId) {
        const pid = parseInt(urlProjectId);
        setProjectId(pid);
        setFormData(prev => ({ ...prev, projectId: pid }));
      }
    }
  }, [propProjectId, initialData, mode]);

  // Calcular progreso del formulario
  const calculateProgress = () => {
    let completed = 0;
    const total = 5; // Total de campos importantes
    
    if (formData.name.trim()) completed++;
    if (formData.goal.trim()) completed++;
    if (formData.startDate) completed++;
    if (formData.endDate) completed++;
    if (formData.projectId > 0) completed++;
    
    return Math.round((completed / total) * 100);
  };

  const getFieldHelp = (field: string): string => {
    const helpTexts: Record<string, string> = {
      name: t('sprints.form.helpName', 'Nombra el sprint de forma clara. Ejemplo: "Sprint 1 - Autenticación" o "Sprint 3 - Dashboard Analytics"'),
      goal: t('sprints.form.helpGoal', 'Define el objetivo principal del sprint. ¿Qué valor o funcionalidad se entregará al finalizar? Debe ser medible y alcanzable.'),
      startDate: t('sprints.form.helpStartDate', 'Fecha de inicio del sprint. Usualmente es lunes. Los sprints típicamente duran 1-4 semanas.'),
      endDate: t('sprints.form.helpEndDate', 'Fecha de fin del sprint. Debe dar tiempo suficiente para completar las user stories planificadas.'),
      status: t('sprints.form.helpStatus', 'PLANNING: Planificando user stories. ACTIVE: Sprint en ejecución. COMPLETED: Sprint finalizado con retrospectiva.')
    };
    return helpTexts[field] || '';
  };

  const getSprintTemplates = () => [
    { name: 'Sprint 1 - Fundamentos y Autenticación', goal: 'Establecer la infraestructura base del proyecto e implementar el sistema de autenticación completo con roles y permisos.' },
    { name: 'Sprint 2 - Dashboard Principal', goal: 'Crear el dashboard principal con widgets de métricas clave, gráficos interactivos y navegación optimizada.' },
    { name: 'Sprint 3 - Módulos de Gestión', goal: 'Desarrollar módulos CRUD principales (usuarios, categorías, departamentos) con búsqueda y filtros avanzados.' },
    { name: 'Sprint 4 - Optimización y Testing', goal: 'Mejorar performance del sistema, implementar testing automatizado y resolver deuda técnica acumulada.' },
  ];

  const applyTemplate = (template: { name: string; goal: string }) => {
    setFormData(prev => ({
      ...prev,
      name: template.name,
      goal: template.goal
    }));
  };

  // Calcular duración del sprint en días
  const calculateDuration = (): number => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('sprints.form.errors.nameRequired', 'El nombre del sprint es obligatorio');
    } else if (formData.name.trim().length < 3) {
      newErrors.name = t('sprints.form.errors.nameMinLength', 'El nombre debe tener al menos 3 caracteres');
    } else if (formData.name.length > 100) {
      newErrors.name = t('sprints.form.errors.nameMaxLength', 'El nombre no puede exceder 100 caracteres');
    }

    if (!formData.goal?.trim()) {
      newErrors.goal = t('sprints.form.errors.goalRequired', 'El objetivo del sprint es obligatorio');
    } else if (formData.goal.trim().length < 10) {
      newErrors.goal = t('sprints.form.errors.goalMinLength', 'El objetivo debe tener al menos 10 caracteres');
    } else if (formData.goal.length > 500) {
      newErrors.goal = t('sprints.form.errors.goalMaxLength', 'El objetivo no puede exceder 500 caracteres');
    }

    if (!formData.startDate) {
      newErrors.startDate = t('sprints.form.errors.startDateRequired', 'La fecha de inicio es obligatoria');
    }

    if (!formData.endDate) {
      newErrors.endDate = t('sprints.form.errors.endDateRequired', 'La fecha de fin es obligatoria');
    }

    if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
      newErrors.endDate = t('sprints.form.errors.endDateAfterStart', 'La fecha de fin debe ser posterior a la fecha de inicio');
    }

    if (!formData.projectId || formData.projectId <= 0) {
      newErrors.projectId = t('sprints.form.errors.projectRequired', 'Debes seleccionar un proyecto');
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
      const url = mode === 'edit' && sprintId 
        ? `${API_BASE_URL}/scrum/sprints/${sprintId}`
        : `${API_BASE_URL}/scrum/sprints`;
      
      const method = mode === 'edit' ? 'PUT' : 'POST';
      
      const response = await authenticatedRequest(url, {
        method,
        body: JSON.stringify(formData)
      });
      
      setSuccess(true);
      
      // Disparar evento para actualizar componentes relacionados
      const sprint = response.sprint || response.data?.sprint;
      if (sprint) {
        if (mode === 'edit') {
          window.dispatchEvent(new CustomEvent('sprint:updated', { detail: { sprint } }));
        } else {
          window.dispatchEvent(new CustomEvent('sprint:created', { detail: { sprint } }));
        }
      }
      
      if (asModal && onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 500);
      } else {
        setTimeout(() => {
          window.location.href = `/proyectos/detalle?id=${formData.projectId}`;
        }, 1500);
      }
      
    } catch (err: any) {
      setError(err.message || t('sprints.form.saveError', 'Error al guardar el sprint'));
    } finally {
      setIsLoading(false);
    }
  };

  // Mostrar loading mientras se cargan los datos en modo edición
  if (isLoadingData) {
    if (asModal) {
      return (
        <div className="h-full flex items-center justify-center p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('sprints.form.loadingData', 'Cargando datos del sprint...')}</p>
          </div>
        </div>
      );
    }
    return (
      <AppSidebarLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('sprints.form.loadingData', 'Cargando datos del sprint...')}</p>
          </div>
        </div>
      </AppSidebarLayout>
    );
  }

  const content = (
    <div className={asModal ? 'flex flex-col h-full min-h-0' : 'h-full flex flex-col'}>
      {/* Header del Modal */}
      {asModal && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">
              {mode === 'edit' ? t('sprints.editSprint', 'Editar Sprint') : t('sprints.form.createTitle', 'Crear Nuevo Sprint')}
            </h2>
            <p className="text-indigo-100 text-sm mt-1">
              {t('sprints.form.subtitle', 'Los sprints son iteraciones de trabajo de duración fija (1-4 semanas)')}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Breadcrumbs - Solo si no es modal */}
      {!asModal && (
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
                {projectId > 0 && (
                  <>
                    <a href={`/proyectos/detalle?id=${projectId}`} className="text-[#777777] hover:text-[#0264C5] transition-colors duration-200">
                      Proyecto #{projectId}
                    </a>
                    <svg className="w-4 h-4 text-[#777777]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
                <span className="text-[#0264C5] font-chatgpt-medium">
                  {mode === 'edit' ? t('sprints.editSprint', 'Editar Sprint') : t('sprints.newSprint', 'Nuevo Sprint')}
                </span>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Header - Solo si no es modal */}
      {!asModal && (
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex justify-center">
            <div className="max-w-7xl w-full">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-2xl font-chatgpt-semibold text-gray-900 flex items-center space-x-2">
                    <span>{mode === 'edit' ? t('sprints.editSprint', 'Editar Sprint') : t('sprints.form.createTitle', 'Crear Nuevo Sprint')}</span>
                    {mode === 'create' && (
                      <span className="text-lg">🏃</span>
                    )}
                  </h1>
                  <p className="text-sm text-[#777777] mt-1">
                    {mode === 'edit' 
                      ? t('sprints.form.editSubtitle', 'Modifica la información del sprint')
                      : t('sprints.form.subtitle', 'Los sprints son iteraciones de trabajo de duración fija (1-4 semanas)')}
                  </p>
                  
                  {/* Barra de progreso */}
                  {mode === 'create' && !success && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-chatgpt-medium text-gray-700">
                          Progreso del formulario
                        </span>
                        <span className="text-xs font-chatgpt-semibold text-indigo-600">
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
                
                <button
                  onClick={() => setShowHelp(!showHelp)}
                  className="ml-4 bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 text-purple-700 px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-300 flex items-center space-x-2 hover:scale-105 active:scale-95"
                  title={t('sprints.form.viewHelp', 'Ver ayuda')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="hidden sm:inline">{t('epics.form.help', 'Ayuda')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulario */}
      <div className={asModal ? 'flex-1 overflow-y-auto p-6 min-h-0' : 'flex-1 bg-gradient-to-br from-[#F2ECDF] to-gray-50 px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto'}>
          <div className={asModal ? 'w-full space-y-4' : 'flex justify-center'}>
            <div className={asModal ? 'w-full space-y-4' : 'max-w-4xl w-full space-y-4'}>
              
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
                        <h3 className="text-lg font-chatgpt-semibold text-gray-900">{t('sprints.form.helpGuide', 'Guía Rápida - Sprints')}</h3>
                        <p className="text-sm text-[#777777]">{t('sprints.form.helpTips', 'Mejores prácticas para sprints efectivos')}</p>
                      </div>
                    </div>
                    <button
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
                      <p><strong>{t('sprints.form.helpFixedDuration', 'Duración fija')}:</strong> {t('sprints.form.helpFixedDurationDesc', 'Los sprints típicamente duran 1-4 semanas. Dos semanas es lo más común.')}</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <p><strong>{t('sprints.form.helpClearGoal', 'Objetivo claro')}:</strong> {t('sprints.form.helpClearGoalDesc', 'Define qué valor o funcionalidad se entregará al finalizar el sprint.')}</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <p><strong>{t('sprints.form.helpPlanning', 'Sprint Planning')}:</strong> {t('sprints.form.helpPlanningDesc', 'Selecciona user stories del backlog y desglósalas en tareas.')}</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-blue-500 mt-1">💡</span>
                      <p><strong>{t('sprints.form.helpNextStep', 'Siguiente paso')}:</strong> {t('sprints.form.helpNextStepDesc', 'Después de crear el sprint, asigna user stories desde el backlog del proyecto.')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Plantillas Rápidas */}
              {mode === 'create' && !formData.name && (
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl shadow-sm border border-orange-200 p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <h3 className="text-lg font-chatgpt-semibold text-gray-900">{t('sprints.form.templatesTitle', 'Plantillas de Sprints')}</h3>
                  </div>
                  <p className="text-sm text-gray-700 mb-4">{t('sprints.form.templatesDesc', 'Comienza con una plantilla predefinida según la fase del proyecto')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {getSprintTemplates().map((template, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => applyTemplate(template)}
                        className="text-left p-4 bg-white border-2 border-orange-200 hover:border-orange-400 rounded-xl transition-all hover:shadow-md group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-chatgpt-semibold text-gray-900 mb-1 group-hover:text-[#0264C5] transition-colors text-sm">
                              {template.name}
                            </h4>
                            <p className="text-xs text-gray-600 line-clamp-2">{template.goal}</p>
                          </div>
                          <svg className="w-5 h-5 text-orange-500 group-hover:text-orange-700 transition-colors flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        {mode === 'edit' ? t('sprints.form.successUpdate', '¡Sprint actualizado exitosamente!') : t('sprints.form.successCreate', '¡Sprint creado exitosamente!')}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Nombre */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="name" className="flex items-center text-sm font-chatgpt-medium text-gray-700">
                        <svg className="w-5 h-5 text-[#0264C5] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {t('sprints.form.nameLabel', 'Nombre del Sprint')} <span className="text-red-500 ml-1">*</span>
                      </label>
                      <span className={`text-xs ${formData.name.length > 80 ? 'text-orange-600 font-chatgpt-semibold' : 'text-gray-500'}`}>
                        {formData.name.length}/100
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setFocusedField(null)}
                        maxLength={100}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-[#0264C5] focus:border-transparent transition-all ${
                          errors.name ? 'border-red-300' : formData.name ? 'border-green-300 bg-green-50/30' : 'border-gray-300'
                        }`}
                        placeholder={t('sprints.form.namePlaceholder', 'Ej: Sprint 1 - Mejoras de UX')}
                      />
                      {formData.name && !errors.name && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{errors.name}</span>
                      </p>
                    )}
                    {focusedField === 'name' && !errors.name && (
                      <p className="mt-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
                        💡 {getFieldHelp('name')}
                      </p>
                    )}
                  </div>

                  {/* Objetivo */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="goal" className="flex items-center text-sm font-chatgpt-medium text-gray-700">
                        <svg className="w-5 h-5 text-[#0264C5] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        {t('sprints.goal', 'Objetivo del Sprint')} <span className="text-red-500 ml-1">*</span>
                      </label>
                      <span className={`text-xs ${formData.goal.length > 400 ? 'text-orange-600 font-chatgpt-semibold' : 'text-gray-500'}`}>
                        {formData.goal.length}/500
                      </span>
                    </div>
                    <textarea
                      id="goal"
                      name="goal"
                      value={formData.goal}
                      onChange={handleInputChange}
                      onFocus={() => setFocusedField('goal')}
                      onBlur={() => setFocusedField(null)}
                      maxLength={500}
                      rows={4}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-[#0264C5] focus:border-transparent transition-all resize-none ${
                        errors.goal ? 'border-red-300' : formData.goal ? 'border-green-300 bg-green-50/30' : 'border-gray-300'
                      }`}
                      placeholder={t('sprints.form.goalPlaceholder', 'Define el objetivo principal que se busca alcanzar en este sprint...')}
                    />
                    {errors.goal && (
                      <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{errors.goal}</span>
                      </p>
                    )}
                    {focusedField === 'goal' && !errors.goal && (
                      <p className="mt-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
                        💡 {getFieldHelp('goal')}
                      </p>
                    )}
                  </div>

                  {/* Fechas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="startDate" className="flex items-center text-sm font-chatgpt-medium text-gray-700 mb-2">
                        <svg className="w-5 h-5 text-[#0264C5] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {t('sprints.form.startDateLabel', 'Fecha de Inicio')} <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          id="startDate"
                          name="startDate"
                          value={formData.startDate}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField('startDate')}
                          onBlur={() => setFocusedField(null)}
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-[#0264C5] focus:border-transparent transition-all ${
                            errors.startDate ? 'border-red-300' : formData.startDate ? 'border-green-300 bg-green-50/30' : 'border-gray-300'
                          }`}
                        />
                        {formData.startDate && !errors.startDate && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {errors.startDate && (
                        <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{errors.startDate}</span>
                        </p>
                      )}
                      {focusedField === 'startDate' && !errors.startDate && (
                        <p className="mt-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
                          💡 {getFieldHelp('startDate')}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="endDate" className="flex items-center text-sm font-chatgpt-medium text-gray-700 mb-2">
                        <svg className="w-5 h-5 text-[#0264C5] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        {t('sprints.form.endDateLabel', 'Fecha de Fin')} <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          id="endDate"
                          name="endDate"
                          value={formData.endDate}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField('endDate')}
                          onBlur={() => setFocusedField(null)}
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-[#0264C5] focus:border-transparent transition-all ${
                            errors.endDate ? 'border-red-300' : formData.endDate ? 'border-green-300 bg-green-50/30' : 'border-gray-300'
                          }`}
                        />
                        {formData.endDate && !errors.endDate && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {errors.endDate && (
                        <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{errors.endDate}</span>
                        </p>
                      )}
                      {focusedField === 'endDate' && !errors.endDate && (
                        <p className="mt-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
                          💡 {getFieldHelp('endDate')}
                        </p>
                      )}
                      {formData.startDate && formData.endDate && calculateDuration() > 0 && (
                        <p className="mt-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg p-2 flex items-center space-x-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{t('sprints.duration', 'Duración')}: <strong>{calculateDuration()} {t('sprints.days', 'días')}</strong> ({Math.ceil(calculateDuration() / 7)} {t('sprints.weeks', 'semanas')})</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Estado */}
                  <div>
                    <label htmlFor="status" className="flex items-center text-sm font-chatgpt-medium text-gray-700 mb-2">
                      <svg className="w-5 h-5 text-[#0264C5] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('sprints.statusLabel', 'Estado del Sprint')}
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
                        <option value="PLANNING">📋 {t('sprints.status.planning', 'Planificación')}</option>
                        <option value="ACTIVE">🏃 {t('sprints.status.active', 'Activo')}</option>
                        <option value="COMPLETED">🎉 {t('sprints.status.completed', 'Completado')}</option>
                        <option value="CANCELLED">❌ {t('sprints.status.cancelled', 'Cancelado')}</option>
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
                </div>

                {/* Resumen antes de guardar */}
                {mode === 'create' && formData.name && formData.goal && formData.startDate && formData.endDate && (
                  <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-chatgpt-semibold text-gray-900 mb-2">{t('sprints.form.readyToCreate', '¡Todo listo para crear!')}</h4>
                        <p className="text-sm text-gray-700">
                          {t('sprints.form.sprintComplete', 'Tu sprint "{{name}}" está completo al', { name: formData.name })} <strong>{calculateProgress()}%</strong> {t('sprints.form.withDuration', 'con una duración de')} <strong>{calculateDuration()} {t('sprints.days', 'días')}</strong>.
                          {calculateProgress() === 100 ? ` ${t('sprints.form.perfect', '¡Perfecto!')}` : ''} 
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
                      href={projectId > 0 ? `/proyectos/detalle?id=${projectId}` : '/proyectos'}
                      className="bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 px-6 py-3 rounded-xl font-chatgpt-medium transition-all duration-300 hover:scale-105 active:scale-95 text-center flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>{t('common.cancel', 'Cancelar')}</span>
                    </a>
                    <button
                      type="submit"
                      disabled={isLoading || success}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-2xl text-white px-8 py-3 rounded-xl font-chatgpt-semibold transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center space-x-2 shadow-lg"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>{mode === 'edit' ? t('sprints.form.updating', 'Actualizando...') : t('sprints.form.creating', 'Creando Sprint...')}</span>
                        </>
                      ) : success ? (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{t('sprints.form.savedSuccessfully', '¡Guardado Exitosamente!')}</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{mode === 'edit' ? t('sprints.form.updateSprint', 'Actualizar Sprint') : t('sprints.createSprint', 'Crear Sprint')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
          </div>
        </div>
      </div>
    </div>
  );

  // Si es modal y no está abierto, no renderizar nada
  if (asModal && !isOpen) {
    return null;
  }

  // Si es modal, envolver en contenedor de modal con overlay
  if (asModal) {
    return (
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto"
        onClick={(e) => {
          // Cerrar modal si se hace clic en el overlay (no en el contenido)
          if (e.target === e.currentTarget && onClose) {
            onClose();
          }
        }}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <AppSidebarLayout>
      {content}
    </AppSidebarLayout>
  );
};

export default SprintFormImproved;

