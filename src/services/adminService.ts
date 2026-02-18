import { API_BASE_URL, fetchWithTimeout, REQUEST_TIMEOUT } from '../config/api';
import { authService } from './authService';

export interface AdminUser {
  id: number;
  email: string;
  username: string | null;
  name: string;
  avatar?: string | null;
  globalRole: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER';
  isActive: boolean;
  lastLogin?: string | null;
  createdAt: string;
  updatedAt: string;
  organizationId?: number;
  organization?: {
    id: number;
    name: string;
    slug: string;
  };
}

export interface RoleInfo {
  globalRoles: {
    value: string;
    label: string;
    description: string;
  }[];
  projectRoles: {
    value: string;
    label: string;
    description: string;
  }[];
  permissions: {
    role: string;
    module: string;
    read: boolean;
    write: boolean;
    manage: boolean;
  }[];
}

// Helper para hacer requests autenticados
const authenticatedRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = authService.getToken();
  if (!token) {
    throw new Error('No hay token de autenticación');
  }

  const url = `${API_BASE_URL}${endpoint}`;
  console.log('🌐 [adminService] Haciendo request a:', url);

  try {
    const response = await fetchWithTimeout(
      url,
      {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      },
      REQUEST_TIMEOUT
    );

    console.log('📥 [adminService] Respuesta recibida:', {
      url,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    return response;
  } catch (error: any) {
    console.error('❌ [adminService] Error en request:', {
      url,
      error: error.message,
      name: error.name
    });
    throw error;
  }
};

class AdminService {
  // Obtener todos los usuarios
  async getUsers(): Promise<AdminUser[]> {
    try {
      const response = await authenticatedRequest('/admin/users');
      
      if (!response.ok) {
        if (response.status === 401) {
          authService.clearToken();
          throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        }
        if (response.status === 403) {
          throw new Error('No tienes permisos para ver usuarios. Se requiere rol SUPER_ADMIN, ADMIN o MANAGER.');
        }
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [adminService] Error al obtener usuarios:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(errorData.message || errorData.error || `Error al obtener usuarios (${response.status})`);
      }

      const data = await response.json();
      console.log('✅ [adminService] Respuesta completa:', data);
      
      // La respuesta tiene estructura: { success: true, message: '...', data: { users: [...] } }
      if (data.data && data.data.users) {
        console.log('✅ [adminService] Usuarios obtenidos desde data.data.users:', data.data.users.length);
        return data.data.users;
      }
      
      // Fallback: buscar users directamente en data
      if (data.users) {
        console.log('✅ [adminService] Usuarios obtenidos desde data.users:', data.users.length);
        return data.users;
      }
      
      console.warn('⚠️ [adminService] Estructura de respuesta inesperada:', data);
      return [];
    } catch (error: any) {
      console.error('❌ [adminService] Error en getUsers:', error);
      throw error;
    }
  }

  // Cambiar rol de un usuario (solo ADMIN)
  async updateUserRole(userId: number, globalRole: 'ADMIN' | 'MANAGER' | 'USER'): Promise<void> {
    const response = await authenticatedRequest(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ globalRole }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        authService.clearToken();
        throw new Error('Sesión expirada');
      }
      if (response.status === 403) {
        throw new Error('No tienes permiso para cambiar roles');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Error al actualizar rol');
    }
  }

  // Cambiar estado de un usuario (ADMIN/MANAGER)
  async updateUserStatus(userId: number, isActive: boolean): Promise<void> {
    const response = await authenticatedRequest(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        authService.clearToken();
        throw new Error('Sesión expirada');
      }
      if (response.status === 403) {
        throw new Error('No tienes permiso para cambiar el estado de usuarios');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Error al actualizar estado');
    }
  }

  // Obtener información de roles y permisos
  async getRoles(): Promise<RoleInfo> {
    try {
      const response = await authenticatedRequest('/admin/roles');
      
      if (!response.ok) {
        if (response.status === 401) {
          authService.clearToken();
          throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        }
        if (response.status === 403) {
          throw new Error('No tienes permisos para ver roles. Se requiere rol ADMIN o MANAGER.');
        }
        // Si el endpoint no existe, retornar datos por defecto
        if (response.status === 404) {
          return this.getDefaultRoles();
        }
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [adminService] Error al obtener roles:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(errorData.message || errorData.error || `Error al obtener roles (${response.status})`);
      }

      const data = await response.json();
      console.log('✅ [adminService] Respuesta completa de roles:', data);
      
      // La respuesta tiene estructura: { success: true, message: '...', data: { ... } }
      if (data.data) {
        console.log('✅ [adminService] Roles obtenidos desde data.data');
        return data.data;
      }
      
      // Fallback: si data ya es RoleInfo directamente
      if (data.globalRoles && data.projectRoles) {
        console.log('✅ [adminService] Roles obtenidos directamente desde data');
        return data;
      }
      
      console.warn('⚠️ [adminService] Estructura de respuesta inesperada para roles:', data);
      // Si no se puede parsear, retornar datos por defecto
      return this.getDefaultRoles();
    } catch (error: any) {
      console.error('❌ [adminService] Error en getRoles:', error);
      // Si falla, retornar datos por defecto
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        return this.getDefaultRoles();
      }
      throw error;
    }
  }

  // Datos por defecto si el endpoint no existe
  private getDefaultRoles(): RoleInfo {
    return {
      globalRoles: [
        {
          value: 'ADMIN',
          label: 'Administrador',
          description: 'Acceso total al sistema. Puede gestionar usuarios, proyectos y todas las funcionalidades.',
        },
        {
          value: 'MANAGER',
          label: 'Gerente',
          description: 'Puede crear proyectos y gestionar miembros en cualquier proyecto.',
        },
        {
          value: 'USER',
          label: 'Usuario',
          description: 'Solo puede ver proyectos donde es miembro.',
        },
      ],
      projectRoles: [
        {
          value: 'PRODUCT_OWNER',
          label: 'Product Owner',
          description: 'Responsable del producto. Puede crear y editar épicas, sprints, historias y tareas.',
        },
        {
          value: 'SCRUM_MASTER',
          label: 'Scrum Master',
          description: 'Facilita el proceso Scrum. Puede crear y editar épicas, sprints, historias y tareas.',
        },
        {
          value: 'DEVELOPER',
          label: 'Desarrollador',
          description: 'Puede leer todo y crear/editar tareas asignadas a sí mismo.',
        },
        {
          value: 'TESTER',
          label: 'Tester',
          description: 'Puede leer todo y crear/editar tareas asignadas a sí mismo.',
        },
        {
          value: 'DESIGNER',
          label: 'Diseñador',
          description: 'Puede leer todo y crear/editar tareas asignadas a sí mismo.',
        },
        {
          value: 'INFRAESTRUCTURA',
          label: 'Infraestructura',
          description: 'Puede leer todo y crear/editar tareas asignadas a sí mismo.',
        },
        {
          value: 'REDES',
          label: 'Redes',
          description: 'Puede leer todo y crear/editar tareas asignadas a sí mismo.',
        },
        {
          value: 'SEGURIDAD',
          label: 'Seguridad',
          description: 'Puede leer todo y crear/editar tareas asignadas a sí mismo.',
        },
        {
          value: 'STAKEHOLDER',
          label: 'Stakeholder',
          description: 'Solo lectura dentro del proyecto.',
        },
        {
          value: 'OBSERVER',
          label: 'Observador',
          description: 'Solo lectura dentro del proyecto.',
        },
      ],
      permissions: this.getDefaultPermissions(),
    };
  }

  private getDefaultPermissions() {
    const modules = ['Proyectos', 'Miembros', 'Épicas', 'Sprints', 'Historias', 'Tareas', 'Reportes'];
    const roles = [
      { name: 'ADMIN', read: true, write: true, manage: true },
      { name: 'MANAGER', read: true, write: false, manage: true },
      { name: 'USER', read: false, write: false, manage: false },
      { name: 'PRODUCT_OWNER', read: true, write: true, manage: true },
      { name: 'SCRUM_MASTER', read: true, write: true, manage: true },
      { name: 'DEVELOPER', read: true, write: true, manage: false },
      { name: 'TESTER', read: true, write: true, manage: false },
      { name: 'DESIGNER', read: true, write: true, manage: false },
      { name: 'STAKEHOLDER', read: true, write: false, manage: false },
      { name: 'OBSERVER', read: true, write: false, manage: false },
    ];

    const permissions: RoleInfo['permissions'] = [];
    
    for (const role of roles) {
      for (const module of modules) {
        permissions.push({
          role: role.name,
          module,
          read: role.read,
          write: role.write && (module !== 'Reportes' || role.name === 'ADMIN'),
          manage: role.manage && (module === 'Miembros' || module === 'Proyectos' || role.name === 'ADMIN'),
        });
      }
    }

    return permissions;
  }
}

export const adminService = new AdminService();

