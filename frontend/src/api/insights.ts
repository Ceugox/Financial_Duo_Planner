import { api } from './client'

export interface Insight {
  kind: string
  severity: 'positive' | 'info' | 'warning' | 'critical'
  title: string
  detail: string
  amount: number | null
  category_icon: string | null
}

export interface ForecastDay {
  day: number
  actual: number | null
  projected: number | null
}

export interface Forecast {
  month: number
  year: number
  is_current_month: boolean
  days_elapsed: number
  days_remaining: number
  spent_so_far: number
  income_so_far: number
  committed_remaining: number
  variable_daily_rate: number
  projected_expense: number
  projected_income: number
  projected_balance: number
  safe_to_spend_total: number
  safe_to_spend_daily: number
  series: ForecastDay[]
}

export interface SubscriptionItem {
  description: string
  cadence: 'weekly' | 'monthly' | 'yearly'
  expected_amount: number
  last_amount: number
  last_date: string
  expected_day: number
  occurrences: number
  monthly_cost: number
  price_increased: boolean
  price_change: number
  active: boolean
  category_name: string | null
  category_icon: string | null
}

export interface SubscriptionsResponse {
  total_monthly: number
  active_count: number
  items: SubscriptionItem[]
}

export interface MonthPoint {
  month: string
  expense: number
  income: number
}

export interface CategoryTrend {
  category_id: number | null
  category_name: string
  category_icon: string
  category_color: string
  avg_monthly: number
  current_month: number
  share_pct: number
  delta_pct_vs_avg: number
  series: number[]
}

export interface ConcernItem {
  kind: string
  title: string
  detail: string
  amount: number
  category_icon: string | null
}

export interface SpendingAnalysis {
  months_axis: string[]
  monthly: MonthPoint[]
  avg_expense: number
  avg_daily_expense: number
  highest_month: MonthPoint | null
  lowest_month: MonthPoint | null
  categories: CategoryTrend[]
  concerns: ConcernItem[]
}

export const insightsApi = {
  feed: (month?: number, year?: number) =>
    api.get<Insight[]>('/insights', { params: { month, year } }).then((r) => r.data),

  forecast: (month?: number, year?: number) =>
    api.get<Forecast>('/insights/forecast', { params: { month, year } }).then((r) => r.data),

  subscriptions: () =>
    api.get<SubscriptionsResponse>('/insights/subscriptions').then((r) => r.data),

  spendingAnalysis: (months = 6) =>
    api.get<SpendingAnalysis>('/insights/spending-analysis', { params: { months } }).then((r) => r.data),
}
