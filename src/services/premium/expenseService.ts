import { API_BASE_URL } from '../../config/api';
import type { Expense } from './budgetService';

export interface CreateExpenseData {
  budgetId: number;
  projectId: number;
  sprintId?: number;
  taskId?: number;
  category: string;
  amountCents: number;
  currency?: string;
  incurredAt?: string;
  vendor?: string;
  description?: string;
  attachmentUrl?: string;
}

export interface UpdateExpenseData {
  category?: string;
  amountCents?: number;
  currency?: string;
  incurredAt?: string;
  vendor?: string;
  description?: string;
  attachmentUrl?: string;
}

export interface ExpenseFilters {
  budgetId?: number;
  projectId?: number;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

class ExpenseService {
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

  async getExpenses(filters?: ExpenseFilters): Promise<{ expenses: Expense[]; pagination: any }> {
    const params = new URLSearchParams();
    if (filters?.budgetId) params.append('budgetId', filters.budgetId.toString());
    if (filters?.projectId) params.append('projectId', filters.projectId.toString());
    if (filters?.from) params.append('from', filters.from);
    if (filters?.to) params.append('to', filters.to);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    return this.request<{ expenses: Expense[]; pagination: any }>(
      `/premium/expenses?${params.toString()}`
    );
  }

  async createExpense(data: CreateExpenseData): Promise<Expense> {
    return this.request<Expense>('/premium/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateExpense(id: number, data: UpdateExpenseData): Promise<Expense> {
    return this.request<Expense>(`/premium/expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteExpense(id: number): Promise<void> {
    return this.request<void>(`/premium/expenses/${id}`, {
      method: 'DELETE',
    });
  }
}

export default new ExpenseService();

