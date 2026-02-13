import React, { useState } from 'react';
import { scrumService } from '../../../services/scrumService';
import type { CreateEpicData, EpicStatus, ScrumPriority } from '../../../types/scrum';
import LoadingSpinner from '../common/LoadingSpinner';

interface EpicFormProps {
  projectId: number;
  isOpen?: boolean;
  onSuccess?: (epic: any) => void;
  onCancel?: () => void;
  onClose?: () => void;
  initialData?: Partial<CreateEpicData>;
  mode?: 'create' | 'edit';
}

const EpicForm: React.FC<EpicFormProps> = ({ 
  projectId,
  isOpen = true,
  onSuccess, 
  onCancel, 
  onClose,
  initialData,
  mode = 'create' 
}) => {
  const [formData, setFormData] = useState<CreateEpicData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    projectId: projectId,
    status: initialData?.status || 'DRAFT',
    priority: initialData?.priority || 'MEDIUM',
    businessValue: initialData?.businessValue || undefined,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'El título de la épica es obligatorio';
    } else if (formData.title.trim().length < 5) {
      newErrors.title = 'El título debe tener al menos 5 caracteres';
    }

    if (!formData.description?.trim()) {
      newErrors.description = 'La descripción es obligatoria';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'La descripción debe tener al menos 10 caracteres';
    } else if (formData.description.length > 1000) {
      newErrors.description = 'La descripción no puede exceder 1000 caracteres';
    }

    if (formData.businessValue !== undefined && (formData.businessValue < 0 || formData.businessValue > 100)) {
      newErrors.businessValue = 'El valor de negocio debe estar entre 0 y 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    let processedValue: any = value;
    if (type === 'number') {
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
      const response = await scrumService.createEpic(formData);
      
      if (response.success && response.data) {
        onSuccess?.(response.data.epic);
      } else {
        throw new Error(response.message || 'Error al crear la épica');
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear la épica');
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions: { value: EpicStatus; label: string }[] = [
    { value: 'DRAFT', label: 'Borrador' },
    { value: 'READY', label: 'Listo' },
    { value: 'IN_PROGRESS', label: 'En Progreso' },
    { value: 'COMPLETED', label: 'Completado' },
    { value: 'CANCELLED', label: 'Cancelado' },
  ];

  const priorityOptions: { value: ScrumPriority; label: string }[] = [
    { value: 'LOW', label: 'Baja' },
    { value: 'MEDIUM', label: 'Media' },
    { value: 'HIGH', label: 'Alta' },
    { value: 'CRITICAL', label: 'Crítica' },
  ];

  if (!isOpen) return null;

  return (
    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {mode === 'create' ? 'Nueva' : 'Editar'} <span className="text-[#FFCD00]">Épica</span>
          </h2>
          <p className="text-blue-200 mt-1">
            {mode === 'create' 
              ? 'Crea una nueva épica para organizar las historias de usuario' 
              : 'Modifica la información de la épica'
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
        {/* Título de la épica */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-blue-200 mb-2">
            Título de la Épica *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className={`w-full bg-white/10 border ${errors.title ? 'border-red-500/50' : 'border-white/20'} rounded-lg px-4 py-3 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors`}
            placeholder="Ej: Sistema de Autenticación de Usuarios"
            disabled={isLoading}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-300">{errors.title}</p>
          )}
        </div>

        {/* Estado y Prioridad */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <label htmlFor="businessValue" className="block text-sm font-medium text-blue-200 mb-2">
              Valor de Negocio (0-100)
            </label>
            <input
              type="number"
              id="businessValue"
              name="businessValue"
              min="0"
              max="100"
              value={formData.businessValue || ''}
              onChange={handleInputChange}
              className={`w-full bg-white/10 border ${errors.businessValue ? 'border-red-500/50' : 'border-white/20'} rounded-lg px-4 py-3 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors`}
              placeholder="50"
              disabled={isLoading}
            />
            {errors.businessValue && (
              <p className="mt-1 text-sm text-red-300">{errors.businessValue}</p>
            )}
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-blue-200 mb-2">
            Descripción de la Épica *
          </label>
          <textarea
            id="description"
            name="description"
            rows={6}
            value={formData.description}
            onChange={handleInputChange}
            className={`w-full bg-white/10 border ${errors.description ? 'border-red-500/50' : 'border-white/20'} rounded-lg px-4 py-3 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-colors`}
            placeholder="Describe el objetivo de la épica, los beneficios esperados y el alcance general. Incluye criterios de aceptación a alto nivel y cualquier consideración técnica importante..."
            disabled={isLoading}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-300">{errors.description}</p>
          )}
          <div className="mt-1 text-xs text-blue-300 text-right">
            {formData.description?.length || 0} / 1000 caracteres
          </div>
        </div>

        {/* Información sobre épicas */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-200">
              <p className="font-medium mb-2">¿Qué es una épica?</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Una épica es una historia de usuario grande que no puede completarse en un solo sprint</li>
                <li>Se descompone en historias de usuario más pequeñas y manejables</li>
                <li>Representa una funcionalidad importante o un conjunto de características relacionadas</li>
                <li>El valor de negocio ayuda a priorizar las épicas según su impacto</li>
                <li>Una épica típicamente involucra múltiples sprints y equipos</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Ejemplo de épica */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <div className="text-sm text-green-200">
              <p className="font-medium mb-2">Ejemplo de una buena épica:</p>
              <div className="text-xs space-y-1">
                <p><strong>Título:</strong> "Sistema de Gestión de Usuarios"</p>
                <p><strong>Descripción:</strong> "Como administrador del sistema, necesito un conjunto completo de funcionalidades para gestionar usuarios, incluyendo registro, autenticación, perfiles, roles y permisos, para mantener la seguridad y facilitar la administración de la plataforma."</p>
                <p><strong>Historias incluidas:</strong> Registro de usuarios, Login/Logout, Recuperación de contraseña, Gestión de perfiles, Asignación de roles, etc.</p>
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
                <span>{mode === 'create' ? 'Crear Épica' : 'Guardar Cambios'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EpicForm;
