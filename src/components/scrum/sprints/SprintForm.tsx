import React, { useState, useEffect } from 'react';
import { scrumService } from '../../../services/scrumService';
import type { Sprint, CreateSprintData, SprintStatus, Project, User } from '../../../types/scrum';
import LoadingSpinner from '../common/LoadingSpinner';

interface SprintFormProps {
  projectId: number;
  sprint?: Sprint;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (sprint: Sprint) => void;
}

const SprintForm: React.FC<SprintFormProps> = ({
  projectId,
  sprint,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState<CreateSprintData & { status?: SprintStatus }>({
    name: '',
    goal: '',
    startDate: '',
    endDate: '',
    status: 'PLANNING',
    projectId: projectId
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

  const isEditing = !!sprint;

  useEffect(() => {
    if (sprint) {
      setFormData({
        name: sprint.name,
        goal: sprint.goal || '',
        startDate: sprint.startDate ? new Date(sprint.startDate).toISOString().split('T')[0] : '',
        endDate: sprint.endDate ? new Date(sprint.endDate).toISOString().split('T')[0] : '',
        status: sprint.status,
        projectId: projectId
      });
      
      // Cargar miembros actuales del sprint
      if (sprint.members) {
        setSelectedMembers(sprint.members.map((sm: any) => sm.userId));
      }
    }
  }, [sprint]);

  useEffect(() => {
    if (isOpen && projectId) {
      loadProjectData();
    }
  }, [isOpen, projectId]);

  const loadProjectData = async () => {
    try {
      setIsLoading(true);
      
      // Cargar datos del proyecto
      const projectResponse = await scrumService.getProjectById(projectId);
      if (projectResponse.success && projectResponse.data) {
        setProject(projectResponse.data.project);
        
        // Cargar miembros del proyecto
        if (projectResponse.data.project.members) {
          const members = projectResponse.data.project.members.map((pm: any) => pm.user);
          setTeamMembers(members);
        }
      }
    } catch (err) {
      setError('Error al cargar los datos del proyecto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error cuando el usuario empiece a escribir
    if (error) setError(null);
  };

  const handleMemberToggle = (userId: number) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('El nombre del sprint es requerido');
      return false;
    }

    if (!formData.startDate) {
      setError('La fecha de inicio es requerida');
      return false;
    }

    if (!formData.endDate) {
      setError('La fecha de fin es requerida');
      return false;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setError('La fecha de fin debe ser posterior a la fecha de inicio');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let response;
      
      if (isEditing && sprint) {
        const updateData = {
          name: formData.name,
          goal: formData.goal,
          startDate: formData.startDate,
          endDate: formData.endDate,
          projectId: formData.projectId
        };
        response = await scrumService.updateSprint(sprint.id, updateData);
      } else {
        response = await scrumService.createSprint(formData);
      }
      
      if (response.success && response.data) {
        // Nota: addSprintMember no está implementado en el servicio
        // Se podría implementar más adelante si es necesario
        
        onSuccess(response.data.sprint);
        handleClose();
      } else {
        setError(response.message || 'Error al guardar el sprint');
      }
    } catch (err) {
      setError('Error al guardar el sprint');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      goal: '',
      startDate: '',
      endDate: '',
      status: 'PLANNING',
      projectId: projectId
    });
    setSelectedMembers([]);
    setError(null);
    onClose();
  };

  const calculateDuration = (): number => {
    if (!formData.startDate || !formData.endDate) return 0;
    
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                {isEditing ? 'Editar Sprint' : 'Crear Nuevo Sprint'}
              </h2>
              {project && (
                <p className="text-blue-100 text-sm mt-1">
                  Proyecto: {project.name}
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información Básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Sprint *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Sprint 1 - Funcionalidades básicas"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-2">
                  Objetivo del Sprint
                </label>
                <textarea
                  id="goal"
                  name="goal"
                  value={formData.goal}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Describe el objetivo principal que se quiere alcanzar en este sprint..."
                />
              </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Inicio *
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Fin *
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="flex items-end">
                <div className="w-full p-3 bg-gray-50 rounded-lg border">
                  <div className="text-sm text-gray-600">Duración</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {calculateDuration()} días
                  </div>
                </div>
              </div>
            </div>

            {/* Estado */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                id="status"
                name="status"
                value={(formData as any).status || 'PLANNING'}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="PLANNING">Planificación</option>
                <option value="ACTIVE">Activo</option>
                <option value="COMPLETED">Completado</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </div>

            {/* Miembros del Sprint */}
            {teamMembers.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Miembros del Sprint
                </label>
                <div className="border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <div className="space-y-2">
                    {teamMembers.map(member => (
                      <label
                        key={member.id}
                        className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.id)}
                          onChange={() => handleMemberToggle(member.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-3 flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{member.name}</div>
                            <div className="text-sm text-gray-500">{member.email}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {selectedMembers.length} miembros seleccionados
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 border border-transparent rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
          >
            {isLoading && <LoadingSpinner size="sm" />}
            {isEditing ? 'Actualizar Sprint' : 'Crear Sprint'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SprintForm;
