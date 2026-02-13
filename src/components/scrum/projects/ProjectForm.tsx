import React, { useState } from 'react';
import { scrumService } from '../../../services/scrumService';
import type { CreateProjectData, ProjectStatus } from '../../../types/scrum';
import LoadingSpinner from '../common/LoadingSpinner';

interface ProjectFormProps {
  isOpen?: boolean;
  onSuccess?: (project: any) => void;
  onCancel?: () => void;
  onClose?: () => void;
  initialData?: Partial<CreateProjectData>;
  mode?: 'create' | 'edit';
}

const ProjectForm: React.FC<ProjectFormProps> = ({ 
  isOpen = true,
  onSuccess, 
  onCancel, 
  onClose,
  initialData,
  mode = 'create' 
}) => {
  const [formData, setFormData] = useState<CreateProjectData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    status: initialData?.status || 'PLANNING',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del proyecto es obligatorio';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'El nombre debe tener al menos 3 caracteres';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'La descripción no puede exceder 500 caracteres';
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
      const response = await scrumService.createProject(formData);
      
      if (response.success && response.data) {
        onSuccess?.(response.data.project);
      } else {
        throw new Error(response.message || 'Error al crear el proyecto');
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear el proyecto');
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions: { value: ProjectStatus; label: string }[] = [
    { value: 'PLANNING', label: 'Planificando' },
    { value: 'ACTIVE', label: 'Activo' },
    { value: 'ON_HOLD', label: 'En Pausa' },
    { value: 'COMPLETED', label: 'Completado' },
    { value: 'CANCELLED', label: 'Cancelado' },
  ];

  if (!isOpen) return null;

  return (
    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {mode === 'create' ? 'Nuevo' : 'Editar'} <span className="text-[#FFCD00]">Proyecto</span>
          </h2>
          <p className="text-blue-200 mt-1">
            {mode === 'create' 
              ? 'Crea un nuevo proyecto Scrum para tu equipo' 
              : 'Modifica la información del proyecto'
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
        {/* Información básica */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nombre del proyecto */}
          <div className="md:col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-blue-200 mb-2">
              Nombre del Proyecto *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full bg-white/10 border ${errors.name ? 'border-red-500/50' : 'border-white/20'} rounded-lg px-4 py-3 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors`}
              placeholder="Ej: Sistema de Gestión de Inventario"
              disabled={isLoading}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-300">{errors.name}</p>
            )}
          </div>

          {/* Estado */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-blue-200 mb-2">
              Estado del Proyecto
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

          {/* Fechas */}
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-blue-200 mb-2">
              Fecha de Inicio
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-blue-200 mb-2">
              Fecha de Fin Estimada
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={formData.endDate}
              onChange={handleInputChange}
              className={`w-full bg-white/10 border ${errors.endDate ? 'border-red-500/50' : 'border-white/20'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors`}
              disabled={isLoading}
            />
            {errors.endDate && (
              <p className="mt-1 text-sm text-red-300">{errors.endDate}</p>
            )}
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-blue-200 mb-2">
            Descripción del Proyecto
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleInputChange}
            className={`w-full bg-white/10 border ${errors.description ? 'border-red-500/50' : 'border-white/20'} rounded-lg px-4 py-3 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-colors`}
            placeholder="Describe los objetivos, alcance y características principales del proyecto..."
            disabled={isLoading}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-300">{errors.description}</p>
          )}
          <div className="mt-1 text-xs text-blue-300 text-right">
            {formData.description?.length || 0} / 500 caracteres
          </div>
        </div>

        {/* Información adicional */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-200">
              <p className="font-medium mb-1">Información sobre el proyecto:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Una vez creado el proyecto, podrás agregar épicas, historias de usuario y sprints</li>
                <li>Podrás invitar miembros del equipo y asignar roles</li>
                <li>El estado se puede cambiar en cualquier momento</li>
                <li>Las fechas son estimadas y se pueden ajustar según el progreso</li>
              </ul>
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
                <span>{mode === 'create' ? 'Crear Proyecto' : 'Guardar Cambios'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProjectForm;
