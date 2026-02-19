import { API_BASE_URL } from '../../config/api';
import type { RateCard } from './budgetService';

export interface CreateRateCardData {
  budgetId: number;
  projectId: number;
  userId?: number;
  projectRole?: string;
  hourlyCents: number;
  currency?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface UpdateRateCardData {
  hourlyCents?: number;
  currency?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface RateCardFilters {
  budgetId?: number;
  projectId?: number;
}

class RateCardService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(error.message || `Error ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  }

  async getRateCards(filters?: RateCardFilters): Promise<{ rateCards: RateCard[] }> {
    const params = new URLSearchParams();
    if (filters?.budgetId) params.append('budgetId', filters.budgetId.toString());
    if (filters?.projectId) params.append('projectId', filters.projectId.toString());

    return this.request<{ rateCards: RateCard[] }>(
      `/premium/rate-cards?${params.toString()}`
    );
  }

  async createRateCard(data: CreateRateCardData): Promise<RateCard> {
    return this.request<RateCard>('/premium/rate-cards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRateCard(id: number, data: UpdateRateCardData): Promise<RateCard> {
    return this.request<RateCard>(`/premium/rate-cards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteRateCard(id: number): Promise<void> {
    return this.request<void>(`/premium/rate-cards/${id}`, {
      method: 'DELETE',
    });
  }
}

export default new RateCardService();

