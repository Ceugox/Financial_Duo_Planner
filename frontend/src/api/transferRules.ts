import { api } from './client'

export interface TransferRule {
  id: number
  pattern: string
  created_at: string
}

export const transferRulesApi = {
  list: () => api.get<TransferRule[]>('/transfer-rules').then((r) => r.data),

  create: (pattern: string) =>
    api.post<TransferRule>('/transfer-rules', { pattern }).then((r) => r.data),

  delete: (id: number) => api.delete(`/transfer-rules/${id}`),

  apply: (id: number) =>
    api.post<{ updated: number }>(`/transfer-rules/${id}/apply`).then((r) => r.data),
}
