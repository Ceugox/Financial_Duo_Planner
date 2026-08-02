import { api } from './client'
import type { Category } from './transactions'

export interface CategoryRule {
  id: number
  pattern: string
  category_id: number
  category: Category
  created_at: string
}

export const categoryRulesApi = {
  list: () => api.get<CategoryRule[]>('/category-rules').then((r) => r.data),

  create: (pattern: string, category_id: number) =>
    api.post<CategoryRule>('/category-rules', { pattern, category_id }).then((r) => r.data),

  delete: (id: number) => api.delete(`/category-rules/${id}`),

  apply: (id: number) =>
    api.post<{ updated: number }>(`/category-rules/${id}/apply`).then((r) => r.data),
}
