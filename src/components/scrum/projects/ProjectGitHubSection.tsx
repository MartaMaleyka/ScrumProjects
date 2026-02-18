import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { githubService, type GitHubStatus } from '../../../services/githubService';
import { useAuth } from '../../../hooks/useAuth';
import { Button } from '../../ui/Button';

interface ProjectGitHubSectionProps {
  projectId: number;
}

const ProjectGitHubSection: React.FC<ProjectGitHubSectionProps> = ({ projectId }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linking, setLinking] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repositories, setRepositories] = useState<Array<{
    id: number;
    name: string;
    full_name: string;
    owner: string;
    private: boolean;
    description: string | null;
    language: string | null;
    updated_at: string;
    html_url: string;
  }>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<{ owner: string; repo: string } | null>(null);
  const [recentCommits, setRecentCommits] = useState<Array<{
    sha: string;
    commit: {
      message: string;
      author?: {
        name: string;
        date: string;
      };
    };
    html_url: string;
    linkedTask?: {
      id: number;
      title: string;
      status: string;
    } | null;
  }>>([]);
  const [loadingCommits, setLoadingCommits] = useState(false);

  useEffect(() => {
    loadStatus();
  }, [projectId]);

  // Cargar commits cuando hay repositorios vinculados
  useEffect(() => {
    if (status?.isConnected && status.linkedRepos && status.linkedRepos.length > 0) {
      // Cargar commits del primer repositorio vinculado
      const firstRepo = status.linkedRepos[0];
      console.log('🔄 [ProjectGitHubSection] Cargando commits para:', firstRepo.owner, firstRepo.repo);
      loadRecentCommits(firstRepo.owner, firstRepo.repo);
    } else {
      console.log('⚠️ [ProjectGitHubSection] No se pueden cargar commits:', {
        isConnected: status?.isConnected,
        hasLinkedRepos: !!status?.linkedRepos,
        linkedReposLength: status?.linkedRepos?.length || 0,
        status: status
      });
      // Limpiar commits si no hay repos vinculados
      if (!status?.isConnected || !status?.linkedRepos || status.linkedRepos.length === 0) {
        setRecentCommits([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.isConnected, status?.linkedRepos?.length, projectId]);

  // Detectar cuando el usuario regresa después de conectar GitHub
  // Solo ejecutar en el cliente para evitar problemas de hidratación
  useEffect(() => {
    // Verificar si hay parámetros en la URL que indiquen conexión exitosa
    if (typeof window === 'undefined') {
      return; // No hacer nada en el servidor
    }
    
    // Esperar un momento para asegurar que el componente esté completamente montado
    const timeoutId = setTimeout(() => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const githubConnected = urlParams.get('success') === 'connected' || 
                                urlParams.get('github') === 'connected';
        
        if (githubConnected) {
          console.log('✅ [ProjectGitHubSection] GitHub conectado exitosamente, recargando estado...');
          
          // Limpiar la URL primero para evitar loops
          try {
            const currentSearch = window.location.search;
            const newSearch = currentSearch
              .replace(/[?&]success=connected/g, '')
              .replace(/[?&]github=connected/g, '')
              .replace(/^&/, '?') // Si queda & al inicio, cambiarlo por ?
              .replace(/^[?&]+/, '') // Eliminar múltiples ? o & consecutivos
              .replace(/&+/g, '&'); // Eliminar múltiples & consecutivos
            
            const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
            window.history.replaceState({}, '', newUrl);
            console.log('🧹 [ProjectGitHubSection] URL limpiada:', newUrl);
          } catch (e) {
            console.warn('⚠️ [ProjectGitHubSection] Error al limpiar URL:', e);
          }
          
          // Recargar el estado después de un breve delay para asegurar que el backend haya guardado el token
          setTimeout(async () => {
            await loadStatus();
          }, 2000); // 2 segundos para dar tiempo al backend
        }
      } catch (e) {
        console.warn('⚠️ [ProjectGitHubSection] Error al leer URL params:', e);
      }
    }, 100); // Esperar 100ms antes de verificar
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [projectId]); // Se ejecuta cuando cambia projectId o cuando el componente se monta

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Verificar si acabamos de conectar GitHub (parámetro en URL)
      // Solo verificar en el cliente para evitar problemas de hidratación
      let justConnected = false;
      if (typeof window !== 'undefined') {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          justConnected = urlParams.get('github') === 'connected' || urlParams.get('success') === 'connected';
        } catch (e) {
          // Ignorar errores al leer URL params
          console.warn('⚠️ [ProjectGitHubSection] Error al leer URL params:', e);
        }
      }
      
      if (justConnected) {
        console.log('🔄 [ProjectGitHubSection] Detectado parámetro github=connected, esperando antes de cargar...');
        // Esperar un poco más si acabamos de conectar
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      const response = await githubService.getStatus(projectId);
      
      console.log('📊 [ProjectGitHubSection] Respuesta completa de getStatus:', {
        success: response.success,
        hasData: !!response.data,
        data: response.data,
        error: (response as any).error,
        message: (response as any).message
      });
      
      if (response.success && response.data) {
        // El API devuelve directamente GitHubStatus
        const statusData = response.data;
        
        console.log('📊 [ProjectGitHubSection] Status data procesado:', {
          statusData,
          isConnected: statusData.isConnected,
          githubUsername: statusData.githubUsername,
          linkedReposCount: statusData.linkedRepos?.length || 0
        });
        
        setStatus(statusData);
        
        // Si acabamos de conectar y ahora está conectado, limpiar la URL
        if (justConnected && statusData.isConnected && typeof window !== 'undefined') {
          setTimeout(() => {
            try {
              const currentSearch = window.location.search;
              const newSearch = currentSearch
                .replace(/[?&]success=connected/g, '')
                .replace(/[?&]github=connected/g, '')
                .replace(/^&/, '?')
                .replace(/^[?&]+/, '')
                .replace(/&+/g, '&');
              
              const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
              if (newUrl !== window.location.pathname + window.location.search) {
                window.history.replaceState({}, '', newUrl);
                console.log('🧹 [ProjectGitHubSection] URL limpiada después de conexión exitosa');
              }
            } catch (e) {
              console.warn('⚠️ [ProjectGitHubSection] Error al limpiar URL:', e);
            }
          }, 500);
        }
      } else {
        // Si hay un error, establecer estado como no conectado
        const errorMsg = (response as any).error || (response as any).message;
        console.warn('⚠️ [ProjectGitHubSection] Error en respuesta o sin datos:', {
          success: response.success,
          error: errorMsg
        });
        setStatus({
          isConnected: false,
          githubUsername: null,
          linkedRepos: []
        });
        if (errorMsg) {
          setError(errorMsg);
        }
      }
    } catch (err: any) {
      setError(err.message || t('github.error.loading', 'Error al cargar estado'));
      setStatus({
        isConnected: false,
        githubUsername: null,
        linkedRepos: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGitHub = async (e?: React.MouseEvent) => {
    // Prevenir cualquier comportamiento por defecto
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      console.log('🔘 [ProjectGitHubSection] Botón Conectar presionado');
      setError(null);
      
      // Solo ejecutar en el cliente
      if (typeof window === 'undefined') {
        console.error('❌ [ProjectGitHubSection] window no está disponible');
        setError(t('github.error.connecting', 'Error al conectar con GitHub'));
        return;
      }
      
      // Construir la URL de retorno incluyendo el projectId
      let returnUrl = window.location.pathname;
      
      // Asegurar que la URL incluya el projectId
      if (returnUrl.includes('/scrum')) {
        // Si ya está en /scrum, agregar o actualizar el parámetro projectId
        try {
          const urlParams = new URLSearchParams(window.location.search);
          urlParams.set('projectId', projectId.toString());
          returnUrl = `${returnUrl}?${urlParams.toString()}`;
        } catch (e) {
          // Si hay error al leer URL params, usar URL simple
          returnUrl = `/scrum?projectId=${projectId}`;
        }
      } else {
        // Si no está en /scrum, construir la URL completa
        returnUrl = `/scrum?projectId=${projectId}`;
      }
      
      console.log('🔗 [ProjectGitHubSection] Iniciando OAuth con returnUrl:', returnUrl);
      console.log('🔗 [ProjectGitHubSection] URL actual:', window.location.href);
      
      const response = await githubService.startOAuth(returnUrl);
      
      console.log('📥 [ProjectGitHubSection] Respuesta de startOAuth:', {
        success: response.success,
        hasData: !!response.data,
        hasAuthUrl: !!response.data?.authUrl,
        authUrl: response.data?.authUrl,
        error: (response as any).error,
        message: (response as any).message,
        fullResponse: response
      });
      
      if (response.success && response.data?.authUrl) {
        console.log('✅ [ProjectGitHubSection] Redirigiendo a GitHub:', response.data.authUrl);
        // Usar window.location.replace para evitar que el navegador guarde la página actual en el historial
        window.location.replace(response.data.authUrl);
      } else {
        // Si hay un error, mostrarlo
        const errorMsg = (response as any).message || (response as any).error || t('github.error.connecting', 'Error al conectar con GitHub');
        console.error('❌ [ProjectGitHubSection] Error al iniciar OAuth:', errorMsg);
        console.error('❌ [ProjectGitHubSection] Respuesta completa:', response);
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error('❌ [ProjectGitHubSection] Excepción al conectar GitHub:', err);
      console.error('❌ [ProjectGitHubSection] Stack:', err.stack);
      setError(err.message || t('github.error.connecting', 'Error al conectar con GitHub'));
    }
  };

  const loadRepositories = async () => {
    try {
      setLoadingRepos(true);
      setError(null);
      
      // Verificar que el usuario tenga GitHub conectado antes de intentar cargar repos
      if (!status?.isConnected) {
        setError(t('github.error.notConnected', 'Usuario no tiene cuenta de GitHub conectada'));
        setLoadingRepos(false);
        return;
      }

      const response = await githubService.listRepositories();
      console.log('📋 [ProjectGitHubSection] Respuesta de listRepositories:', {
        success: response.success,
        hasData: !!response.data,
        hasRepos: !!response.data?.repos,
        repoCount: response.data?.repos?.length || 0,
        error: (response as any).error,
        message: (response as any).message
      });
      
      if (response.success && response.data?.repos) {
        setRepositories(response.data.repos);
        if (response.data.repos.length === 0) {
          console.log('ℹ️ [ProjectGitHubSection] No hay repositorios en la respuesta');
          setError(null); // No es un error, simplemente no hay repos
        } else {
          console.log('✅ [ProjectGitHubSection] Repositorios cargados:', response.data.repos.length);
        }
      } else {
        const errorMsg = (response as any).message || (response as any).error || t('github.error.loadingRepos', 'Error al cargar repositorios');
        setError(errorMsg);
        
        // Si el error es sobre autenticación de la app (no GitHub), no hacer nada más
        // porque el servicio ya maneja la redirección al login
        if (errorMsg.includes('Sesión expirada') || errorMsg.includes('inicia sesión')) {
          return; // El servicio ya redirigió al login
        }
        
        // Si el error es que no tiene GitHub conectado, actualizar el estado
        if (errorMsg.includes('conectar') || errorMsg.includes('conectada') || errorMsg.includes('GitHub')) {
          await loadStatus(); // Recargar estado
        }
      }
    } catch (err: any) {
      const errorMsg = err.message || t('github.error.loadingRepos', 'Error al cargar repositorios');
      
      // Si el error es sobre autenticación de la app, no hacer nada más
      if (errorMsg.includes('Sesión expirada') || errorMsg.includes('inicia sesión')) {
        return; // El servicio ya redirigió al login
      }
      
      setError(errorMsg);
      // Si el error es que no tiene GitHub conectado, actualizar el estado
      if (errorMsg.includes('conectar') || errorMsg.includes('conectada') || errorMsg.includes('GitHub')) {
        await loadStatus(); // Recargar estado
      }
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleShowLinkForm = () => {
    setShowLinkForm(true);
    setSearchTerm('');
    setSelectedRepo(null);
    loadRepositories();
  };

  const handleLinkRepository = async () => {
    if (!selectedRepo) {
      setError(t('github.error.selectRepo', 'Selecciona un repositorio'));
      return;
    }

    try {
      setLinking(true);
      setError(null);
      const response = await githubService.linkRepository(projectId, selectedRepo.owner, selectedRepo.repo);
      if (response.success) {
        setSelectedRepo(null);
        setShowLinkForm(false);
        setSearchTerm('');
        await loadStatus(); // Recargar estado
      } else {
        setError((response as any).message || (response as any).error || t('github.error.linking', 'Error al vincular repositorio'));
      }
    } catch (err: any) {
      setError(err.message || t('github.error.linking', 'Error al vincular repositorio'));
    } finally {
      setLinking(false);
    }
  };

  // Filtrar repositorios según el término de búsqueda
  const filteredRepos = repositories.filter(repo => 
    repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repo.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (repo.description && repo.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleUnlinkRepository = async (repoLinkId: number) => {
    if (!confirm(t('github.confirmUnlink', '¿Estás seguro de desvincular este repositorio?'))) {
      return;
    }

    try {
      setError(null);
      const response = await githubService.unlinkRepository(projectId, repoLinkId);
      if (response.success) {
        await loadStatus(); // Recargar estado
        setRecentCommits([]); // Limpiar commits
      } else {
        setError((response as any).message || (response as any).error || t('github.error.unlinking', 'Error al desvincular repositorio'));
      }
    } catch (err: any) {
      setError(err.message || t('github.error.unlinking', 'Error al desvincular repositorio'));
    }
  };

  const loadRecentCommits = async (owner: string, repo: string) => {
    try {
      console.log('📥 [ProjectGitHubSection] Iniciando carga de commits para:', owner, repo);
      setLoadingCommits(true);
      setError(null);
      
      const response = await githubService.getActivity(projectId, owner, repo);
      
      console.log('📥 [ProjectGitHubSection] Respuesta de getActivity:', {
        success: response.success,
        hasData: !!response.data,
        hasActivity: !!response.data?.activity,
        commitsCount: response.data?.activity?.commits?.length || 0,
        fullResponse: response
      });
      
      // La API devuelve los datos directamente como { pullRequests: [...], commits: [...] }
      let commits: Array<any> = [];
      if (response.success && response.data) {
        // El backend devuelve directamente { pullRequests: [...], commits: [...] }
        if ((response.data as any).commits && Array.isArray((response.data as any).commits)) {
          commits = (response.data as any).commits;
        } else if ((response.data as any).activity?.commits && Array.isArray((response.data as any).activity.commits)) {
          // Por si acaso viene dentro de activity
          commits = (response.data as any).activity.commits;
        }
      }
      
      if (commits.length > 0) {
        // Obtener los últimos 5 commits
        const recentCommits = commits.slice(0, 5);
        console.log('✅ [ProjectGitHubSection] Commits obtenidos:', recentCommits.length);
        console.log('✅ [ProjectGitHubSection] Primer commit:', recentCommits[0] ? {
          sha: recentCommits[0].sha,
          message: recentCommits[0].commit?.message?.substring(0, 50),
          hasLinkedTask: !!recentCommits[0].linkedTask,
          linkedTask: recentCommits[0].linkedTask
        } : 'N/A');
        
        // Log de commits con tareas vinculadas
        const commitsWithLinks = recentCommits.filter(c => c.linkedTask);
        if (commitsWithLinks.length > 0) {
          console.log('🔗 [ProjectGitHubSection] Commits con tareas vinculadas:', commitsWithLinks.length);
          commitsWithLinks.forEach(c => {
            console.log(`  - ${c.sha?.substring(0, 7)} → Tarea #${c.linkedTask?.id}: ${c.linkedTask?.title}`);
          });
        } else {
          console.log('ℹ️ [ProjectGitHubSection] Ningún commit tiene tareas vinculadas');
          console.log('💡 [ProjectGitHubSection] Tip: Agrega referencias como "SP-123" o "#123" en los mensajes de commit');
        }
        
        setRecentCommits(recentCommits);
      } else {
        console.log('ℹ️ [ProjectGitHubSection] No hay commits en la respuesta');
        setRecentCommits([]);
      }
    } catch (err: any) {
      console.error('❌ [ProjectGitHubSection] Excepción al cargar commits:', err);
      console.error('❌ [ProjectGitHubSection] Stack:', err.stack);
      setRecentCommits([]); // Limpiar commits en caso de error
    } finally {
      setLoadingCommits(false);
    }
  };

  // Log cuando el componente se renderiza (debe estar antes de cualquier return condicional)
  useEffect(() => {
    console.log('🎨 [ProjectGitHubSection] Componente renderizado:', {
      isConnected: status?.isConnected,
      hasStatus: !!status,
      loading
    });
  }, [status, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className={status?.isConnected ? 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4' : 'bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-4'}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            status?.isConnected ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            <svg className={`w-6 h-6 ${status?.isConnected ? 'text-green-600' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">
              {status?.isConnected 
                ? t('github.connected', 'GitHub Conectado')
                : t('github.integration', 'Integración GitHub')}
            </h4>
            <p className="text-xs text-gray-600">
              {status?.isConnected 
                ? `@${status.githubUsername} • ${status.linkedRepos.length} ${status.linkedRepos.length === 1 ? t('github.repo', 'repo') : t('github.repos', 'repos')}`
                : t('github.connectDescription', 'Conecta tu cuenta para vincular repositorios')}
            </p>
          </div>
        </div>
        {!status?.isConnected ? (
          <button
            onClick={(e) => {
              console.log('🔘 [ProjectGitHubSection] === CLICK EN BOTÓN CONECTAR ===');
              console.log('🔘 [ProjectGitHubSection] Evento recibido:', {
                type: e.type,
                target: e.target,
                currentTarget: e.currentTarget,
                defaultPrevented: e.defaultPrevented,
                timestamp: new Date().toISOString()
              });
              
              // Prevenir cualquier comportamiento por defecto inmediatamente
              e.preventDefault();
              e.stopPropagation();
              
              console.log('🔘 [ProjectGitHubSection] Evento prevenido, llamando handleConnectGitHub...');
              
              // Llamar a handleConnectGitHub sin await para evitar bloquear
              handleConnectGitHub(e).catch((err) => {
                console.error('❌ [ProjectGitHubSection] Error en handleConnectGitHub:', err);
              });
            }}
            type="button"
            className="inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 px-3 py-1.5 text-sm cursor-pointer z-10 relative"
            style={{ pointerEvents: 'auto' }}
            onMouseDown={(e) => {
              console.log('🖱️ [ProjectGitHubSection] MouseDown en botón Conectar');
              e.preventDefault();
              e.stopPropagation();
            }}
            onMouseUp={(e) => {
              console.log('🖱️ [ProjectGitHubSection] MouseUp en botón Conectar');
              e.preventDefault();
              e.stopPropagation();
            }}
            onMouseEnter={() => {
              console.log('🖱️ [ProjectGitHubSection] MouseEnter en botón Conectar');
            }}
            onMouseLeave={() => {
              console.log('🖱️ [ProjectGitHubSection] MouseLeave en botón Conectar');
            }}
          >
            {t('github.connect', 'Conectar')}
          </button>
        ) : (
          <div className="flex items-center gap-2 text-green-600">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium">{t('github.connected', 'Conectado')}</span>
          </div>
        )}
      </div>
      {error && (
        <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}

      {/* Formulario para vincular repositorio */}
      {status?.isConnected && (
        <div className="mt-4 space-y-3">
          {!showLinkForm ? (
            <Button
              onClick={handleShowLinkForm}
              variant="secondary"
              size="sm"
              className="w-full"
            >
              {t('github.linkRepo', 'Vincular Repositorio')}
            </Button>
          ) : (
            <div className="space-y-3">
              {/* Buscador de repositorios */}
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('github.searchRepos', 'Buscar repositorios...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={loadingRepos || linking}
                />
                <svg 
                  className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Lista de repositorios */}
              {loadingRepos ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
                </div>
              ) : filteredRepos.length > 0 ? (
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-200">
                  {filteredRepos.map((repo) => {
                    const isSelected = selectedRepo?.owner === repo.owner && selectedRepo?.repo === repo.name;
                    const isAlreadyLinked = status.linkedRepos.some(
                      linked => linked.owner === repo.owner && linked.repo === repo.name
                    );
                    
                    return (
                      <button
                        key={repo.id}
                        onClick={() => !isAlreadyLinked && setSelectedRepo({ owner: repo.owner, repo: repo.name })}
                        disabled={isAlreadyLinked || linking}
                        className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                        } ${isAlreadyLinked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-gray-900 truncate">
                                {repo.full_name}
                              </span>
                              {repo.private && (
                                <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                              )}
                              {isAlreadyLinked && (
                                <span className="text-xs text-green-600 font-medium">
                                  {t('github.alreadyLinked', 'Vinculado')}
                                </span>
                              )}
                            </div>
                            {repo.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                {repo.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-1">
                              {repo.language && (
                                <span className="text-xs text-gray-400">{repo.language}</span>
                              )}
                              <span className="text-xs text-gray-400">
                                {new Date(repo.updated_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          {isSelected && !isAlreadyLinked && (
                            <svg className="w-5 h-5 text-indigo-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : error && (error.includes('expirado') || error.includes('reconecta') || error.includes('descifrar') || error.includes('no es válido') || error.includes('permisos')) ? (
                <div className="text-center py-8 space-y-3">
                  <p className="text-sm text-amber-600">
                    {error}
                  </p>
                  <Button
                    onClick={handleConnectGitHub}
                    variant="primary"
                    size="sm"
                  >
                    {t('github.reconnect', 'Reconectar GitHub')}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 space-y-3">
                  <p className="text-sm text-gray-500">
                    {searchTerm 
                      ? t('github.noReposFound', 'No se encontraron repositorios')
                      : error 
                      ? error
                      : t('github.noRepos', 'No tienes repositorios disponibles')}
                  </p>
                  {!error && !searchTerm && (
                    <div className="text-xs text-gray-400 space-y-2">
                      <p>Si tienes repositorios en GitHub pero no aparecen aquí:</p>
                      <div className="flex gap-2 justify-center">
                        <Button
                          onClick={async () => {
                            try {
                              setError(null);
                              const response = await githubService.testConnection();
                              if (response.success && response.data) {
                                const testData = response.data;
                                console.log('🔍 [ProjectGitHubSection] Resultado de prueba:', testData);
                                const errorMsg = `Prueba de conexión:\nUsuario: ${testData.user?.login || 'N/A'}\nRepos (all): ${testData.repos_all?.count || 0}\nRepos (owner): ${testData.repos_owner?.count || 0}\nRepos (member): ${testData.repos_member?.count || 0}\nErrores: ${testData.errors?.join(', ') || 'Ninguno'}`;
                                alert(errorMsg);
                                if (testData.errors && testData.errors.length > 0) {
                                  setError(`Errores detectados: ${testData.errors.join('; ')}`);
                                }
                              } else {
                                setError((response as any).message || (response as any).error || 'Error en prueba de conexión');
                              }
                            } catch (err: any) {
                              setError(err.message || 'Error al probar conexión');
                            }
                          }}
                          variant="secondary"
                          size="sm"
                        >
                          🔍 Probar Conexión
                        </Button>
                        <Button
                          onClick={handleConnectGitHub}
                          variant="secondary"
                          size="sm"
                        >
                          {t('github.reconnect', 'Reconectar GitHub')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex gap-2">
                <Button
                  onClick={handleLinkRepository}
                  variant="primary"
                  size="sm"
                  disabled={linking || !selectedRepo || status.linkedRepos.some(
                    linked => linked.owner === selectedRepo.owner && linked.repo === selectedRepo.repo
                  )}
                  className="flex-1"
                >
                  {linking ? t('github.linking', 'Vinculando...') : t('github.link', 'Vincular')}
                </Button>
                <Button
                  onClick={() => {
                    setShowLinkForm(false);
                    setSelectedRepo(null);
                    setSearchTerm('');
                    setError(null);
                  }}
                  variant="secondary"
                  size="sm"
                  disabled={linking}
                >
                  {t('common.cancel', 'Cancelar')}
                </Button>
              </div>
            </div>
          )}

          {/* Lista de repos vinculados */}
          {status.linkedRepos.length > 0 && (
            <div className="mt-3 space-y-3">
              <h5 className="text-xs font-semibold text-gray-700">
                {t('github.linkedRepos', 'Repositorios Vinculados')}
              </h5>
              <div className="space-y-1">
                {status.linkedRepos.map((linkedRepo) => (
                  <div
                    key={linkedRepo.id}
                    className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs text-gray-700 font-mono">
                        {linkedRepo.owner}/{linkedRepo.repo}
                      </span>
                    </div>
                    <button
                      onClick={() => handleUnlinkRepository(linkedRepo.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title={t('github.unlink', 'Desvincular')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Últimos commits - Siempre visible */}
              <div className="mt-3">
                <h5 className="text-xs font-semibold text-gray-700 mb-2">
                  {t('github.recentCommits', 'Últimos 5 Commits')}
                </h5>
                {loadingCommits ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></div>
                    <span className="ml-2 text-xs text-gray-500">Cargando commits...</span>
                  </div>
                ) : recentCommits.length > 0 ? (
                  <div className="space-y-2">
                    {recentCommits.map((commit) => (
                      <a
                        key={commit.sha}
                        href={commit.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-2 bg-white rounded border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all group"
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-900 font-medium line-clamp-2 group-hover:text-indigo-600">
                              {commit.commit?.message?.split('\n')[0] || 'Sin mensaje'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500 font-mono">
                                {commit.sha?.substring(0, 7) || 'N/A'}
                              </span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">
                                {commit.commit?.author?.date 
                                  ? new Date(commit.commit.author.date).toLocaleDateString('es-ES', {
                                      day: '2-digit',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  : 'N/A'}
                              </span>
                              {commit.linkedTask && (
                                <>
                                  <span className="text-xs text-gray-400">•</span>
                                  <span className="text-xs text-indigo-600 font-medium">
                                    → {t('github.linkedToTask', 'Tarea')} #{commit.linkedTask.id}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-gray-500 bg-gray-50 rounded border border-gray-200">
                    {t('github.noCommits', 'No hay commits recientes')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectGitHubSection;

