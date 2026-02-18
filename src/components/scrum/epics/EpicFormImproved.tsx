import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppSidebarLayout from '../../layout/AppSidebarLayout';
import { API_BASE_URL, authenticatedRequest } from '../../../config/api';

interface EpicFormData {
  title: string;
  description: string;
  projectId: number;
  status: 'DRAFT' | 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  businessValue?: string;
}

interface EpicFormImprovedProps {
  initialData?: Partial<EpicFormData>;
  epicId?: string;
  mode?: 'create' | 'edit';
  asModal?: boolean;
  onSuccess?: () => void;
  onClose?: () => void;
}

const EpicFormImproved: React.FC<EpicFormImprovedProps> = ({ 
  initialData, 
  epicId,
  mode = 'create',
  asModal = false,
  onSuccess,
  onClose
}) => {
  const { t } = useTranslation();
  const [projectId, setProjectId] = useState<number>(initialData?.projectId || 0);
  const [formData, setFormData] = useState<EpicFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    projectId: initialData?.projectId || 0,
    status: initialData?.status || 'DRAFT',
    priority: initialData?.priority || 'MEDIUM',
    businessValue: initialData?.businessValue || '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Obtener projectId de la URL si no viene en initialData
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Si ya tenemos projectId de initialData, usarlo
      if (initialData?.projectId && initialData.projectId > 0) {
        setProjectId(initialData.projectId);
        setFormData(prev => ({ ...prev, projectId: initialData.projectId! }));
      } else {
        // Si no, intentar obtenerlo de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const urlProjectId = urlParams.get('projectId') || urlParams.get('id');
        if (urlProjectId) {
          const pid = parseInt(urlProjectId);
          if (!isNaN(pid) && pid > 0) {
            setProjectId(pid);
            setFormData(prev => ({ ...prev, projectId: pid }));
          }
        }
      }
    }
  }, [initialData]);

  // Actualizar formData cuando initialData cambia (modo edit)
  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData(prev => ({
        ...prev,
        title: initialData.title || prev.title,
        description: initialData.description || prev.description,
        projectId: initialData.projectId || prev.projectId,
        status: initialData.status || prev.status,
        priority: initialData.priority || prev.priority,
        businessValue: initialData.businessValue || prev.businessValue,
      }));
      if (initialData.projectId) {
        setProjectId(initialData.projectId);
      }
    }
  }, [initialData, mode]);

  // Calcular progreso del formulario
  const calculateProgress = () => {
    let completed = 0;
    const total = 5; // Total de campos importantes
    
    if (formData.title.trim()) completed++;
    if (formData.description.trim()) completed++;
    if (formData.projectId > 0) completed++;
    if (formData.status) completed++;
    if (formData.priority) completed++;
    
    return Math.round((completed / total) * 100);
  };

  const getFieldHelp = (field: string): string => {
    const helpTexts: Record<string, string> = {
      title: t('epics.form.helpTitle', 'Define un título claro y descriptivo. Ejemplo: "Implementar módulo de autenticación con OAuth"'),
      description: t('epics.form.helpDescription', 'Describe los objetivos, alcance y criterios de aceptación del epic. Incluye el valor que aporta.'),
      status: t('epics.form.helpStatus', 'DRAFT: Borrador en planificación. READY: Listo para iniciar. IN_PROGRESS: En ejecución activa. COMPLETED: Finalizado. CANCELLED: Cancelado.'),
      priority: t('epics.form.helpPriority', 'Define la importancia según impacto en el negocio y urgencia. CRITICAL: Bloquea otros trabajos.'),
      businessValue: t('epics.form.helpBusinessValue', 'Explica cómo este epic aporta valor al negocio o resuelve un problema específico del usuario.')
    };
    return helpTexts[field] || '';
  };

  const getEpicTemplates = () => [
    { title: 'Módulo de Autenticación y Seguridad', description: 'Implementar sistema completo de autenticación de usuarios con soporte para múltiples roles y permisos, incluyendo login, registro, recuperación de contraseña y gestión de sesiones.' },
    { title: 'Dashboard de Reportes y Analítica', description: 'Crear panel de control con métricas clave del negocio, gráficos interactivos y capacidad de exportar reportes en múltiples formatos.' },
    { title: 'API RESTful de Integración', description: 'Desarrollar API completa para integración con sistemas externos, incluyendo documentación, versionado y manejo de autenticación.' },
    { title: 'Optimización de Performance', description: 'Mejorar tiempos de respuesta del sistema, implementar caching, optimizar consultas a base de datos y reducir carga del servidor.' },
  ];

  const applyTemplate = (template: { title: string; description: string }) => {
    setFormData(prev => ({
      ...prev,
      title: template.title,
      description: template.description
    }));
    setShowTemplates(false); // Ocultar plantillas después de seleccionar una
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = t('epics.form.errors.titleRequired', 'El título de la épica es obligatorio');
    } else if (formData.title.trim().length < 5) {
      newErrors.title = t('epics.form.errors.titleMinLength', 'El título debe tener al menos 5 caracteres');
    } else if (formData.title.length > 200) {
      newErrors.title = t('epics.form.errors.titleMaxLength', 'El título no puede exceder 200 caracteres');
    }

    if (!formData.description?.trim()) {
      newErrors.description = t('epics.form.errors.descriptionRequired', 'La descripción es obligatoria');
    } else if (formData.description.trim().length < 10) {
      newErrors.description = t('epics.form.errors.descriptionMinLength', 'La descripción debe tener al menos 10 caracteres');
    } else if (formData.description.length > 1000) {
      newErrors.description = t('epics.form.errors.descriptionMaxLength', 'La descripción no puede exceder 1000 caracteres');
    }

    if (!formData.projectId || formData.projectId <= 0) {
      newErrors.projectId = t('epics.form.errors.projectRequired', 'Debes seleccionar un proyecto');
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
      const url = mode === 'edit' && epicId 
        ? API_BASE_URL + '/scrum/epics/' + epicId
        : API_BASE_URL + '/scrum/epics';
      
      const method = mode === 'edit' ? 'PUT' : 'POST';
      
      const response = await authenticatedRequest(url, {
        method,
        body: JSON.stringify(formData)
      });
      
      setSuccess(true);
      
      if (asModal && onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setTimeout(() => {
          window.location.href = '/proyectos/detalle?id=' + formData.projectId;
        }, 1500);
      }
      
    } catch (err: any) {
      setError(err.message || t('epics.saveError', 'Error al guardar la épica'));
    } finally {
      setIsLoading(false);
    }
  };

  const formContent = (
    <div className={asModal ? '' : 'h-full flex flex-col'}>
      {asModal && (
        <>
          {/* Header para modal */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-chatgpt-semibold text-gray-900 flex items-center space-x-2">
                  <span>{mode === 'edit' ? t('epics.form.editTitle', 'Editar Epic') : t('epics.form.createTitle', 'Crear Nuevo Epic')}</span>
                  {mode === 'create' && (
                    <span className="text-lg">⚡</span>
                  )}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {mode === 'edit' 
                    ? t('epics.form.editSubtitle', 'Modifica la información del epic')
                    : t('epics.form.createSubtitle', 'Los epics son grandes funcionalidades que se dividen en user stories')}
                </p>
                
                {/* Barra de progreso */}
                {mode === 'create' && !success && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-chatgpt-medium text-gray-700">
                        {t('epics.form.progress', 'Progreso del formulario')}
                      </span>
                      <span className="text-xs font-chatgpt-semibold text-indigo-600">
                        {calculateProgress()}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: calculateProgress() + '%' }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                {mode === 'create' && (
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border-2 border-purple-200 hover:border-purple-300 text-purple-700 px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-300 flex items-center space-x-2 hover:scale-105 active:scale-95"
                    title={t('epics.form.viewTemplates', 'Ver plantillas')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="hidden sm:inline">{showTemplates ? t('epics.form.hide', 'Ocultar') : t('epics.form.templates', 'Plantillas')}</span>
                  </button>
                )}
                <button
                  onClick={() => setShowHelp(!showHelp)}
                  className="bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 text-purple-700 px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-300 flex items-center space-x-2 hover:scale-105 active:scale-95"
                  title={t('epics.form.viewHelp', 'Ver ayuda')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="hidden sm:inline">{t('epics.form.help', 'Ayuda')}</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      {!asModal && (
        <>
          {/* Breadcrumbs */}
          <div className="bg-gradient-to-r from-[#F2ECDF] to-gray-50 border-b border-gray-200 px-4 sm:px-6 py-3">
            <div className="flex justify-center">
              <div className="max-w-7xl w-full">
                <nav className="flex items-center space-x-2 text-sm">
                  <a href="/proyectos" className="text-[#777777] hover:text-[#0264C5] transition-colors duration-200">
                    {t('projects.title', 'Proyectos')}
                  </a>
                  <svg className="w-4 h-4 text-[#777777]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {projectId > 0 && (
                    <>
                      <a href={'/proyectos/detalle?id=' + projectId} className="text-[#777777] hover:text-[#0264C5] transition-colors duration-200">
                        {t('projects.title', 'Proyecto')} #{projectId}
                      </a>
                      <svg className="w-4 h-4 text-[#777777]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                  <span className="text-[#0264C5] font-chatgpt-medium">
                    {mode === 'edit' ? t('epics.form.editTitle', 'Editar Epic') : t('epics.form.newEpic', 'Nuevo Epic')}
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
                      <span>{mode === 'edit' ? t('epics.form.editTitle', 'Editar Epic') : t('epics.form.createTitle', 'Crear Nuevo Epic')}</span>
                      {mode === 'create' && (
                        <span className="text-lg">⚡</span>
                      )}
                    </h1>
                    <p className="text-sm text-[#777777] mt-1">
                      {mode === 'edit' 
                        ? t('epics.form.editSubtitle', 'Modifica la información del epic')
                        : t('epics.form.createSubtitle', 'Los epics son grandes funcionalidades que se dividen en user stories')}
                    </p>
                    
                    {/* Barra de progreso */}
                    {mode === 'create' && !success && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-chatgpt-medium text-gray-700">
                            {t('epics.form.progress', 'Progreso del formulario')}
                          </span>
                          <span className="text-xs font-chatgpt-semibold text-[#0264C5]">
                            {calculateProgress()}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
                            style={{ width: calculateProgress() + '%' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {mode === 'create' && (
                      <button
                        onClick={() => setShowTemplates(!showTemplates)}
                        className="bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border-2 border-purple-200 hover:border-purple-300 text-purple-700 px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-300 flex items-center space-x-2 hover:scale-105 active:scale-95"
                        title={t('epics.form.viewTemplates', 'Ver plantillas')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="hidden sm:inline">{showTemplates ? t('epics.form.hide', 'Ocultar') : t('epics.form.templates', 'Plantillas')}</span>
                      </button>
                    )}
                    <button
                      onClick={() => setShowHelp(!showHelp)}
                      className="bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 text-purple-700 px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-300 flex items-center space-x-2 hover:scale-105 active:scale-95"
                      title={t('epics.form.viewHelp', 'Ver ayuda')}
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
          </div>
        </>
      )}

      {/* Formulario */}
      <div className={asModal ? 'p-6' : 'flex-1 bg-gradient-to-br from-[#F2ECDF] to-gray-50 px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto'}>
        <div className={asModal ? '' : 'flex justify-center'}>
          <div className={(asModal ? 'w-full' : 'max-w-4xl w-full') + ' space-y-4'}>
              
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
                        <h3 className="text-lg font-chatgpt-semibold text-gray-900">{t('epics.form.helpGuide', 'Guía Rápida - Epics')}</h3>
                        <p className="text-sm text-[#777777]">{t('epics.form.helpTips', 'Consejos para crear un epic efectivo')}</p>
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
                      <p><strong>{t('epics.form.helpWhatIs', '¿Qué es un Epic?')}</strong> {t('epics.form.helpWhatIsDesc', 'Una funcionalidad grande que se divide en múltiples user stories para su implementación')}</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <p><strong>{t('epics.form.helpClearTitle', 'Título claro')}:</strong> {t('epics.form.helpClearTitleDesc', 'Debe describir la funcionalidad principal de forma concisa')}</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <p><strong>{t('epics.form.helpCompleteDesc', 'Descripción completa')}:</strong> {t('epics.form.helpCompleteDescDesc', 'Incluye objetivos, alcance, criterios de aceptación y valor de negocio')}</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-blue-500 mt-1">💡</span>
                      <p><strong>{t('epics.form.helpNextStep', 'Siguiente paso')}:</strong> {t('epics.form.helpNextStepDesc', 'Después de crear el epic, defínelo mejor creando user stories asociadas')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Plantillas Rápidas */}
              {mode === 'create' && showTemplates && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl shadow-sm border border-purple-200 p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <h3 className="text-lg font-chatgpt-semibold text-gray-900">{t('epics.form.templatesTitle', 'Plantillas de Epics')}</h3>
                  </div>
                  <p className="text-sm text-gray-700 mb-4">{t('epics.form.templatesDesc', 'Comienza con una plantilla predefinida y adáptala a tus necesidades')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {getEpicTemplates().map((template, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => applyTemplate(template)}
                        className="text-left p-4 bg-white border-2 border-purple-200 hover:border-purple-400 rounded-xl transition-all hover:shadow-md group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-chatgpt-semibold text-gray-900 mb-1 group-hover:text-[#0264C5] transition-colors text-sm">
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

              <form onSubmit={handleSubmit} className={asModal ? 'space-y-6' : 'bg-white rounded-2xl shadow-sm border border-gray-200 p-6'}>
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
                        {mode === 'edit' ? t('epics.form.successUpdate', '¡Epic actualizado exitosamente!') : t('epics.form.successCreate', '¡Epic creado exitosamente!')}
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {t('epics.form.titleLabel', 'Título del Epic')} <span className="text-red-500 ml-1">*</span>
                    </label>
                      <span className={`text-xs ${formData.title.length > 160 ? 'text-orange-600 font-chatgpt-semibold' : 'text-gray-500'}`}>
                        {formData.title.length + ' / 200'}
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
                          errors.title ? 'border-red-300' : formData.title ? 'border-green-300 bg-green-50' : 'border-gray-300'
                        }`}
                        placeholder={t('epics.form.titlePlaceholder', 'Ej: Implementar módulo de autenticación con OAuth')}
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
                        {t('epics.form.descriptionLabel', 'Descripción')} <span className="text-red-500 ml-1">*</span>
                    </label>
                      <span className={`text-xs ${formData.description.length > 800 ? 'text-orange-600 font-chatgpt-semibold' : 'text-gray-500'}`}>
                        {formData.description.length + ' / 1000'}
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
                      rows={6}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-[#0264C5] focus:border-transparent transition-all resize-none ${
                        errors.description ? 'border-red-300' : formData.description ? 'border-green-300 bg-green-50' : 'border-gray-300'
                      }`}
                      placeholder={t('epics.form.descriptionPlaceholder', 'Describe los objetivos, alcance, criterios de aceptación y valor de negocio del epic...')}
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

                  {/* Estado y Prioridad */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="status" className="flex items-center text-sm font-chatgpt-medium text-gray-700 mb-2">
                        <svg className="w-5 h-5 text-[#0264C5] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {t('epics.form.statusLabel', 'Estado del Epic')}
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
                          <option value="DRAFT">📝 {t('epics.status.draft', 'Borrador')}</option>
                          <option value="READY">✅ {t('epics.status.ready', 'Listo')}</option>
                          <option value="IN_PROGRESS">🚀 {t('epics.status.inProgress', 'En Progreso')}</option>
                          <option value="COMPLETED">🎉 {t('epics.status.completed', 'Completado')}</option>
                          <option value="CANCELLED">❌ {t('epics.status.cancelled', 'Cancelado')}</option>
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
                        {t('epics.priority', 'Prioridad')}
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
                          <option value="LOW">🟢 {t('epics.priority.low', 'Baja')}</option>
                          <option value="MEDIUM">🟡 {t('epics.priority.medium', 'Media')}</option>
                          <option value="HIGH">🟠 {t('epics.priority.high', 'Alta')}</option>
                          <option value="CRITICAL">🔴 {t('epics.priority.critical', 'Crítica')}</option>
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

                  {/* Valor de Negocio */}
                  <div>
                    <label htmlFor="businessValue" className="flex items-center text-sm font-chatgpt-medium text-gray-700 mb-2">
                      <svg className="w-5 h-5 text-[#0264C5] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('epics.businessValue', 'Valor de Negocio')} <span className="text-gray-400 text-xs font-normal ml-1">({t('epics.form.optional', 'opcional')})</span>
                    </label>
                    <input
                      type="text"
                      id="businessValue"
                      name="businessValue"
                      value={formData.businessValue}
                      onChange={handleInputChange}
                      onFocus={() => setFocusedField('businessValue')}
                      onBlur={() => setFocusedField(null)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0264C5] focus:border-transparent transition-all"
                      placeholder={t('epics.form.businessValuePlaceholder', 'Describe el valor que aporta este epic al negocio o problema que resuelve')}
                    />
                    {focusedField === 'businessValue' && (
                      <p className="mt-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
                        💡 {getFieldHelp('businessValue')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Resumen antes de guardar */}
                {mode === 'create' && formData.title && formData.description && formData.projectId > 0 && (
                  <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-chatgpt-semibold text-gray-900 mb-2">{t('epics.form.readyToCreate', '¡Todo listo para crear!')}</h4>
                        <p className="text-sm text-gray-700">
                          {t('epics.form.epicComplete', 'Tu epic "{{title}}" está completo al', { title: formData.title })} <strong>{calculateProgress()}%</strong>. 
                          {calculateProgress() === 100 ? ' ' + t('epics.form.perfect', '¡Perfecto!') + ' ' : ' '}
                          {t('epics.form.canSave', 'Puedes guardar ahora o agregar más detalles.')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botones */}
                <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-3">
                  <div className="text-sm text-gray-600">
                    <span className="font-chatgpt-medium">{t('epics.form.tip', 'Tip')}:</span> {t('epics.form.useTab', 'Usa')} <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs">Tab</kbd> {t('epics.form.navigateFields', 'para navegar entre campos')}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    {asModal && onClose ? (
                      <button
                        type="button"
                        onClick={onClose}
                        className="bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 px-6 py-3 rounded-xl font-chatgpt-medium transition-all duration-300 hover:scale-105 active:scale-95 text-center flex items-center justify-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>{t('common.cancel', 'Cancelar')}</span>
                      </button>
                    ) : (
                      <a
                        href={projectId > 0 ? '/proyectos/detalle?id=' + projectId : '/proyectos'}
                        className="bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 px-6 py-3 rounded-xl font-chatgpt-medium transition-all duration-300 hover:scale-105 active:scale-95 text-center flex items-center justify-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>{t('common.cancel', 'Cancelar')}</span>
                      </a>
                    )}
                    <button
                      type="submit"
                      disabled={isLoading || success}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-2xl text-white px-8 py-3 rounded-xl font-chatgpt-semibold transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center space-x-2 shadow-lg"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>{mode === 'edit' ? t('epics.form.updating', 'Actualizando...') : t('epics.form.creating', 'Creando Epic...')}</span>
                        </>
                      ) : success ? (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{t('epics.form.savedSuccessfully', '¡Guardado Exitosamente!')}</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span>{mode === 'edit' ? t('epics.form.updateEpic', 'Actualizar Epic') : t('epics.form.createEpic', 'Crear Epic')}</span>
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

  if (asModal) {
    return <>{formContent}</>;
  }

  return (
    <AppSidebarLayout>
      {formContent}
    </AppSidebarLayout>
  );
};

export default EpicFormImproved;
