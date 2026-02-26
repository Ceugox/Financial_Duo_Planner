import { api } from './client'

export interface Investment {
  id: number
  name: string
  asset_type: string
  amount_invested: number
  current_value: number
  quantity: number | null
  purchase_date: string | null
  broker: string | null
  notes: string | null
  user_id: number
  created_at: string
  updated_at: string
}

export interface InvestmentSummary {
  total_invested: number
  total_current: number
  gain_loss: number
  gain_loss_pct: number
  by_type: Record<string, number>
}

export interface InvestmentCreate {
  name: string
  asset_type: string
  amount_invested: number
  current_value: number
  quantity?: number | null
  purchase_date?: string | null
  broker?: string | null
  notes?: string | null
}

export const investmentsApi = {
  list: () => api.get<Investment[]>('/investments').then((r) => r.data),
  get: (id: number) => api.get<Investment>(`/investments/${id}`).then((r) => r.data),
  create: (data: InvestmentCreate) => api.post<Investment>('/investments', data).then((r) => r.data),
  update: (id: number, data: Partial<InvestmentCreate>) =>
    api.put<Investment>(`/investments/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/investments/${id}`),
  summary: () => api.get<InvestmentSummary>('/investments/summary').then((r) => r.data),
}
