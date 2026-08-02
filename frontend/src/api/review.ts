import { api } from './client'
import type { Category } from './transactions'

export interface ReviewItem {
  id: number
  external_id: string
  source: string
  type: 'income' | 'expense'
  amount: number
  description: string
  date: string
  suggested_category: Category | null
  possible_duplicate: boolean
  duplicate_of: string | null
  transfer_suspect: boolean
  transfer_reason: string | null
}

export interface ReviewSummary {
  pending_count: number
  pending_expense: number
  pending_income: number
  month_expense_current: number
  month_expense_if_accepted: number
}

export interface ReviewResponse {
  summary: ReviewSummary
  items: ReviewItem[]
}

export const reviewApi = {
  list: () => api.get<ReviewResponse>('/review').then((r) => r.data),

  accept: (id: number, category_id: number | null, is_shared: boolean, as_transfer = false) =>
    api.post(`/review/${id}/accept`, { category_id, is_shared, as_transfer }).then((r) => r.data),

  dismiss: (id: number) => api.post(`/review/${id}/dismiss`).then((r) => r.data),

  acceptAll: () =>
    api
      .post<{ accepted: number; skipped_duplicates: number; skipped_transfers: number }>('/review/accept-all')
      .then((r) => r.data),
}
