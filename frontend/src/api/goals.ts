import { api } from './client'

export interface PurchaseGoal {
  id: number
  name: string
  target_amount: number
  saved_amount: number
  priority: 'alta' | 'media' | 'baixa'
  target_date: string | null
  category: string | null
  image_url: string | null
  notes: string | null
  is_completed: boolean
  user_id: number
  created_at: string
  updated_at: string
}

export interface GoalCreate {
  name: string
  target_amount: number
  saved_amount?: number
  priority?: string
  target_date?: string | null
  category?: string | null
  image_url?: string | null
  notes?: string | null
}

export const goalsApi = {
  list: () => api.get<PurchaseGoal[]>('/purchase-goals').then((r) => r.data),
  get: (id: number) => api.get<PurchaseGoal>(`/purchase-goals/${id}`).then((r) => r.data),
  create: (data: GoalCreate) => api.post<PurchaseGoal>('/purchase-goals', data).then((r) => r.data),
  update: (id: number, data: Partial<GoalCreate> & { is_completed?: boolean }) =>
    api.put<PurchaseGoal>(`/purchase-goals/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/purchase-goals/${id}`),
  deposit: (id: number, amount: number) =>
    api.patch<PurchaseGoal>(`/purchase-goals/${id}/deposit`, { amount }).then((r) => r.data),
}
