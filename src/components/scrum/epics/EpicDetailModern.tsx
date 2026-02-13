import React, { useState, useEffect, useRef } from 'react';
import AppSidebarLayout from '../../layout/AppSidebarLayout';
import { API_BASE_URL, authenticatedRequest } from '../../../config/api';
import { exportService } from '../../../services/exportService';

interface Epic {
  id: number;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  businessValue?: string | null;
  projectId: number;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: number;
    name: string;
  };
  userStories?: UserStory[];
}

interface UserStory {
  id: number;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  storyPoints?: number;
  createdAt: string;
}

const EpicDetailModern: React.FC = () => {
  const [epic, setEpic] = useState<Epic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('detalles');
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const getEpicId = (): string => {
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
    const id = getEpicId();
    
    if (!id) {
      setError('ID de épica no válido');
      setLoading(false);
      return;
    }
    
    const loadEpicData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await authenticatedRequest(`${API_BASE_URL}/scrum/epics/${id}`);
        const epicData = response.epic || response.data?.epic || response;
        
        setEpic(epicData);
        
      } catch (error: any) {
        setError(error.message || 'Error al cargar la épica');
      } finally {
        setLoading(false);
      }
    };

    loadEpicData();
  }, []);

  // Cerrar menú de exportación al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'READY': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'Borrador';
      case 'READY': return 'Listo';
      case 'IN_PROGRESS': return 'En Progreso';
      case 'TESTING': return 'En Pruebas';
      case 'COMPLETED': return 'Completado';
      case 'CANCELLED': return 'Cancelado';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <AppSidebarLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#0264C5] mx-auto mb-4"></div>
            <p className="text-[#777777] text-lg font-chatgpt-normal">Cargando detalles del epic...</p>
          </div>
        </div>
      </AppSidebarLayout>
    );
  }

  if (error || !epic) {
    return (
      <AppSidebarLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Epic no encontrado'}</p>
            <a href="/proyectos" className="bg-[#0264C5] text-white px-4 py-2 rounded-xl">
              Volver a Proyectos
            </a>
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
                {epic.project && (
                  <>
                    <a href={`/proyectos/detalle?id=${epic.project.id}`} className="text-[#777777] hover:text-[#0264C5] transition-colors duration-200">
                      {epic.project.name}
                    </a>
                    <svg className="w-4 h-4 text-[#777777]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
                <span className="text-[#0264C5] font-chatgpt-medium">{epic.title}</span>
              </nav>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex justify-center">
            <div className="max-w-7xl w-full">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-chatgpt-semibold text-gray-900 leading-tight">
                      {epic.title}
                    </h1>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(epic.status)}`}>
                      {getStatusName(epic.status)}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(epic.priority)}`}>
                      {epic.priority}
                    </span>
                  </div>
                  <p className="text-sm text-[#777777]">
                    Epic #{epic.id} • Creado el {formatDate(epic.createdAt)}
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Grupo 1: Acciones secundarias (Exportar) */}
                  <div className="flex items-center gap-2">
                    {/* Botón de exportación con menú desplegable */}
                    <div className="relative" ref={exportMenuRef}>
                      <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        disabled={isExporting || !epic}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-300 flex items-center space-x-2 disabled:cursor-not-allowed text-sm shadow-sm hover:shadow-md"
                        title="Exportar Épica"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>{isExporting ? 'Exportando...' : 'Exportar'}</span>
                        <svg 
                          className={`w-4 h-4 transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {showExportMenu && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                          <button
                            onClick={async () => {
                              if (!epic) return;
                              try {
                                setIsExporting(true);
                                setShowExportMenu(false);
                                await exportService.exportEpicToPDF(
                                  epic as any,
                                  epic.userStories as any,
                                  [] // Las tareas se cargan por historia
                                );
                              } catch (error: any) {
                                alert(`Error al exportar PDF: ${error.message}`);
                              } finally {
                                setIsExporting(false);
                              }
                            }}
                            disabled={isExporting || !epic}
                            className="w-full text-left px-4 py-3 hover:bg-red-50 text-gray-700 hover:text-red-700 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span>Exportar a PDF</span>
                          </button>
                          <button
                            onClick={() => {
                              if (!epic) return;
                              try {
                                setIsExporting(true);
                                setShowExportMenu(false);
                                exportService.exportEpicToExcel(
                                  epic as any,
                                  epic.userStories as any,
                                  []
                                );
                              } catch (error: any) {
                                alert(`Error al exportar Excel: ${error.message}`);
                              } finally {
                                setIsExporting(false);
                              }
                            }}
                            disabled={isExporting || !epic}
                            className="w-full text-left px-4 py-3 hover:bg-green-50 text-gray-700 hover:text-green-700 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed border-t border-gray-100"
                          >
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Exportar a Excel</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Separador visual */}
                  <div className="hidden sm:block w-px h-8 bg-gray-300"></div>

                  {/* Grupo 2: Acciones principales (Volver y Editar) */}
                  <div className="flex items-center gap-2">
                    <a 
                      href={epic.project ? `/proyectos/detalle?id=${epic.project.id}` : '/proyectos'}
                      className="bg-white border-2 border-[#F2ECDF] hover:border-[#0264C5] text-[#777777] hover:text-[#0264C5] px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-300 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      <span>Volver al Proyecto</span>
                    </a>
                    
                    <a 
                      href={`/epics/editar?id=${epic.id}`}
                      className="bg-[#0264C5] hover:bg-[#11C0F1] text-white px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Editar</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6">
          <div className="flex justify-center">
            <div className="max-w-7xl w-full">
              <div className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('detalles')}
                  className={`py-4 px-1 border-b-2 font-chatgpt-medium text-sm transition-colors duration-200 ${
                    activeTab === 'detalles'
                      ? 'border-[#0264C5] text-[#0264C5]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Detalles
                </button>
                <button
                  onClick={() => setActiveTab('historias')}
                  className={`py-4 px-1 border-b-2 font-chatgpt-medium text-sm transition-colors duration-200 ${
                    activeTab === 'historias'
                      ? 'border-[#0264C5] text-[#0264C5]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Historias de Usuario ({epic.userStories?.length || 0})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 bg-gradient-to-br from-[#F2ECDF] to-gray-50 px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto">
          <div className="flex justify-center">
            <div className="max-w-7xl w-full">
              {activeTab === 'detalles' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-chatgpt-semibold text-gray-900 mb-6">Información del Epic</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="text-xs font-chatgpt-medium text-[#777777] uppercase tracking-wide">Descripción</label>
                      <p className="text-sm text-gray-900 mt-1">{epic.description || 'Sin descripción'}</p>
                    </div>
                    
                    {epic.businessValue && (
                      <div>
                        <label className="text-xs font-chatgpt-medium text-[#777777] uppercase tracking-wide">Valor de Negocio</label>
                        <p className="text-sm text-gray-900 mt-1">{epic.businessValue}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs font-chatgpt-medium text-[#777777] uppercase tracking-wide">Estado</label>
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(epic.status)}`}>
                            {getStatusName(epic.status)}
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-xs font-chatgpt-medium text-[#777777] uppercase tracking-wide">Prioridad</label>
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(epic.priority)}`}>
                            {epic.priority}
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-xs font-chatgpt-medium text-[#777777] uppercase tracking-wide">Proyecto</label>
                        <p className="text-sm text-gray-900 mt-1">
                          {epic.project ? (
                            <a href={`/proyectos/detalle?id=${epic.project.id}`} className="text-[#0264C5] hover:underline">
                              {epic.project.name}
                            </a>
                          ) : (
                            'Sin proyecto'
                          )}
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-xs font-chatgpt-medium text-[#777777] uppercase tracking-wide">Historias de Usuario</label>
                        <p className="text-sm text-gray-900 mt-1">{epic.userStories?.length || 0} historias</p>
                      </div>
                      
                      <div>
                        <label className="text-xs font-chatgpt-medium text-[#777777] uppercase tracking-wide">Creado</label>
                        <p className="text-sm text-gray-900 mt-1">{formatDate(epic.createdAt)}</p>
                      </div>
                      
                      <div>
                        <label className="text-xs font-chatgpt-medium text-[#777777] uppercase tracking-wide">Última Actualización</label>
                        <p className="text-sm text-gray-900 mt-1">{formatDate(epic.updatedAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'historias' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-chatgpt-semibold text-gray-900">Historias de Usuario</h2>
                    <a
                      href={`/user-stories/nuevo?epicId=${epic.id}`}
                      className="bg-[#0264C5] hover:bg-[#11C0F1] text-white px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-sm">Crear Historia</span>
                    </a>
                  </div>
                  
                  {epic.userStories && epic.userStories.length > 0 ? (
                    <div className="space-y-4">
                      {epic.userStories.map((story) => (
                        <div key={story.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-chatgpt-semibold text-gray-900 flex-1">{story.title}</h3>
                            <div className="flex items-center space-x-2 ml-4">
                              {story.storyPoints && (
                                <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                                  {story.storyPoints} pts
                                </span>
                              )}
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(story.priority)}`}>
                                {story.priority}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(story.status)}`}>
                                {getStatusName(story.status)}
                              </span>
                            </div>
                          </div>
                          {story.description && (
                            <p className="text-sm text-[#777777] mb-3">{story.description}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-xs text-[#777777]">
                              <span>Historia #{story.id}</span>
                              <span>{formatDate(story.createdAt)}</span>
                            </div>
                            <a
                              href={`/user-stories/detalle?id=${story.id}`}
                              className="bg-[#0264C5] hover:bg-[#11C0F1] text-white px-3 py-1.5 rounded-lg text-xs font-chatgpt-medium transition-all duration-300 flex items-center space-x-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span>Ver Detalles</span>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-[#777777] mb-4">No hay historias de usuario en este epic</p>
                      <a
                        href={`/user-stories/nuevo?epicId=${epic.id}`}
                        className="inline-flex items-center bg-[#0264C5] hover:bg-[#11C0F1] text-white px-4 py-2 rounded-xl font-chatgpt-medium transition-all duration-300 space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Crear Primera Historia</span>
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppSidebarLayout>
  );
};

export default EpicDetailModern;

