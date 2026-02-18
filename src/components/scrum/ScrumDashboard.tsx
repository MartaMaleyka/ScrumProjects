import React, { useState, useEffect } from 'react';
import AppSidebarLayout from '../layout/AppSidebarLayout';
import { scrumService } from '../../services/scrumService';
import type { Project, Sprint, Epic, UserStory, Task, ProjectMetrics } from '../../types/scrum';

// Importar todos los componentes Scrum
import {
  ProjectList,
  ProjectForm,
  ProjectDetail,
  ProjectDashboard,
  EpicList,
  EpicForm,
  UserStoryList,
  UserStoryForm,
  SprintList,
  SprintForm,
  KanbanBoard,
  TaskForm,
  LoadingSpinner
} from './index';

type ScrumView = 
  | 'projects' 
  | 'project-detail' 
  | 'epics' 
  | 'stories' 
  | 'sprints' 
  | 'tasks' 
  | 'dashboard';

interface ScrumDashboardState {
  currentView: ScrumView;
  selectedProject: Project | null;
  selectedSprint: Sprint | null;
  selectedEpic: Epic | null;
  selectedUserStory: UserStory | null;
  showProjectForm: boolean;
  showEpicForm: boolean;
  showStoryForm: boolean;
  showSprintForm: boolean;
  showTaskForm: boolean;
}

