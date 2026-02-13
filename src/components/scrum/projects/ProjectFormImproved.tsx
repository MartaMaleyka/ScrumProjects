import React, { useState } from 'react';
import AppSidebarLayout from '../../layout/AppSidebarLayout';
import { API_BASE_URL, authenticatedRequest } from '../../../config/api';

interface ProjectFormData {
  name: string;
  description: string;
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  startDate: string;
  endDate: string;
}

interface ProjectFormImprovedProps {
  initialData?: Partial<ProjectFormData>;
  projectId?: string;
  mode?: 'create' | 'edit';
}

const ProjectFormImproved: React.FC<ProjectFormImprovedProps> = ({ 
  initialData, 
  projectId,
  mode = 'create' 
}) => {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    status: initialData?.status || 'PLANNING',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Calcular progreso del formulario
  const calculateProgress = () => {
    let completed = 0;
    const total = 5; // Total de campos importantes
    
    if (formData.name.trim()) completed++;
    if (formData.description.trim()) completed++;
    if (formData.status) completed++;
    if (formData.startDate) completed++;
    if (formData.endDate) completed++;
    
    return Math.round((completed / total) * 100);
  };

  const getFieldHelp = (field: string): string => {
    const helpTexts: Record<string, string> = {
      name: 'Elige un nombre descriptivo y fácil de identificar. Ejemplo: "Sistema de Gestión de RRHH"',
      description: 'Describe el objetivo principal, alcance y beneficios esperados del proyecto. Sé específico.',
      status: 'PLANNING: Fase inicial de planificación. ACTIVE: Proyecto en ejecución. ON_HOLD: Temporalmente pausado.',
      startDate: 'Fecha en la que el proyecto comenzará oficialmente. Usualmente después de la fase de planificación.',
      endDate: 'Fecha estimada de finalización. Puede dejarse vacía si aún no se ha determinado.'
    };
    return helpTexts[field] || '';
  };

  const getProjectTemplates = () => [
    { name: 'Sistema de Gestión de Tickets', description: 'Plataforma para gestionar solicitudes y tickets de soporte interno' },
    { name: 'Portal de Recursos Humanos', description: 'Sistema integrado para gestión de expedientes y procesos de RRHH' },
    { name: 'Aplicación Móvil Institucional', description: 'App móvil para acceso a servicios institucionales' },
    { name: 'Dashboard de Analítica', description: 'Panel de métricas y reportes para toma de decisiones' },
  ];

  const applyTemplate = (template: { name: string; description: string }) => {
    setFormData(prev => ({
      ...prev,
      name: template.name,
      description: template.description
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del proyecto es obligatorio';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'El nombre debe tener al menos 3 caracteres';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'El nombre no puede exceder 100 caracteres';
    }

    if (formData.description.trim().length > 500) {
      newErrors.description = 'La descripción no puede exceder 500 caracteres';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'La fecha de inicio es obligatoria';
    }

    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      if (endDate <= startDate) {
        newErrors.endDate = 'La fecha de fin debe ser posterior a la fecha de inicio';
      }
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
      const url = mode === 'edit' && projectId 
        ? `${API_BASE_URL}/scrum/projects/${projectId}`
        : `${API_BASE_URL}/scrum/projects`;
      
      const method = mode === 'edit' ? 'PUT' : 'POST';
      
      // Preparar datos para enviar - convertir strings vacíos de fechas en null
      const dataToSend = {
        ...formData,
        startDate: formData.startDate ? formData.startDate : null,
        endDate: formData.endDate ? formData.endDate : null,
      };
      
      
      const response = await authenticatedRequest(url, {
        method,
        body: JSON.stringify(dataToSend)
      });
      
      setSuccess(true);
      
      setTimeout(() => {
        if (mode === 'edit' && projectId) {
          window.location.href = `/proyectos/detalle?id=${projectId}`;
        } else if (response.project?.id) {
          window.location.href = `/proyectos/detalle?id=${response.project.id}`;
        } else {
          window.location.href = '/proyectos';
        }
      }, 1500);
      
    } catch (err: any) {
      setError(err.message || 'Error al guardar el proyecto');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppSidebarLayout>
      <div className="h-full flex flex-col">
        {/* Breadcrumbs */}
        <div className="bg-gradient-to-r from-cream to-gray-50 border-b border-gray-200 px-4 sm:px-6 py-3">
          <div className="flex justify-center">
            <div className="max-w-7xl w-full">
              <nav className="flex items-center space-x-2 text-sm">
                <a href="/proyectos" className="text-gray-neutral hover:text-blue-deep transition-colors duration-200">
                  Proyectos
                </a>
                <svg className="w-4 h-4 text-gray-neutral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-blue-deep font-chatgpt-medium">
                  {mode === 'edit' ? 'Editar Proyecto' : 'Nuevo Proyecto'}
                </span>
              </nav>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="bg-gradient-to-br from-cream to-gray-50 border-b border-gray-200 px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex justify-center">
            <div className="max-w-7xl w-full">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-2xl font-chatgpt-semibold text-gray-900 flex items-center space-x-2">
                    <span>{mode === 'edit' ? 'Editar Proyecto' : 'Crear Nuevo Proyecto'}</span>
                    {mode === 'create' && (
                      <span className="text-lg">🚀</span>
                    )}
              </h1>
              <p className="text-sm text-gray-neutral mt-1">
                {mode === 'edit' 
                  ? 'Modifica la información del proyecto' 
                  : 'Completa los campos para crear un nuevo proyecto Scrum'}
              </p>
                  
                  {/* Barra de progreso */}
                  {mode === 'create' && !success && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-chatgpt-medium text-gray-700">
                          Progreso del formulario
                        </span>
                        <span className="text-xs font-chatgpt-semibold text-blue-deep">
                          {calculateProgress()}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-blue-deep to-blue-light h-2 rounded-full transition-all duration-500 ease-out"
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
        <div className="flex-1 bg-gradient-to-br from-cream to-gray-50 px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto">
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
                        <h3 className="text-lg font-chatgpt-semibold text-gray-900">Guía Rápida</h3>
                        <p className="text-sm text-gray-neutral">Consejos para crear un proyecto exitoso</p>
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
                      <p><strong>Nombre claro:</strong> Usa un nombre descriptivo que identifique fácilmente el proyecto</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <p><strong>Descripción completa:</strong> Incluye objetivo, alcance y beneficios esperados</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <p><strong>Fechas realistas:</strong> Define plazos alcanzables según la complejidad del proyecto</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-blue-500 mt-1">💡</span>
                      <p><strong>Siguiente paso:</strong> Después de crear el proyecto, agrega miembros del equipo y define los Epics</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Plantillas Rápidas */}
              {mode === 'create' && !formData.name && (
                <div className="bg-gradient-to-r from-blue-deep/5 via-blue-light/5 to-cream rounded-2xl shadow-sm border border-blue-deep/20 p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <svg className="w-5 h-5 text-blue-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <h3 className="text-lg font-chatgpt-semibold text-gray-900">Plantillas Rápidas</h3>
                  </div>
                  <p className="text-sm text-gray-700 mb-4">Comienza con una plantilla predefinida y personalízala según tus necesidades</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {getProjectTemplates().map((template, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => applyTemplate(template)}
                        className="text-left p-4 bg-white border-2 border-blue-deep/20 hover:border-blue-deep rounded-xl transition-all hover:shadow-md group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-chatgpt-semibold text-gray-900 mb-1 group-hover:text-blue-deep transition-colors">
                              {template.name}
                            </h4>
                            <p className="text-xs text-gray-neutral line-clamp-2">{template.description}</p>
                          </div>
                          <svg className="w-5 h-5 text-blue-deep group-hover:text-blue-light transition-colors flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        {mode === 'edit' ? '¡Proyecto actualizado exitosamente!' : '¡Proyecto creado exitosamente!'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Nombre */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="name" className="flex items-center text-sm font-chatgpt-medium text-gray-700">
                        <svg className="w-5 h-5 text-blue-deep mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        Nombre del Proyecto <span className="text-red-500 ml-1">*</span>
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
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-deep focus:border-transparent transition-all ${
                          errors.name ? 'border-red-300' : formData.name ? 'border-green-300 bg-green-50/30' : 'border-gray-300'
                        }`}
                      placeholder="Ej: Sistema de Gestión de Tickets"
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

                  {/* Descripción */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="description" className="flex items-center text-sm font-chatgpt-medium text-gray-700">
                        <svg className="w-5 h-5 text-blue-deep mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Descripción
                      </label>
                      <span className={`text-xs ${formData.description.length > 400 ? 'text-orange-600 font-chatgpt-semibold' : 'text-gray-500'}`}>
                        {formData.description.length}/500
                      </span>
                    </div>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      onFocus={() => setFocusedField('description')}
                      onBlur={() => setFocusedField(null)}
                      maxLength={500}
                      rows={4}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-deep focus:border-transparent transition-all resize-none ${
                        errors.description ? 'border-red-300' : formData.description ? 'border-green-300 bg-green-50/30' : 'border-gray-300'
                      }`}
                      placeholder="Describe el objetivo y alcance del proyecto..."
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

                  {/* Estado */}
                  <div>
                    <label htmlFor="status" className="flex items-center text-sm font-chatgpt-medium text-gray-700 mb-2">
                      <svg className="w-5 h-5 text-blue-deep mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Estado del Proyecto
                    </label>
                    <div className="relative">
                      <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField('status')}
                        onBlur={() => setFocusedField(null)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-deep focus:border-transparent appearance-none bg-white transition-all"
                      >
                        <option value="PLANNING">📋 Planificación</option>
                        <option value="ACTIVE">✅ Activo</option>
                        <option value="ON_HOLD">⏸️ En Espera</option>
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

                  {/* Fechas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="startDate" className="flex items-center text-sm font-chatgpt-medium text-gray-700 mb-2">
                        <svg className="w-5 h-5 text-blue-deep mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Fecha de Inicio <span className="text-red-500 ml-1">*</span>
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
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-deep focus:border-transparent transition-all ${
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
                        <svg className="w-5 h-5 text-blue-deep mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Fecha de Fin <span className="text-gray-400 text-xs font-normal ml-1">(opcional)</span>
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
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-deep focus:border-transparent transition-all ${
                            errors.endDate ? 'border-red-300' : formData.endDate ? 'border-green-300 bg-green-50/30' : 'border-gray-300'
                          }`}
                        />
                        {formData.endDate && !errors.endDate && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, endDate: '' }));
                              if (errors.endDate) {
                                setErrors(prev => ({ ...prev, endDate: '' }));
                              }
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors z-10"
                            title="Limpiar fecha"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
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
                    </div>
                  </div>
                </div>

                {/* Resumen antes de guardar */}
                {mode === 'create' && formData.name && formData.startDate && (
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
                          Tu proyecto "{formData.name}" está completo al <strong>{calculateProgress()}%</strong>. 
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
                      href={mode === 'edit' && projectId ? `/proyectos/detalle?id=${projectId}` : '/proyectos'}
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
                      className="bg-gradient-to-r from-blue-deep to-blue-light hover:shadow-2xl text-white px-8 py-3 rounded-xl font-chatgpt-semibold transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center space-x-2 shadow-medium hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-light/30 focus:ring-offset-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>{mode === 'edit' ? 'Actualizando...' : 'Creando Proyecto...'}</span>
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{mode === 'edit' ? 'Actualizar Proyecto' : 'Crear Proyecto'}</span>
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
    </AppSidebarLayout>
  );
};

export default ProjectFormImproved;

