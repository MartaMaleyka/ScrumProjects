// Configuración centralizada de las URLs de API

// Función helper para verificar si estamos en el navegador
const isBrowser = () => typeof window !== 'undefined';

// Configuración de URLs base
const getApiUrl = (): string => {
  // Si estamos en el navegador, usar el proxy de Astro
  if (isBrowser()) {
    // En desarrollo, usar el proxy de Astro (relativo)
    // El proxy redirige /api a http://localhost:3001/api o http://api:3001/api en Docker
    return '/api';
  }
  
  // Para SSR o entornos sin navegador (incluyendo Docker)
  // En Docker, será 'http://api:3001', en desarrollo local será 'http://localhost:3001'
  let apiUrl = 'http://localhost:3001';
  
  // Intentar obtener API_URL de diferentes formas (compatibilidad)
  // En Node.js/SSR, process.env está disponible
  try {
    // @ts-ignore - process solo existe en Node.js/SSR
    if (typeof process !== 'undefined' && process.env?.API_URL) {
      // @ts-ignore
      apiUrl = process.env.API_URL;
    }
  } catch (e) {
    // process no está disponible (cliente)
  }
  
  // También verificar import.meta.env (Astro/Vite) - disponible en ambos contextos
  try {
    const metaEnv = (import.meta as any)?.env;
    if (metaEnv?.API_URL) {
      apiUrl = metaEnv.API_URL;
    }
  } catch (e) {
    // import.meta no está disponible
  }
  
  return `${apiUrl}/api`;
};

// Configuración de timeout para las peticiones
export const REQUEST_TIMEOUT = 60000; // 60 segundos (aumentado para dar más tiempo al servidor)

// URLs exportadas
export const API_BASE_URL = getApiUrl();

