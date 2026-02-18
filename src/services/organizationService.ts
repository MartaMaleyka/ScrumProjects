import { API_BASE_URL, fetchWithTimeout, REQUEST_TIMEOUT } from '../config/api';

export interface Organization {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  usersCount?: number;
  projectsCount?: number;
}

export interface OrganizationDetail extends Organization {
  usersCount: number;
  projectsCount: number;
}

export interface OrganizationUser {
  id: number;
  email: string;
  username: string | null;
  name: string;
  globalRole: string;
  isActive: boolean;
  avatar: string | null;
  lastLogin: string | null;
  createdAt: string;
}

export interface OrganizationProject {
  id: number;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  createdBy: {
    id: number;
    name: string;
    email: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class OrganizationService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; error?: string; message?: string }> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    if (!token) {
      return {
        success: false,
        error: 'No hay token de autenticación',
        message: 'Debes iniciar sesión para usar esta funcionalidad',
      };
    }

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
      ...options,
    };

    let url = `${API_BASE_URL}/superadmin${endpoint}`;
    if ((options.method === 'GET' || !options.method) && !endpoint.includes('?')) {
      url += `?_t=${Date.now()}`;
    } else if ((options.method === 'GET' || !options.method) && endpoint.includes('?')) {
      url += `&_t=${Date.now()}`;
    }

    try {
      const response = await fetchWithTimeout(url, config, REQUEST_TIMEOUT);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Error en la petición');
      }

      // La respuesta puede venir como { data: {...} } o directamente como {...}
      return { success: true, data: data.data || data };
    } catch (error: any) {
      console.error('Error en petición a organizaciones:', error);
      return {
        success: false,
        error: error.message || 'Error en la petición',
        message: error.message || 'Error al realizar la operación',
      };
    }
  }

  async getOrganizations(params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }): Promise<PaginatedResponse<Organization>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

    const result = await this.request<any>(
      `/organizations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Error al obtener organizaciones');
    }

    // El endpoint devuelve: { success: true, data: { organizations: [], pagination: {} } }
    // Entonces result.data = { organizations: [], pagination: {} }
    const responseData = result.data;
    
    if (!responseData) {
      return {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1 }
      };
    }
    
    // La respuesta tiene estructura: { organizations: [], pagination: {} }
    return {
      data: Array.isArray(responseData.organizations) ? responseData.organizations : [],
      pagination: responseData.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 }
    };
  }

  async getOrganizationById(orgId: number): Promise<OrganizationDetail> {
    const result = await this.request<OrganizationDetail>(`/organizations/${orgId}`);

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Error al obtener organización');
    }

    return result.data;
  }

  async createOrganization(data: { name: string; slug: string; isActive?: boolean }): Promise<Organization> {
    const result = await this.request<Organization>('/organizations', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Error al crear organización');
    }

    return result.data;
  }

  async updateOrganization(
    orgId: number,
    data: { name?: string; slug?: string; isActive?: boolean }
  ): Promise<Organization> {
    const result = await this.request<Organization>(`/organizations/${orgId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Error al actualizar organización');
    }

    return result.data;
  }

  async getOrganizationUsers(
    orgId: number,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      globalRole?: string;
      isActive?: boolean;
    }
  ): Promise<PaginatedResponse<OrganizationUser>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.globalRole) queryParams.append('globalRole', params.globalRole);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

    const result = await this.request<PaginatedResponse<OrganizationUser>>(
      `/organizations/${orgId}/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Error al obtener usuarios de la organización');
    }

    return result.data;
  }

  async getOrganizationProjects(
    orgId: number,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    }
  ): Promise<PaginatedResponse<OrganizationProject>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const result = await this.request<PaginatedResponse<OrganizationProject>>(
      `/organizations/${orgId}/projects${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Error al obtener proyectos de la organización');
    }

    return result.data;
  }

  async assignAdmin(orgId: number, userId: number): Promise<OrganizationUser> {
    const result = await this.request<OrganizationUser>(`/organizations/${orgId}/assign-admin`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Error al asignar ADMIN');
    }

    return result.data;
  }

  async moveUserToOrganization(userId: number, organizationId: number): Promise<OrganizationUser> {
    const result = await this.request<OrganizationUser>(`/users/${userId}/move-org`, {
      method: 'POST',
      body: JSON.stringify({ organizationId }),
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Error al mover usuario');
    }

    return result.data;
  }

  async createUser(data: {
    email: string;
    name: string;
    username?: string;
    password: string;
    globalRole: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER';
    organizationId: number;
    isActive?: boolean;
  }): Promise<OrganizationUser> {
    const result = await this.request<OrganizationUser>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Error al crear usuario');
    }

    return result.data;
  }
}

export const organizationService = new OrganizationService();

