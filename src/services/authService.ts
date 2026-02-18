// Servicio de autenticación simplificado para Gestor de Proyectos
import { API_BASE_URL, fetchWithTimeout, REQUEST_TIMEOUT } from '../config/api';

export interface LoginCredentials {
  email?: string;
  username?: string;
  password: string;
}

export interface UnifiedLoginCredentials {
  emailOrUsername: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
  authType?: 'internal' | 'external' | 'keycloak';
}

export interface User {
  id: number;
  email: string;
  username: string;
  name: string;
  avatar?: string | null;
  globalRole?: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER';
  isActive: boolean;
  lastLogin?: Date | string | null;
  createdAt?: string;
  updatedAt?: string;
  organizationId?: number;
  organization?: {
    id: number;
    name: string;
    slug: string;
  };
  role?: {
    id: number;
    name: string;
    slug: string;
  };
}

// Función helper para verificar si estamos en el navegador
const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

class AuthService {
  private token: string | null = null;
  private tokenMonitoringInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Solo recuperar token del localStorage si estamos en el navegador
    if (isBrowser()) {
      this.token = localStorage.getItem('authToken');
    }
  }

  // Obtener el token actual
  getToken(): string | null {
    return this.token;
  }

  // Establecer el token
  setToken(token: string): void {
    this.token = token;
    if (isBrowser()) {
      localStorage.setItem('authToken', token);
    }
  }

  // Limpiar el token
  clearToken(): void {
    this.token = null;
    if (isBrowser()) {
      localStorage.removeItem('authToken');
    }
  }

  // Login con email
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      }, REQUEST_TIMEOUT);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Error en el login');
      }

      const data: LoginResponse = await response.json();
      
      // Guardar el token
      if (data.token) {
        this.setToken(data.token);
      }
      
      return data;
    } catch (error: any) {
      const errorMessage = error.message || 'Error al iniciar sesión';
      throw new Error(errorMessage);
    }
  }

  // Login unificado (email o username)
  async loginUnified(credentials: UnifiedLoginCredentials): Promise<LoginResponse> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/auth/login-unified`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      }, REQUEST_TIMEOUT);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Error en el login');
      }

      const data: LoginResponse = await response.json();
      
      // Guardar el token
      if (data.token) {
        this.setToken(data.token);
      }
      
      return data;
    } catch (error: any) {
      const errorMessage = error.message || 'Error al iniciar sesión';
      throw new Error(errorMessage);
    }
  }

  // Obtener usuario actual
  async getCurrentUser(): Promise<User> {
    const token = this.getToken();
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }, REQUEST_TIMEOUT);

      if (!response.ok) {
        if (response.status === 401) {
          this.clearToken();
          throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        }
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch (e) {
          // Si no se puede parsear el JSON, usar el texto de la respuesta
          const text = await response.text().catch(() => 'Error desconocido');
          throw new Error(`Error ${response.status}: ${text}`);
        }
        throw new Error(errorData.message || errorData.error || `Error al obtener usuario (${response.status})`);
      }

      const data = await response.json();
      
      // Verificar que la respuesta tenga la estructura esperada
      if (!data || !data.user) {
        console.error('❌ [authService] Respuesta inesperada de /auth/me:', data);
        throw new Error('Formato de respuesta inválido del servidor');
      }
      
      return data.user;
    } catch (error: any) {
      console.error('❌ [authService] Error en getCurrentUser:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      const errorMessage = error.message || 'Error al obtener usuario';
      throw new Error(errorMessage);
    }
  }

  // Validar token
  async validateToken(): Promise<boolean> {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Logout
  async logout(): Promise<void> {
    const token = this.getToken();
    
    if (token) {
      try {
        await fetchWithTimeout(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }, REQUEST_TIMEOUT);
      } catch (error) {
        // Ignorar errores en logout
      }
    }

    this.clearToken();
    this.stopTokenMonitoring();
  }

  // Iniciar monitoreo de tokens (simplificado)
  startTokenMonitoring(): void {
    this.stopTokenMonitoring();
    
    // Verificar token cada 5 minutos
    this.tokenMonitoringInterval = setInterval(async () => {
      const isValid = await this.validateToken();
      if (!isValid) {
        this.clearToken();
        if (isBrowser()) {
          window.location.href = '/login-moderno';
        }
      }
    }, 5 * 60 * 1000); // 5 minutos
  }

  // Detener monitoreo de tokens
  stopTokenMonitoring(): void {
    if (this.tokenMonitoringInterval) {
      clearInterval(this.tokenMonitoringInterval);
      this.tokenMonitoringInterval = null;
    }
  }
}

// Exportar instancia única del servicio
export const authService = new AuthService();

