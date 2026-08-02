import { api } from './client'

export interface MemberBreakdown {
  user_id: number
  name: string
  income: number
  share_pct: number
  shared_paid: number
  shared_owed: number
  net: number
}

export interface SettlementRecord {
  id: number
  month: number
  year: number
  payer_id: number
  receiver_id: number
  amount: number
  created_at: string
}

export interface SettlementStatus {
  month: number
  year: number
  total_shared: number
  members: MemberBreakdown[]
  transfer_from: number | null
  transfer_to: number | null
  transfer_amount: number
  settled: boolean
  settlement: SettlementRecord | null
}

export const settlementApi = {
  status: (month: number, year: number) =>
    api.get<SettlementStatus>('/settlement', { params: { month, year } }).then((r) => r.data),

  settle: (month: number, year: number) =>
    api.post<SettlementStatus>('/settlement', { month, year }).then((r) => r.data),

  unsettle: (month: number, year: number) =>
    api.delete('/settlement', { params: { month, year } }),
}