const ScrumDashboard: React.FC = () => {
  const [state, setState] = useState<ScrumDashboardState>({
    currentView: 'projects',
    selectedProject: null,
    selectedSprint: null,
    selectedEpic: null,
    selectedUserStory: null,
    showProjectForm: false,
    showEpicForm: false,
    showStoryForm: false,
    showSprintForm: false,
    showTaskForm: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectMetrics, setProjectMetrics] = useState<ProjectMetrics | null>(null);

  // Cargar proyectos al inicializar
  useEffect(() => {
    loadProjects();
    
    // Leer la vista inicial de la URL
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const viewParam = urlParams.get('view');
      
      if (viewParam) {
        const viewMap: Record<string, ScrumView> = {
          'projects': 'projects',
          'epics': 'epics',
          'stories': 'stories',
          'sprints': 'sprints',
          'tasks': 'tasks',
          'reports': 'dashboard'
        };
        
        const targetView = viewMap[viewParam];
        if (targetView) {
          setState(prev => ({ ...prev, currentView: targetView }));
        }
      }
    }
  }, []);

  // Escuchar cambios en la URL (navegación del sidebar)
  useEffect(() => {
    const handleNavigation = (e?: Event) => {
      if (typeof window !== 'undefined') {
        console.log('🔔 [ScrumDashboard] Evento de navegación recibido:', {
          type: e?.type,
          pathname: window.location.pathname,
          search: window.location.search,
          detail: e && 'detail' in e ? (e as CustomEvent).detail : null
        });

        // Si es un evento personalizado de scrum-navigation, usar su información
        if (e && e.type === 'scrum-navigation' && 'detail' in e && (e as CustomEvent).detail) {
          const detail = (e as CustomEvent).detail as { view?: string; href?: string };
          if (detail.view) {
            const viewMap: Record<string, ScrumView> = {
              'projects': 'projects',
              'epics': 'epics',
              'stories': 'stories',
              'sprints': 'sprints',
              'tasks': 'tasks',
              'reports': 'dashboard'
            };
            const targetView = viewMap[detail.view];
            if (targetView) {
              console.log('✅ [ScrumDashboard] Cambiando vista a:', targetView);
              setState(prev => ({ ...prev, currentView: targetView }));
              return;
            }
          }
        }

        const urlParams = new URLSearchParams(window.location.search);
        const viewParam = urlParams.get('view');
        
        const viewMap: Record<string, ScrumView> = {
          'projects': 'projects',
          'epics': 'epics',
          'stories': 'stories',
          'sprints': 'sprints',
          'tasks': 'tasks',
          'reports': 'dashboard'
        };
        
        if (viewParam) {
          const targetView = viewMap[viewParam];
          if (targetView) {
            console.log('✅ [ScrumDashboard] Cambiando vista desde URL a:', targetView);
            setState(prev => ({ ...prev, currentView: targetView }));
          }
        } else if (window.location.pathname === '/scrum' || window.location.pathname.startsWith('/scrum')) {
          // Si no hay parámetro view y estamos en /scrum, mostrar proyectos
          console.log('✅ [ScrumDashboard] Sin parámetro view, estableciendo vista a: projects');
          setState(prev => ({ ...prev, currentView: 'projects' }));
        }
      }
    };

    // Escuchar eventos de navegación
    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('navigation', handleNavigation as EventListener);
    window.addEventListener('scrum-navigation', handleNavigation as EventListener);

    // Ejecutar una vez al montar para establecer la vista inicial
    handleNavigation();

    return () => {
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('navigation', handleNavigation as EventListener);
      window.removeEventListener('scrum-navigation', handleNavigation as EventListener);
    };
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const response = await scrumService.getProjects();
      if (response.success && response.data) {
        setProjects(response.data.projects);
      }
    } catch (err) {
      setError('Error al cargar los proyectos');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjectMetrics = async (projectId: number) => {
    try {
      const response = await scrumService.getProjectMetrics(projectId);
      if (response.success && response.data) {
        setProjectMetrics(response.data.metrics);
      }
    } catch (err) {
    }
  };

  // Navegación
  const navigateToView = (view: ScrumView, options?: { 
    project?: Project; 
    sprint?: Sprint; 
    epic?: Epic; 
    userStory?: UserStory;
  }) => {
    setState(prev => ({
      ...prev,
      currentView: view,
      selectedProject: options?.project || prev.selectedProject,
      selectedSprint: options?.sprint || null,
      selectedEpic: options?.epic || null,
      selectedUserStory: options?.userStory || null
    }));

    // Cargar métricas si se selecciona un proyecto
    if (options?.project) {
      loadProjectMetrics(options.project.id);
    }
  };

  // Handlers para formularios
  const openForm = (formType: keyof Pick<ScrumDashboardState, 'showProjectForm' | 'showEpicForm' | 'showStoryForm' | 'showSprintForm' | 'showTaskForm'>) => {
    setState(prev => ({ ...prev, [formType]: true }));
  };

  const closeForm = (formType: keyof Pick<ScrumDashboardState, 'showProjectForm' | 'showEpicForm' | 'showStoryForm' | 'showSprintForm' | 'showTaskForm'>) => {
    setState(prev => ({ ...prev, [formType]: false }));
  };

  // Handlers de éxito para formularios
  const handleProjectSuccess = (project: Project) => {
    loadProjects();
    closeForm('showProjectForm');
  };

  const handleEpicSuccess = (epic: Epic) => {
    // Recargar la vista actual
    closeForm('showEpicForm');
  };

  const handleStorySuccess = (story: UserStory) => {
    closeForm('showStoryForm');
  };

  const handleSprintSuccess = (sprint: Sprint) => {
    closeForm('showSprintForm');
  };

  const handleTaskSuccess = (task: Task) => {
    closeForm('showTaskForm');
  };


  // Renderizar contenido según la vista actual
  const renderCurrentView = () => {
    if (isLoading && state.currentView === 'projects') {
      return (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    switch (state.currentView) {
      case 'projects':
        return (
          <ProjectList
            onProjectSelect={(project) => navigateToView('project-detail', { project })}
            onCreateProject={() => openForm('showProjectForm')}
          />
        );

      case 'project-detail':
        return state.selectedProject ? (
          <ProjectDetail
            projectId={state.selectedProject.id}
            onNavigate={(view) => {
              if (view === 'epics') navigateToView('epics');
              else if (view === 'stories') navigateToView('stories');
              else if (view === 'sprints') navigateToView('sprints');
              else if (view === 'tasks') navigateToView('tasks');
              else if (view === 'dashboard') navigateToView('dashboard');
            }}
          />
        ) : null;

      case 'epics':
        return state.selectedProject ? (
          <div className="space-y-6 animate-slide-up">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Épicas del Proyecto</h2>
                <p className="text-white/70">Gestiona las épicas y sus historias asociadas</p>
              </div>
              <button
                onClick={() => openForm('showEpicForm')}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center hover:scale-105 hover:shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva Épica
              </button>
            </div>
            <EpicList projectId={state.selectedProject.id} />
          </div>
        ) : null;

      case 'stories':
        return state.selectedProject ? (
          <div className="space-y-6 animate-slide-up">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Historias de Usuario</h2>
                <p className="text-white/70">Product Backlog - Prioriza y gestiona las historias</p>
              </div>
              <button
                onClick={() => openForm('showStoryForm')}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center hover:scale-105 hover:shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva Historia
              </button>
            </div>
            <UserStoryList projectId={state.selectedProject.id} />
          </div>
        ) : null;

      case 'sprints':
        return state.selectedProject ? (
          <div className="space-y-6 animate-slide-up">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Sprints del Proyecto</h2>
                <p className="text-white/70">Planifica y gestiona los sprints del proyecto</p>
              </div>
              <button
                onClick={() => openForm('showSprintForm')}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center hover:scale-105 hover:shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nuevo Sprint
              </button>
            </div>
            <SprintList 
              projectId={state.selectedProject.id} 
              onSprintSelect={(sprint) => {
                setState(prev => ({
                  ...prev,
                  currentView: 'tasks',
                  selectedSprint: sprint
                }));
              }}
            />
          </div>
        ) : null;

      case 'tasks':
        return state.selectedProject ? (
          <div className="space-y-6 animate-slide-up">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Tablero Kanban</h2>
                <p className="text-white/70">Visualiza y gestiona el flujo de trabajo de las tareas</p>
              </div>
              <button
                onClick={() => openForm('showTaskForm')}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center hover:scale-105 hover:shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva Tarea
              </button>
            </div>
            <KanbanBoard 
              projectId={state.selectedProject.id}
              sprintId={state.selectedSprint?.id}
              userStoryId={state.selectedUserStory?.id}
            />
          </div>
        ) : null;

      case 'dashboard':
        return state.selectedProject ? (
          <ProjectDashboard 
            projectId={state.selectedProject.id}
          />
        ) : null;

      default:
        return null;
    }
  };

return (
  <AppSidebarLayout>
    <div className="min-h-screen">
      {renderCurrentView()}
    
    {/* Formularios Modales */}
    {state.showProjectForm && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <ProjectForm
            isOpen={state.showProjectForm}
            onSuccess={(project) => {
              closeForm('showProjectForm');
              loadProjects(); // Recargar la lista de proyectos
            }}
            onCancel={() => closeForm('showProjectForm')}
            onClose={() => closeForm('showProjectForm')}
          />
        </div>
      </div>
    )}

    {state.showEpicForm && state.selectedProject && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <EpicForm
            isOpen={state.showEpicForm}
            projectId={state.selectedProject.id}
            onSuccess={() => {
              closeForm('showEpicForm');
              // Recargar épicas si estamos en la vista de épicas
            }}
            onCancel={() => closeForm('showEpicForm')}
            onClose={() => closeForm('showEpicForm')}
          />
        </div>
      </div>
    )}

    {state.showStoryForm && state.selectedProject && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <UserStoryForm
            isOpen={state.showStoryForm}
            projectId={state.selectedProject.id}
            epicId={state.selectedEpic?.id}
            onSuccess={() => {
              closeForm('showStoryForm');
              // Recargar historias si estamos en la vista de historias
            }}
            onCancel={() => closeForm('showStoryForm')}
            onClose={() => closeForm('showStoryForm')}
          />
        </div>
      </div>
    )}

    {state.showSprintForm && state.selectedProject && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <SprintForm
            isOpen={state.showSprintForm}
            projectId={state.selectedProject.id}
            onSuccess={() => {
              closeForm('showSprintForm');
              // Recargar sprints si estamos en la vista de sprints
            }}
            onClose={() => closeForm('showSprintForm')}
          />
        </div>
      </div>
    )}

    {state.showTaskForm && state.selectedProject && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <TaskForm
            isOpen={state.showTaskForm}
            projectId={state.selectedProject.id}
            sprintId={state.selectedSprint?.id}
            userStoryId={state.selectedUserStory?.id}
            onSuccess={() => {
              closeForm('showTaskForm');
              // Recargar tareas si estamos en la vista de tareas
            }}
            onClose={() => closeForm('showTaskForm')}
          />
        </div>
      </div>
    )}
    </div>
  </AppSidebarLayout>
)
};

export default ScrumDashboard;
