import React, { useState, useEffect } from 'react';
import AppSidebarLayout from '../../layout/AppSidebarLayout';
import { API_BASE_URL, authenticatedRequest } from '../../../config/api';
import ScrumBreadcrumbs from '../common/ScrumBreadcrumbs';

interface TrashProject {
  id: number;
  name: string;
  description?: string | null;
  status: string;
  deletedAt: string;
  deletedBy: number;
  daysUntilDeletion: number;
  members?: any[];
  epics?: any[];
  sprints?: any[];
}

const TrashBin: React.FC = () => {
  const [projects, setProjects] = useState<TrashProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadTrash();
  }, []);

  const loadTrash = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authenticatedRequest(`${API_BASE_URL}/trash`);
      setProjects(response.data?.projects || response.projects || []);
    } catch (error: any) {
      setError(error.message || 'Error al cargar la papelera');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (projectId: number) => {
    if (!confirm('¿Restaurar este proyecto? Volverá a estar disponible en tu lista de proyectos.')) {
      return;
    }

    try {
      setRestoringId(projectId);
      await authenticatedRequest(
        `${API_BASE_URL}/trash/projects/${projectId}/restore`,
        { method: 'POST' }
      );
      alert('Proyecto restaurado exitosamente');
      loadTrash();
    } catch (error: any) {
      alert('Error al restaurar proyecto: ' + (error.message || 'Error desconocido'));
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDelete = async (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    const confirmMessage = `¿Eliminar permanentemente el proyecto "${project?.name}"?\n\nEsta acción NO se puede deshacer. Todos los datos del proyecto se perderán para siempre.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setDeletingId(projectId);
      await authenticatedRequest(
        `${API_BASE_URL}/trash/projects/${projectId}`,
        { method: 'DELETE' }
      );
      alert('Proyecto eliminado permanentemente');
      loadTrash();
    } catch (error: any) {
      alert('Error al eliminar proyecto: ' + (error.message || 'Error desconocido'));
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (days: number) => {
    if (days <= 7) return 'text-red-600 bg-red-50 border-red-200';
    if (days <= 15) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  };

  if (loading) {
    return (
      <AppSidebarLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0264C5] mx-auto mb-4"></div>
            <p className="text-[#777777]">Cargando papelera...</p>
          </div>
        </div>
      </AppSidebarLayout>
    );
  }

  if (error) {
    return (
      <AppSidebarLayout>
        <div className="h-full flex items-center justify-center bg-gradient-to-br from-[#F2ECDF] to-gray-50">
          <div className="max-w-2xl mx-auto p-8">
            <div className="bg-white border-2 border-red-200 rounded-2xl p-8 text-center shadow-xl">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-chatgpt-semibold text-gray-900 mb-4">
                Error al Cargar Papelera
              </h2>
              <p className="text-[#777777] text-lg mb-6 font-chatgpt-normal">
                {error}
              </p>
              <button
                onClick={loadTrash}
                className="bg-[#0264C5] hover:bg-[#11C0F1] text-white px-6 py-3 rounded-xl font-chatgpt-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </AppSidebarLayout>
    );
  }

  return (
    <AppSidebarLayout>
      <div className="h-full flex flex-col">
        {/* Breadcrumbs */}
        <ScrumBreadcrumbs
          items={[
            {
              label: 'Proyectos',
              href: '/proyectos',
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              ),
            },
            {
              label: 'Papelera',
            },
          ]}
        />

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex justify-center">
            <div className="max-w-7xl w-full">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-chatgpt-semibold text-gray-900 mb-2">
                    🗑️ Papelera
                  </h1>
                  <p className="text-sm text-[#777777]">
                    Proyectos eliminados. Se eliminarán permanentemente después de 30 días.
                  </p>
                </div>
                <a
                  href="/proyectos"
                  className="bg-white border-2 border-[#F2ECDF] hover:border-[#0264C5] text-[#777777] hover:text-[#0264C5] px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-300 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span className="text-sm">Volver a Proyectos</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-gradient-to-br from-[#F2ECDF] to-gray-50 px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto">
          <div className="flex justify-center">
            <div className="max-w-7xl w-full">
              {projects.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-12 text-center">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-chatgpt-semibold text-gray-900 mb-2">
                    Papelera vacía
                  </h2>
                  <p className="text-[#777777]">
                    No hay proyectos eliminados. Los proyectos que elimines aparecerán aquí.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="bg-white rounded-xl shadow-md border-2 border-gray-200 hover:border-gray-300 transition-all p-6"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-chatgpt-semibold text-gray-900">
                              {project.name}
                            </h3>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.daysUntilDeletion)}`}>
                              {project.daysUntilDeletion > 0 
                                ? `${project.daysUntilDeletion} días restantes`
                                : 'Eliminando pronto'
                              }
                            </span>
                          </div>
                          {project.description && (
                            <p className="text-sm text-[#777777] mb-3">
                              {project.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 text-xs text-[#777777]">
                            <span>Eliminado el {formatDate(project.deletedAt)}</span>
                            {project.members && (
                              <span>{project.members.length} miembro(s)</span>
                            )}
                            {project.epics && (
                              <span>{project.epics.length} epic(s)</span>
                            )}
                            {project.sprints && (
                              <span>{project.sprints.length} sprint(s)</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleRestore(project.id)}
                            disabled={restoringId === project.id}
                            className="bg-green-50 border-2 border-green-200 hover:border-green-400 text-green-700 hover:text-green-900 px-4 py-2 rounded-lg font-chatgpt-medium transition-all duration-300 flex items-center space-x-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Restaurar proyecto"
                          >
                            {restoringId === project.id ? (
                              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            )}
                            <span className="text-sm">Restaurar</span>
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(project.id)}
                            disabled={deletingId === project.id}
                            className="bg-red-50 border-2 border-red-200 hover:border-red-400 text-red-700 hover:text-red-900 px-4 py-2 rounded-lg font-chatgpt-medium transition-all duration-300 flex items-center space-x-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Eliminar permanentemente"
                          >
                            {deletingId === project.id ? (
                              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                            <span className="text-sm">Eliminar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppSidebarLayout>
  );
};

export default TrashBin;

