import { api } from './client'
import type { Transaction } from './transactions'

export interface DashboardSummary {
  month_income: number
  month_expense: number
  month_balance: number
  savings_rate: number
  total_invested: number
  total_current_value: number
  investment_gain_loss: number
}

export interface MonthlyChartItem {
  month: string
  income: number
  expense: number
  balance: number
}

export interface CategoryBreakdownItem {
  category_id: number | null
  category_name: string
  category_icon: string
  category_color: string
  total: number
  percentage: number
}

export const dashboardApi = {
  summary: (month?: number, year?: number) =>
    api.get<DashboardSummary>('/dashboard/summary', { params: { month, year } }).then((r) => r.data),

  monthlyChart: (months = 12) =>
    api.get<MonthlyChartItem[]>('/dashboard/monthly-chart', { params: { months } }).then((r) => r.data),

  categoryBreakdown: (month?: number, year?: number, type = 'expense') =>
    api
      .get<CategoryBreakdownItem[]>('/dashboard/category-breakdown', { params: { month, year, type } })
      .then((r) => r.data),

  recentTransactions: (limit = 10) =>
    api
      .get<Transaction[]>('/dashboard/recent-transactions', { params: { limit } })
      .then((r) => r.data),
}