// Función helper para crear un fetch con timeout
export const fetchWithTimeout = async (
  url: string, 
  options: RequestInit = {}, 
  timeout: number = REQUEST_TIMEOUT
): Promise<Response> => {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  // Configurar timeout solo si se proporciona un valor válido
  if (timeout > 0) {
    timeoutId = setTimeout(() => {
      if (!controller.signal.aborted) {
        console.warn(`⏱️ Timeout alcanzado (${timeout}ms) para: ${url}`);
        controller.abort();
      }
    }, timeout);
  }
  
  // Debug logging
  console.log('🌐 fetchWithTimeout - Iniciando petición:', {
    url,
    method: options.method || 'GET',
    timeout: timeout > 0 ? `${timeout}ms` : 'sin timeout',
    hasSignal: !!options.signal,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Combinar signals si ya existe uno
    const signal = options.signal 
      ? (() => {
          const combinedController = new AbortController();
          const abort = () => combinedController.abort();
          options.signal?.addEventListener('abort', abort);
          controller.signal.addEventListener('abort', () => {
            options.signal?.removeEventListener('abort', abort);
            combinedController.abort();
          });
          return combinedController.signal;
        })()
      : controller.signal;
    
    console.log('🔍 [DEBUG] fetchWithTimeout - Realizando fetch:', {
      url,
      method: options.method || 'GET',
      hasSignal: !!signal,
      signalAborted: signal?.aborted,
      timestamp: new Date().toISOString()
    });
    
    const response = await fetch(url, {
      ...options,
      signal
    });
    
    // Limpiar timeout si la respuesta fue exitosa
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    console.log('✅ [DEBUG] fetchWithTimeout - Respuesta recibida:', {
      url,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      type: response.type,
      redirected: response.redirected,
      timestamp: new Date().toISOString()
    });
    
    return response;
  } catch (error: any) {
    // Limpiar timeout en caso de error
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    console.error('❌ [DEBUG] fetchWithTimeout - Error en petición:', {
      url,
      error: error?.message || 'Error desconocido',
      name: error?.name || 'Unknown',
      type: error?.constructor?.name || 'Unknown',
      aborted: controller.signal.aborted,
      code: error?.code,
      cause: error?.cause,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      // Información adicional del navegador
      ...(typeof window !== 'undefined' && {
        navigatorOnline: navigator.onLine,
        location: window.location.href
      })
    });
    
    // Verificar si es un error de aborto (timeout)
    if (error?.name === 'AbortError' || error?.message?.includes('aborted') || controller.signal.aborted) {
      console.error('⏱️ [DEBUG] fetchWithTimeout - Timeout detectado:', {
        timeout,
        url,
        timestamp: new Date().toISOString()
      });
      throw new Error('La petición tardó demasiado tiempo. El servidor puede no estar disponible.');
    }
    
    // Verificar si es un error de red (incluyendo "Load failed")
    const networkErrorPatterns = [
      'Failed to fetch',
      'NetworkError',
      'Network request failed',
      'Load failed',
      'fetch failed',
      'ERR_INTERNET_DISCONNECTED',
      'ERR_NETWORK_CHANGED',
      'ERR_CONNECTION_REFUSED',
      'ERR_CONNECTION_RESET',
      'ERR_CONNECTION_TIMED_OUT',
      'ERR_NAME_NOT_RESOLVED'
    ];
    
    const isNetworkError = networkErrorPatterns.some(pattern => 
      error?.message?.includes(pattern) || 
      error?.name?.includes(pattern) ||
      error?.code?.includes(pattern)
    );
    
    if (isNetworkError) {
      console.error('🌐 [DEBUG] fetchWithTimeout - Error de red detectado:', {
        errorMessage: error?.message,
        errorName: error?.name,
        errorCode: error?.code,
        url,
        navigatorOnline: typeof window !== 'undefined' ? navigator.onLine : 'N/A',
        timestamp: new Date().toISOString()
      });
      
      // Mensaje más específico según el tipo de error
      if (error?.message?.includes('Load failed') || error?.message?.includes('fetch failed')) {
        throw new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet o que el servidor esté disponible.');
      }
      
      throw new Error('Error de conexión. Por favor, verifica tu conexión a internet.');
    }
    
    // Re-lanzar el error original si no es un caso conocido
    console.error('❌ [DEBUG] fetchWithTimeout - Error desconocido, re-lanzando:', {
      error: error?.message,
      name: error?.name,
      type: error?.constructor?.name,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

// Función helper para obtener el token de autenticación
export const getAuthToken = (): string | null => {
  if (isBrowser()) {
    return localStorage.getItem('authToken');
  }
  return null;
};

// Función helper para manejar respuestas de la API
export const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('❌ Error de API:', {
      status: response.status,
      statusText: response.statusText,
      errorData: errorData,
      url: response.url
    });
    
    // Manejar errores 401 específicos de sesión expirada por inactividad
    if (response.status === 401) {
      const reason = errorData.reason || '';
      
      // Si es error de inactividad, limpiar sesión y redirigir
      if (reason === 'session_inactive_timeout' || errorData.message?.includes('inactividad')) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('authToken');
          localStorage.removeItem('sessionInactivityExpiresAt');
          localStorage.removeItem('sessionExpiresAt');
          localStorage.removeItem('sessionInactivityTimeout');
          
          // Redirigir al login con parámetro de expiración
          window.location.href = '/login-moderno?expired=inactivity';
        }
        throw new Error('Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.');
      }
      
      // Si es error de sesión expirada por tiempo total
      if (reason === 'session_expired' || errorData.message?.includes('expirada')) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('authToken');
          localStorage.removeItem('sessionInactivityExpiresAt');
          localStorage.removeItem('sessionExpiresAt');
          localStorage.removeItem('sessionInactivityTimeout');
          
          window.location.href = '/login-moderno?expired=timeout';
        }
        throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      }
    }
    
    // Crear un error con toda la información de errorData para que pueda ser accedida
    const error: any = new Error(errorData.message || errorData.error || `Error ${response.status}: ${response.statusText}`);
    error.response = errorData;
    error.status = response.status;
    throw error;
  }
  return response.json();
};

// Función helper para hacer peticiones autenticadas
export const authenticatedRequest = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  if (!token) {
    console.error('❌ authenticatedRequest - No hay token de autenticación');
    throw new Error('No hay token de autenticación');
  }

  console.log('🔧 authenticatedRequest - Iniciando petición autenticada:', {
    url,
    method: options.method || 'GET',
    hasToken: !!token,
    tokenLength: token.length,
    timestamp: new Date().toISOString()
  });

  const requestOptions = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  };

  try {
    const response = await fetchWithTimeout(url, requestOptions);
    const result = await handleApiResponse(response);
    
    console.log('✅ authenticatedRequest - Petición exitosa:', {
      url,
      status: response.status,
      resultKeys: Object.keys(result || {}),
      timestamp: new Date().toISOString()
    });
    
    return result;
  } catch (error: any) {
    console.error('❌ authenticatedRequest - Error en petición:', {
      url,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    if (error.message.includes('tardó demasiado tiempo')) {
      console.error('⏱️ Timeout en la petición:', url);
      throw new Error('El servidor no responde. Por favor, verifica tu conexión o intenta más tarde.');
    }
    throw error;
  }
};

// Log de configuración actual
if (isBrowser()) {
  console.log('🔧 Configuración de API final:', {
    API_BASE_URL,
    hostname: window.location.hostname,
    port: window.location.port,
    isDevelopment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    fullUrl: window.location.href,
    userAgent: navigator.userAgent
  });
}

export default {
  API_BASE_URL,
  REQUEST_TIMEOUT,
  fetchWithTimeout,
  getAuthToken,
  handleApiResponse,
  authenticatedRequest
};
