import React, { useState, useEffect } from 'react';
import ProjectFormImproved from './ProjectFormImproved';
import AppSidebarLayout from '../../layout/AppSidebarLayout';
import { API_BASE_URL, authenticatedRequest } from '../../../config/api';

const ProjectEditWrapper: React.FC = () => {
  const [projectData, setProjectData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getProjectId = (): string => {
    if (typeof window === 'undefined') return '';
    
    const urlParams = new URLSearchParams(window.location.search);
    let id = urlParams.get('id');
    
    if (!id) {
      const pathParts = window.location.pathname.split('/');
      id = pathParts[pathParts.length - 1];
    }
    return id || '';
  };

  useEffect(() => {
    const id = getProjectId();
    
    
    if (!id) {
      setError('ID de proyecto no válido');
      setLoading(false);
      return;
    }
    
    const loadProject = async () => {
      try {
        setLoading(true);
        
        const response = await authenticatedRequest(`${API_BASE_URL}/scrum/projects/${id}`);
        
        
        // Intentar obtener el proyecto de diferentes estructuras posibles
        const project = response.project || response.data?.project || response.data || response;
        
        
        if (!project || !project.name) {
          throw new Error('No se encontraron datos del proyecto en la respuesta');
        }
        
        const formData = {
          name: project.name,
          description: project.description || '',
          status: project.status,
          startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
          endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
        };
        
        setProjectData(formData);
      } catch (err: any) {
        setError(err.message || 'Error al cargar el proyecto');
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, []);

  if (loading) {
    return (
      <AppSidebarLayout>
        <div className="h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#0264C5]"></div>
        </div>
      </AppSidebarLayout>
    );
  }

  if (error) {
    return (
      <AppSidebarLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <a href="/proyectos" className="bg-[#0264C5] text-white px-4 py-2 rounded-xl">
              Volver a Proyectos
            </a>
          </div>
        </div>
      </AppSidebarLayout>
    );
  }

  return <ProjectFormImproved initialData={projectData} projectId={getProjectId()} mode="edit" />;
};

export default ProjectEditWrapper;

