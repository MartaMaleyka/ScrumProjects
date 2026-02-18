import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import LanguageToggle from '../common/LanguageToggle';
import i18n from '../../i18n';

interface AppSidebarLayoutProps {
  children: React.ReactNode;
}

const AppSidebarLayout: React.FC<AppSidebarLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isI18nReady, setIsI18nReady] = useState(false);
  const authContext = useAuth();
  
  // Asegurarse de que i18n esté inicializado antes de renderizar
  useEffect(() => {
    const checkReady = () => {
      if (i18n.isInitialized && i18n.hasResourceBundle(i18n.language || 'es', 'translation')) {
        setIsI18nReady(true);
        return true;
      }
      return false;
    };

    // Verificar inmediatamente
    if (checkReady()) {
      return;
    }

    // Si no está listo, esperar al evento de inicialización
    const handleInitialized = () => {
      if (checkReady()) {
        setIsI18nReady(true);
      }
    };

    i18n.on('initialized', handleInitialized);
    i18n.on('loaded', handleInitialized);

    // Timeout de seguridad
    const timeout = setTimeout(() => {
      if (!isI18nReady) {
        console.warn('⚠️ [AppSidebarLayout] i18n no se inicializó en 2 segundos, forzando ready');
        setIsI18nReady(true);
      }
    }, 2000);

    return () => {
      i18n.off('initialized', handleInitialized);
      i18n.off('loaded', handleInitialized);
      clearTimeout(timeout);
    };
  }, []);
  
  // Leer directamente del contexto en cada render
  // Usar estado local que se sincroniza con el contexto para forzar re-render
  const [user, setUser] = useState(authContext.user);
  const [isLoading, setIsLoading] = useState(authContext.isLoading);
  const [isAuthenticated, setIsAuthenticated] = useState(authContext.isAuthenticated);
  const logout = authContext.logout;
  
  // Sincronizar estado local con el contexto cuando cambie
  // Usar valores específicos en las dependencias para detectar cambios
  useEffect(() => {
    const contextUser = authContext.user;
    const contextIsLoading = authContext.isLoading;
    const contextIsAuthenticated = authContext.isAuthenticated;
    
    console.log('🔄 [AppSidebarLayout] Sincronizando con contexto:', {
      contextUser: contextUser ? `${contextUser.name} (${contextUser.email})` : 'null',
      contextUserId: contextUser?.id,
      contextIsLoading,
      contextIsAuthenticated,
      currentUser: user ? `${user?.name} (${user?.email})` : 'null',
      currentUserId: user?.id,
      currentIsLoading: isLoading,
      userChanged: user?.id !== contextUser?.id,
      loadingChanged: isLoading !== contextIsLoading,
      timestamp: new Date().toISOString()
    });
    
    // Actualizar estado local si hay cambios - siempre actualizar para forzar re-render
    setUser(contextUser);
    setIsLoading(contextIsLoading);
    setIsAuthenticated(contextIsAuthenticated);
  }, [authContext.user?.id, authContext.isLoading, authContext.isAuthenticated]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Usar valores por defecto si i18n no está listo para evitar problemas de hidratación
  const menuItems = [
    { 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      label: isI18nReady ? t('nav.projects') : 'Proyectos', 
      href: '/scrum' 
    },
    { 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      label: isI18nReady ? t('nav.configuration') : 'Configuración', 
      href: '/configuracion' 
    },
  ];

  // Usar estado para currentPath para evitar diferencias entre servidor y cliente
  const [currentPath, setCurrentPath] = useState('');
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentPath(window.location.pathname + window.location.search);
      
      // Escuchar cambios en la URL
      const handlePopState = () => {
        setCurrentPath(window.location.pathname + window.location.search);
      };
      
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  // Usar key para forzar re-render cuando cambien los valores del contexto
  const contextKey = useMemo(() => {
    return `${user?.id || 'no-user'}-${isLoading}-${isAuthenticated}`;
  }, [user?.id, isLoading, isAuthenticated]);

  // Debug: mostrar valores actuales
  console.log('🔍 [AppSidebarLayout] Render actual:', {
    user: user ? `${user.name} (${user.email})` : 'null',
    userId: user?.id,
    isLoading,
    isAuthenticated,
    contextKey,
    timestamp: new Date().toISOString()
  });

  return (
    <div key={contextKey} className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Minimalista */}
      <aside
        className={`
          bg-white border-r border-gray-200
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'w-64' : 'w-16'}
          ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
          fixed lg:static inset-y-0 left-0 z-50
          shadow-sm lg:shadow-none
          flex flex-col
        `}
      >
        {/* Header Minimalista */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="font-semibold text-gray-900 text-sm">Sprintiva</span>
            </div>
          )}
          {!sidebarOpen && (
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
            aria-label="Toggle sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {sidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Navigation Minimalista */}
        <nav className="flex-1 overflow-y-auto p-2">
          {menuItems.map((item) => {
            // Solo calcular isActive en el cliente para evitar diferencias de hidratación
            const isActive = typeof window !== 'undefined' && currentPath 
              ? (currentPath === item.href || currentPath.startsWith(item.href.split('?')[0]))
              : false;
            
            const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
              if (typeof window === 'undefined') return;
              
              const currentPath = window.location.pathname;
              
              // Si estamos navegando hacia configuracion, siempre recargar página
              if (item.href.startsWith('/configuracion')) {
                // Permitir navegación normal del navegador (recarga la página)
                return;
              }
              
              // Si estamos en configuracion y vamos a otra página, recargar
              if (currentPath.startsWith('/configuracion')) {
                // Permitir navegación normal del navegador (recarga la página)
                return;
              }
              
              // Si estamos en /scrum y navegamos dentro de /scrum, usar navegación sin recargar
              if (currentPath.startsWith('/scrum') && item.href.startsWith('/scrum')) {
                e.preventDefault();
                
                // Actualizar la URL
                window.history.pushState({}, '', item.href);
                
                // Disparar evento popstate primero (nativo del navegador)
                const popStateEvent = new PopStateEvent('popstate', { state: {} });
                window.dispatchEvent(popStateEvent);
                
                // También disparar un evento personalizado con más información
                const customEvent = new CustomEvent('navigation', { 
                  detail: { 
                    href: item.href,
                    pathname: window.location.pathname,
                    search: window.location.search
                  } 
                });
                window.dispatchEvent(customEvent);
                
                // Si vamos a /scrum (sin parámetros), resetear a vista de proyectos
                if (item.href === '/scrum' || item.href === '/scrum?') {
                  const resetEvent = new CustomEvent('scrum-navigation', {
                    detail: { view: 'projects', href: item.href }
                  });
                  window.dispatchEvent(resetEvent);
                }
              } else if (item.href.startsWith('/scrum')) {
                // Si estamos en otra página y vamos a /scrum, recargar completamente
                // No prevenir el comportamiento por defecto, dejar que el navegador recargue
                return;
              } else {
                // Para cualquier otra ruta, permitir navegación normal
                return;
              }
            };
            
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={handleClick}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg mb-1
                  transition-all duration-150 cursor-pointer
                  ${isActive 
                    ? 'bg-indigo-50 text-indigo-600' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
                title={sidebarOpen ? undefined : item.label}
              >
                <span className={`flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-gray-500'}`}>
                  {item.icon}
                </span>
                {sidebarOpen && (
                  <span className={`text-sm font-medium ${isActive ? 'text-indigo-600' : 'text-gray-700'}`}>
                    {item.label}
                  </span>
                )}
              </a>
            );
          })}
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden min-w-0 flex flex-col">
        {/* Header con Usuario */}
        <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div className="ml-auto flex items-center gap-3">
            <LanguageToggle />
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-indigo-600"></div>
                <span className="text-sm text-gray-500">Cargando usuario...</span>
              </div>
            ) : user ? (
              <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {user.name || 'Usuario'}
                </p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white font-semibold text-xs">
                  {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <button
                onClick={() => logout()}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
                title="Cerrar sesión"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <a
                  href="/login-moderno"
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Iniciar sesión
                </a>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AppSidebarLayout;
