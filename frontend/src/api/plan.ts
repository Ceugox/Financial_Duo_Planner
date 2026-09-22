import { api } from './client'

export interface PlanSettings {
  inflation_rate: number
  annual_return_rate: number
  history_months: number
}

export interface PlanEvent {
  id: number
  name: string
  date: string
  end_date: string | null
  kind: 'income' | 'expense'
  amount: number
  recurrence: 'monthly' | 'once'
  notes: string | null
}

export type PlanEventInput = Omit<PlanEvent, 'id'>

export interface PlanGoal {
  id: number
  name: string
  target_date: string | null
  target_amount: number
  saved_amount: number
  saved_amount_source: 'manual' | 'linked'
  monthly_contribution: number
  projected_amount: number | null
  projected_amount_real: number | null
  projected_target: number | null
  gap: number | null
  status: 'on_track' | 'at_risk' | 'overdue' | 'insufficient_data' | 'completed'
}

export interface PlanProjection {
  as_of: string
  evidence: {
    period_start: string | null
    period_end: string | null
    closed_months: number
    monthly_income: number | null
    monthly_expense: number | null
    monthly_capacity: number | null
  }
  assumptions: PlanSettings & { return_is_guaranteed: false }
  allocation: {
    requested_monthly: number
    available_monthly: number | null
    unallocated_monthly: number | null
    shortfall_monthly: number | null
  }
  goals: PlanGoal[]
  monthly: Array<{
    month: string
    capacity: number | null
    allocated: number | null
    unallocated: number | null
    goal_total: number | null
    goal_total_real: number | null
  }>
  scenarios: Array<{
    key: 'conservative' | 'base' | 'optimistic'
    annual_return_rate: number
    goals: Array<{ goal_id: number; projected_amount: number | null; gap: number | null }>
  }>
  warnings: string[]
}

export interface PlanInsight {
  goal_id: number
  fact: string
  impact: string
  action: string
  assumptions: { inflation_rate: number; annual_return_rate: number; history_months: number; return_is_guaranteed: boolean }
  evidence_period: { start: string | null; end: string | null }
}

export const planApi = {
  projection: () => api.get<PlanProjection>('/plan/projection').then((r) => r.data),
  settings: () => api.get<PlanSettings>('/plan/settings').then((r) => r.data),
  updateSettings: (data: Partial<PlanSettings>) => api.put<PlanSettings>('/plan/settings', data).then((r) => r.data),
  events: () => api.get<PlanEvent[]>('/plan/events').then((r) => r.data),
  createEvent: (data: PlanEventInput) => api.post<PlanEvent>('/plan/events', data).then((r) => r.data),
  updateEvent: (id: number, data: Partial<PlanEventInput>) => api.put<PlanEvent>(`/plan/events/${id}`, data).then((r) => r.data),
  deleteEvent: (id: number) => api.delete(`/plan/events/${id}`),
  insights: () => api.get<PlanInsight[]>('/plan/insights').then((r) => r.data),
}
