import { API_BASE_URL } from '../../config/api';

export interface Budget {
  id: number;
  organizationId: number;
  projectId: number;
  sprintId?: number;
  releaseId?: number;
  scope: 'PROJECT' | 'SPRINT' | 'RELEASE';
  name: string;
  currency: string;
  startsAt?: string;
  endsAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: number;
    name: string;
  };
  sprint?: {
    id: number;
    name: string;
  };
  release?: {
    id: number;
    version: string;
    name?: string;
  };
  lines?: BudgetLine[];
  expenses?: Expense[];
  rateCards?: RateCard[];
  _count?: {
    lines: number;
    expenses: number;
  };
}

export interface BudgetLine {
  id: number;
  budgetId: number;
  category: string;
  categoryType: 'LABOR' | 'SOFTWARE' | 'SERVICES' | 'HARDWARE' | 'TRAVEL' | 'OTHER';
  plannedCents: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetMetrics {
  plannedTotalCents: number;
  actualTotalCents: number;
  remainingCents: number;
  burnRateCentsPerDay: number;
  forecastAtCompletionCents: number;
  forecastVarianceCents: number;
  laborPlannedCents: number;
  laborActualCents: number;
  last30DaysActualCents: number;
  currency: string;
  plannedTotalFormatted?: string;
  actualTotalFormatted?: string;
  remainingFormatted?: string;
  burnRateFormatted?: string;
  forecastAtCompletionFormatted?: string;
  forecastVarianceFormatted?: string;
  laborPlannedFormatted?: string;
  laborActualFormatted?: string;
  last30DaysActualFormatted?: string;
}

export interface CreateBudgetData {
  projectId: number;
  sprintId?: number;
  releaseId?: number;
  scope: 'PROJECT' | 'SPRINT' | 'RELEASE';
  name: string;
  currency?: string;
  startsAt?: string;
  endsAt?: string;
  notes?: string;
  lines?: Array<{
    category: string;
    categoryType?: 'LABOR' | 'SOFTWARE' | 'SERVICES' | 'HARDWARE' | 'TRAVEL' | 'OTHER';
    plannedCents: number;
    notes?: string;
  }>;
}

export interface UpdateBudgetData {
  name?: string;
  currency?: string;
  startsAt?: string;
  endsAt?: string;
  notes?: string;
}

export interface BudgetFilters {
  projectId?: number;
  scope?: 'PROJECT' | 'SPRINT' | 'RELEASE';
  page?: number;
  limit?: number;
}

class BudgetService {
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

  async getBudgets(filters?: BudgetFilters): Promise<{ budgets: Budget[]; pagination: any }> {
    const params = new URLSearchParams();
    if (filters?.projectId) params.append('projectId', filters.projectId.toString());
    if (filters?.scope) params.append('scope', filters.scope);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    return this.request<{ budgets: Budget[]; pagination: any }>(
      `/premium/budgets?${params.toString()}`
    );
  }

  async getBudgetById(id: number): Promise<Budget> {
    return this.request<Budget>(`/premium/budgets/${id}`);
  }

  async createBudget(data: CreateBudgetData): Promise<Budget> {
    return this.request<Budget>('/premium/budgets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBudget(id: number, data: UpdateBudgetData): Promise<Budget> {
    return this.request<Budget>(`/premium/budgets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteBudget(id: number): Promise<void> {
    return this.request<void>(`/premium/budgets/${id}`, {
      method: 'DELETE',
    });
  }

  async getBudgetMetrics(id: number): Promise<BudgetMetrics> {
    return this.request<BudgetMetrics>(`/premium/budgets/${id}/metrics`);
  }

  async createBudgetLine(budgetId: number, line: {
    category: string;
    categoryType?: 'LABOR' | 'SOFTWARE' | 'SERVICES' | 'HARDWARE' | 'TRAVEL' | 'OTHER';
    plannedCents: number;
    notes?: string;
  }): Promise<BudgetLine> {
    return this.request<BudgetLine>(`/premium/budgets/${budgetId}/lines`, {
      method: 'POST',
      body: JSON.stringify(line),
    });
  }

  async updateBudgetLine(lineId: number, line: {
    category?: string;
    categoryType?: 'LABOR' | 'SOFTWARE' | 'SERVICES' | 'HARDWARE' | 'TRAVEL' | 'OTHER';
    plannedCents?: number;
    notes?: string;
  }): Promise<BudgetLine> {
    return this.request<BudgetLine>(`/premium/budget-lines/${lineId}`, {
      method: 'PATCH',
      body: JSON.stringify(line),
    });
  }

  async deleteBudgetLine(lineId: number): Promise<void> {
    return this.request<void>(`/premium/budget-lines/${lineId}`, {
      method: 'DELETE',
    });
  }
}

export interface Expense {
  id: number;
  budgetId: number;
  projectId: number;
  sprintId?: number;
  taskId?: number;
  category: string;
  amountCents: number;
  currency: string;
  incurredAt: string;
  vendor?: string;
  description?: string;
  attachmentUrl?: string;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  budget?: {
    id: number;
    name: string;
  };
  project?: {
    id: number;
    name: string;
  };
  sprint?: {
    id: number;
    name: string;
  };
  task?: {
    id: number;
    title: string;
  };
  createdBy?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface RateCard {
  id: number;
  budgetId: number;
  projectId: number;
  userId?: number;
  projectRole?: string;
  hourlyCents: number;
  currency: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  createdAt: string;
  updatedAt: string;
  budget?: {
    id: number;
    name: string;
  };
  project?: {
    id: number;
    name: string;
  };
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export default new BudgetService();

