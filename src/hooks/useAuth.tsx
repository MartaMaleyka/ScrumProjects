import { useState, useEffect, createContext, useContext, useCallback, useMemo, useRef } from 'react';
import type { User } from '../services/authService';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginUnified: (emailOrUsername: string, password: string) => Promise<boolean>;
  logout: () => void;
}

// Contexto de autenticación
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default context value for when AuthProvider is not available (evita spinner infinito en islas Astro)
export const defaultAuthContext = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: async () => false,
  loginUnified: async () => false,
  logout: () => {},
};

// Hook personalizado para usar el contexto de autenticación
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  // Si el contexto no está disponible, retornar valores por defecto
  if (context === undefined) {
    return defaultAuthContext;
  }
  
  return context;
};

// Proveedor del contexto de autenticación
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Función para verificar autenticación
  const checkAuthStatus = useCallback(async () => {
    try {
      // Verificar que estemos en el navegador
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
      }
      
      const token = authService.getToken();
      
      if (!token) {
        setUser(null);
        return;
      }

      // Obtener usuario actual
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        authService.startTokenMonitoring();
      } catch (error: any) {
        // Si falla, limpiar token
        if (error.message?.includes('Sesión expirada') || error.message?.includes('401')) {
          authService.clearToken();
          setUser(null);
        }
      }
    } catch (error) {
      authService.clearToken();
      setUser(null);
    }
  }, []);

  // Verificación inicial de autenticación
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const initializeAuth = async () => {
      if (typeof window === 'undefined') {
        if (isMounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
        return;
      }

      try {
        const token = authService.getToken();
        console.log('🔍 [useAuth] Inicializando autenticación, token:', token ? 'existe' : 'no existe');
        
        // Si hay token, intentar cargar el usuario
        if (token) {
          try {
            console.log('🔍 [useAuth] Intentando obtener usuario actual...');
            // Agregar timeout adicional para la petición (2 segundos)
            const userPromise = authService.getCurrentUser();
            const timeoutPromise = new Promise<User>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout en getCurrentUser')), 2000)
            );
            
            const currentUser = await Promise.race([userPromise, timeoutPromise]);
            console.log('✅ [useAuth] Usuario obtenido:', currentUser);
            if (isMounted) {
              setUser(currentUser);
              setIsLoading(false);
              setIsInitialized(true);
              authService.startTokenMonitoring();
              // Limpiar timeout si se completó exitosamente
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }
            }
          } catch (error: any) {
            console.error('❌ [useAuth] Error al obtener usuario:', error);
            if (isMounted) {
              // Si es un error de timeout o conexión, limpiar token
              if (error.message?.includes('Timeout') || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
                console.warn('⚠️ [useAuth] Error de conexión, limpiando token');
                authService.clearToken();
              }
              setUser(null);
              setIsLoading(false);
              setIsInitialized(true);
              // Limpiar timeout
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }
            }
          }
        } else {
          console.log('⚠️ [useAuth] No hay token, usuario será null');
          if (isMounted) {
            setUser(null);
            setIsLoading(false);
            setIsInitialized(true);
            // Limpiar timeout
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
          }
        }
      } catch (error) {
        console.error('❌ [useAuth] Error en inicialización:', error);
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
          setIsInitialized(true);
          // Limpiar timeout
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        }
      }
    };

    // Timeout de seguridad: si después de 3 segundos no se ha inicializado, forzar finalización
    timeoutId = setTimeout(() => {
      console.warn('⚠️ [useAuth] Timeout en inicialización (3s), forzando finalización');
      // Forzar finalización siempre, sin verificar isMounted para evitar problemas
      setIsLoading((prev) => {
        if (prev) {
          console.warn('⚠️ [useAuth] Forzando isLoading a false por timeout');
        }
        return false;
      });
      setIsInitialized((prev) => {
        if (!prev) {
          console.warn('⚠️ [useAuth] Forzando isInitialized a true por timeout');
        }
        return true;
      });
      // Limpiar token si hay problemas de conexión
      try {
        const token = authService.getToken();
        if (token) {
          console.warn('⚠️ [useAuth] Limpiando token por timeout');
          authService.clearToken();
        }
      } catch (e) {
        console.error('Error al limpiar token:', e);
      }
    }, 3000);

    initializeAuth();

    // Cleanup: detener monitoreo cuando el componente se desmonte
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      authService.stopTokenMonitoring();
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const loginResponse = await authService.login({ email, password });
      
      if (loginResponse.success && loginResponse.token) {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        authService.startTokenMonitoring();
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginUnified = useCallback(async (emailOrUsername: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Limpiar token inválido antes del login
      authService.clearToken();
      
      const loginResponse = await authService.loginUnified({ emailOrUsername, password });
      
      if (loginResponse.success && loginResponse.token) {
        // Obtener usuario del servidor
        try {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
          authService.startTokenMonitoring();
          return true;
        } catch (error: any) {
          // Si falla obtener usuario pero el login fue exitoso, usar datos del login
          if (loginResponse.user) {
            setUser(loginResponse.user);
            authService.startTokenMonitoring();
            return true;
          }
          throw error;
        }
      }
      
      return false;
    } catch (error: any) {
      // Limpiar token en caso de error
      authService.clearToken();
      setUser(null);
      // Propagar el error para que el componente pueda mostrar el mensaje específico
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Detener monitoreo de tokens antes del logout
      authService.stopTokenMonitoring();
      
      await authService.logout();
    } catch (error) {
      // Ignorar errores en logout
    } finally {
      setUser(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/login-moderno';
      }
    }
  }, []);

  // Calcular el valor del contexto - usar useMemo pero asegurar que se actualice
  // El loading es true solo si isLoading es true Y aún no está inicializado
  // Una vez inicializado, isLoading debe ser false para que loading sea false
  const loading = isLoading || !isInitialized;
  const contextValue = useMemo(() => {
    const value = {
      user,
      isAuthenticated: !!user,
      isLoading: loading,
      login,
      loginUnified,
      logout
    };
    console.log('🔍 [useAuth] Context value calculado:', {
      user: user ? `${user.name} (${user.email})` : 'null',
      isLoading: loading,
      isInitialized,
      isAuthenticated: !!user,
      rawIsLoading: isLoading,
      rawIsInitialized: isInitialized,
      timestamp: new Date().toISOString()
    });
    return value;
  }, [user, isLoading, isInitialized, loading, login, loginUnified, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

