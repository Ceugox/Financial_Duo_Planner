import { api } from './client'

export interface PotStatus {
  month: number
  year: number
  couple_income: number
  couple_expense: number
  leftover: number
  saver_name: string
  keeper_name: string
  keeper_income: number
  keeper_expense: number
  reserve: number
  already_transferred: number
  to_transfer: number
}

export const potApi = {
  status: (month: number, year: number, reserve = 500) =>
    api
      .get<PotStatus>('/settlement/pot', { params: { month, year, reserve } })
      .then((r) => r.data),
}
