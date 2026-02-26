import { api } from './client'

export interface Transaction {
  id: number
  type: 'income' | 'expense'
  amount: number
  description: string
  category_id: number | null
  category: Category | null
  payment_method: string | null
  date: string
  is_recurrent: boolean
  recurrence_day: number | null
  notes: string | null
  user_id: number
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  name: string
  type: string
  icon: string
  color: string
  is_default: boolean
}

export interface TransactionFilters {
  month?: number
  year?: number
  category_id?: number
  type?: string
  search?: string
  page?: number
  page_size?: number
}

export interface TransactionCreate {
  type: 'income' | 'expense'
  amount: number
  description: string
  category_id?: number | null
  payment_method?: string | null
  date: string
  is_recurrent?: boolean
  recurrence_day?: number | null
  notes?: string | null
}

export interface MonthlyTotals {
  month: string
  income: number
  expense: number
  balance: number
}

export const transactionsApi = {
  list: (filters?: TransactionFilters) =>
    api.get<Transaction[]>('/transactions', { params: filters }).then((r) => r.data),

  get: (id: number) =>
    api.get<Transaction>(`/transactions/${id}`).then((r) => r.data),

  create: (data: TransactionCreate) =>
    api.post<Transaction>('/transactions', data).then((r) => r.data),

  update: (id: number, data: Partial<TransactionCreate>) =>
    api.put<Transaction>(`/transactions/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    api.delete(`/transactions/${id}`),

  monthlyTotals: (months = 12) =>
    api.get<MonthlyTotals[]>('/transactions/monthly-totals', { params: { months } }).then((r) => r.data),
}
