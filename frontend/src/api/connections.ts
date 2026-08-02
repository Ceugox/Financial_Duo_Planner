import { api } from './client'

export interface BankConnection {
  id: number
  provider: string
  item_id: string
  nickname: string
  user_id: number
  last_synced_at: string | null
}

export interface ConnectionsStatus {
  pluggy_configured: boolean
  connections: BankConnection[]
}

export interface SyncResult {
  inserted: number
  transfers: number
  needs_review: number
  skipped_duplicates: number
  uncategorized: number
  accounts: number
}

export interface OfxImportResult {
  inserted: number
  transfers: number
  needs_review: number
  skipped_duplicates: number
  uncategorized: number
  parsed: number
}

export interface InvestmentSyncResult {
  created: number
  updated: number
  removed_sold: number
  removed_manual: number
  total_positions: number
}

export const connectionsApi = {
  status: () => api.get<ConnectionsStatus>('/connections').then((r) => r.data),

  create: (item_id: string, nickname: string) =>
    api.post<BankConnection>('/connections', { item_id, nickname }).then((r) => r.data),

  delete: (id: number) => api.delete(`/connections/${id}`),

  sync: (id: number) =>
    api.post<SyncResult>(`/connections/${id}/sync`).then((r) => r.data),

  syncInvestments: (id: number, remove_manual: boolean) =>
    api
      .post<InvestmentSyncResult>(`/connections/${id}/sync-investments`, { remove_manual })
      .then((r) => r.data),

  importOfx: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api
      .post<OfxImportResult>('/connections/import-ofx', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },
}
