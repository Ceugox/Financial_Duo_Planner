import { api } from './client'

export interface Budget {
  id: number
  category_id: number
  amount: number
}

export interface BudgetStatusItem {
  category_id: number
  category_name: string
  category_icon: string
  category_color: string
  budget: number
  spent: number
  remaining: number
  pct: number
  level: 'ok' | 'warning' | 'over'
}

export interface BudgetStatus {
  month: number
  year: number
  total_budget: number
  total_spent: number
  items: BudgetStatusItem[]
  unbudgeted_spent: number
}

export const budgetsApi = {
  list: () => api.get<Budget[]>('/budgets').then((r) => r.data),

  upsert: (category_id: number, amount: number) =>
    api.put<Budget>('/budgets', { category_id, amount }).then((r) => r.data),

  remove: (category_id: number) => api.delete(`/budgets/${category_id}`),

  status: (month?: number, year?: number) =>
    api.get<BudgetStatus>('/budgets/status', { params: { month, year } }).then((r) => r.data),
}
