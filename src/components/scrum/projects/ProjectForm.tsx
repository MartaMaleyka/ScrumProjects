import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      newErrors.name = t('projects.form.nameRequired', 'El nombre del proyecto es obligatorio');
    } else if (formData.name.trim().length < 3) {
      newErrors.name = t('projects.form.nameMinLength', 'El nombre debe tener al menos 3 caracteres');
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = t('projects.form.descriptionMaxLength', 'La descripción no puede exceder 500 caracteres');
    }

    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      if (endDate <= startDate) {
        newErrors.endDate = t('projects.form.endDateAfterStart', 'La fecha de fin debe ser posterior a la fecha de inicio');
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
        throw new Error(response.message || t('projects.form.createError', 'Error al crear el proyecto'));
      }
    } catch (err: any) {
      setError(err.message || (mode === 'create' ? t('projects.form.createError', 'Error al crear el proyecto') : t('projects.form.updateError', 'Error al actualizar el proyecto')));
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions: { value: ProjectStatus; label: string }[] = [
    { value: 'PLANNING', label: t('common.statusPlanning', 'Planificando') },
    { value: 'ACTIVE', label: t('common.statusActive', 'Activo') },
    { value: 'ON_HOLD', label: t('common.statusOnHold', 'En Pausa') },
    { value: 'COMPLETED', label: t('common.statusCompleted', 'Completado') },
    { value: 'CANCELLED', label: t('common.statusCancelled', 'Cancelado') },
  ];

  if (!isOpen) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'create' ? t('projects.form.new', 'Nuevo') : t('projects.form.edit', 'Editar')} <span className="text-indigo-600">{t('projects.title', 'Proyecto')}</span>
          </h2>
          <p className="text-gray-600 mt-1">
            {mode === 'create' 
              ? t('projects.form.createDescription', 'Crea un nuevo proyecto Scrum para tu equipo')
              : t('projects.form.editDescription', 'Modifica la información del proyecto')
            }
          </p>
        </div>
        
        {(onCancel || onClose) && (
          <button
            onClick={onClose || onCancel}
            className="text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-gray-100"
            title={t('common.close', 'Cerrar')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Error general */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información básica */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nombre del proyecto */}
          <div className="md:col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              {t('projects.form.name', 'Nombre del Proyecto')} *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full bg-white border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors`}
              placeholder={t('projects.form.namePlaceholder', 'Ej: Sistema de Gestión de Inventario')}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Estado */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              {t('projects.form.status', 'Estado del Proyecto')}
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isLoading}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value} className="bg-white text-gray-900">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Fechas */}
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
              {t('projects.form.startDate', 'Fecha de Inicio')}
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
              {t('projects.form.endDate', 'Fecha de Fin Estimada')}
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={formData.endDate}
              onChange={handleInputChange}
              className={`w-full bg-white border ${errors.endDate ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors`}
              disabled={isLoading}
            />
            {errors.endDate && (
              <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
            )}
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            {t('projects.form.description', 'Descripción del Proyecto')}
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleInputChange}
            className={`w-full bg-white border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-colors`}
            placeholder={t('projects.form.descriptionPlaceholder', 'Describe los objetivos, alcance y características principales del proyecto...')}
            disabled={isLoading}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
          <div className="mt-1 text-xs text-gray-500 text-right">
            {formData.description?.length || 0} / 500 {t('projects.form.characters', 'caracteres')}
          </div>
        </div>

        {/* Información adicional */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-1 text-gray-900">{t('projects.form.infoTitle', 'Información sobre el proyecto')}:</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                <li>{t('projects.form.info1', 'Una vez creado el proyecto, podrás agregar épicas, historias de usuario y sprints')}</li>
                <li>{t('projects.form.info2', 'Podrás invitar miembros del equipo y asignar roles')}</li>
                <li>{t('projects.form.info3', 'El estado se puede cambiar en cualquier momento')}</li>
                <li>{t('projects.form.info4', 'Las fechas son estimadas y se pueden ajustar según el progreso')}</li>
              </ul>
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
              className="px-6 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {t('common.cancel', 'Cancelar')}
            </button>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2 shadow-md"
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
                <span>{mode === 'create' ? t('projects.createProject', 'Crear Proyecto') : t('common.saveChanges', 'Guardar Cambios')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProjectForm;
