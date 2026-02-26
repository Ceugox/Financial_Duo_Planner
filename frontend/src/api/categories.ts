import { api } from './client'
import type { Category } from './transactions'

export interface CategoryCreate {
  name: string
  type: string
  icon: string
  color: string
}

export const categoriesApi = {
  list: () => api.get<Category[]>('/categories').then((r) => r.data),
  create: (data: CategoryCreate) => api.post<Category>('/categories', data).then((r) => r.data),
  update: (id: number, data: Partial<CategoryCreate>) =>
    api.put<Category>(`/categories/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/categories/${id}`),
}
