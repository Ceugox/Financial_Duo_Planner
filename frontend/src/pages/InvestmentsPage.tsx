import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Plus, Pencil, Trash2, PieChart as PieChartIcon, Briefcase, RefreshCw } from 'lucide-react'
import { investmentsApi, type Investment } from '@/api/investments'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { InvestmentForm } from '@/components/investments/InvestmentForm'
import { formatBRL, formatPercent } from '@/lib/formatters'

const ASSET_LABELS: Record<string, string> = {
  acoes: '📈 Ações', fiis: '🏢 FIIs', renda_fixa: '🏦 Renda Fixa',
  crypto: '₿ Crypto', poupanca: '💰 Poupança', fundos: '📊 Fundos', outros: '📌 Outros',
}

const ASSET_COLORS: Record<string, string> = {
  acoes: '#74AA9B', fiis: '#91C68D', renda_fixa: '#ECE488',
  crypto: '#796C86', poupanca: '#b8afc4', fundos: '#4d8277', outros: '#c5e0c2',
}

interface SummaryCardItem {
  label: string
  value: string
  color: string
  accent: string
  sub?: string
}

export function InvestmentsPage() {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editInv, setEditInv] = useState<Investment | undefined>()
  const [deleteInv, setDeleteInv] = useState<Investment | undefined>()
  const [quotesFeedback, setQuotesFeedback] = useState('')

  const quotesMutation = useMutation({
    mutationFn: investmentsApi.refreshQuotes,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['investments'] })
      qc.invalidateQueries({ queryKey: ['investments-summary'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      const parts = [`${result.updated} ativo(s) atualizados`]
      if (result.skipped_no_ticker > 0) parts.push(`${result.skipped_no_ticker} sem ticker/quantidade`)
      if (result.failed.length > 0) parts.push(`falhou: ${result.failed.join(', ')}`)
      setQuotesFeedback(parts.join(' · '))
    },
    onError: () => setQuotesFeedback('Falha ao buscar cotações. Tente de novo em instantes.'),
  })

  const { data: investments, isLoading } = useQuery({ queryKey: ['investments'], queryFn: investmentsApi.list })
  const { data: summary } = useQuery({ queryKey: ['investments-summary'], queryFn: investmentsApi.summary })

  const deleteMutation = useMutation({
    mutationFn: investmentsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setDeleteInv(undefined)
    },
  })

  const openNew  = () => { setEditInv(undefined); setDialogOpen(true) }
  const openEdit = (inv: Investment) => { setEditInv(inv); setDialogOpen(true) }

  const allocationData = summary
    ? Object.entries(summary.by_type).map(([type, value]) => ({
        name: ASSET_LABELS[type] ?? type,
        value,
        color: ASSET_COLORS[type] ?? 'var(--purple-light)',
      }))
    : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Summary cards */}
      <div className="summary-grid-3">
        {([
          { label: 'Total Investido', value: formatBRL(summary?.total_invested ?? 0), color: 'var(--purple-deep)', accent: 'var(--purple)' },
          { label: 'Valor Atual',     value: formatBRL(summary?.total_current ?? 0),  color: 'var(--teal-dark)',   accent: 'var(--teal)' },
          {
            label: 'Ganho / Perda',
            value: formatBRL(summary?.gain_loss ?? 0),
            sub: formatPercent(summary?.gain_loss_pct ?? 0),
            color: (summary?.gain_loss ?? 0) >= 0 ? 'var(--sage-dark)' : 'var(--coral)',
            accent: (summary?.gain_loss ?? 0) >= 0 ? 'var(--sage)' : 'var(--coral)',
          },
        ] satisfies SummaryCardItem[]).map((s) => (
          <div key={s.label} style={{
            background: 'white',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.125rem',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-card)',
            borderTop: `3px solid ${s.accent}`,
          }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.375rem' }}>
              {s.label}
            </p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: s.color, lineHeight: 1.2 }}>
              {s.value}
            </p>
            {s.sub && (
              <p style={{ fontSize: '0.75rem', color: s.color, marginTop: '0.125rem', fontWeight: 600 }}>{s.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Chart + Table */}
      <div style={{ display: 'grid', gap: '1.25rem' }} className="xl-cols-inv">

        {/* Allocation pie */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Alocação</h3>
          </div>
          <div style={{ padding: '1rem' }}>
            {allocationData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={allocationData} cx="50%" cy="50%" outerRadius={78} dataKey="value" paddingAngle={2}>
                      {allocationData.map((e, i) => <Cell key={i} fill={e.color} strokeWidth={0} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [formatBRL(Number(v)), 'Valor']} contentStyle={{ fontFamily: 'var(--font-body)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {allocationData.map((d) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                        <span style={{ color: 'var(--purple-dark)' }}>{d.name}</span>
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--purple-deep)' }}>{formatBRL(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state" style={{ padding: '2rem 0' }}>
                <div className="empty-state-icon"><PieChartIcon size={26} color="var(--purple-light)" /></div>
                <p style={{ fontSize: '0.85rem', color: 'var(--purple-light)' }}>Sem investimentos</p>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header">
            <h3 className="card-title">Ativos</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => { setQuotesFeedback(''); quotesMutation.mutate() }}
                disabled={quotesMutation.isPending}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 0.875rem', fontSize: '0.8rem' }}
                title="Busca preços na B3 (brapi) e CoinGecko para ativos com ticker"
              >
                <RefreshCw size={14} /> {quotesMutation.isPending ? 'Buscando...' : 'Atualizar cotações'}
              </button>
              <button onClick={openNew} className="btn btn-primary" style={{ padding: '0.5rem 0.875rem', fontSize: '0.8rem' }}>
                <Plus size={14} /> Adicionar
              </button>
            </div>
          </div>

          {quotesFeedback && (
            <p style={{ fontSize: '0.78rem', color: 'var(--teal-dark)', background: 'var(--teal-light)', padding: '0.5rem 1.25rem' }}>
              {quotesFeedback}
            </p>
          )}

          {isLoading ? (
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 44 }} />)}
            </div>
          ) : (investments?.length ?? 0) === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Briefcase size={26} color="var(--purple-light)" /></div>
              <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--purple-dark)', marginBottom: '0.25rem' }}>Nenhum ativo</p>
              <p style={{ fontSize: '0.78rem' }}>Adicione seus investimentos</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th className="col-sm">Tipo</th>
                    <th style={{ textAlign: 'right' }}>Investido</th>
                    <th style={{ textAlign: 'right' }}>Atual</th>
                    <th style={{ textAlign: 'right' }} className="col-md">Resultado</th>
                    <th style={{ width: 64 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {investments?.map((inv) => {
                    const gl = inv.current_value - inv.amount_invested
                    const glPct = inv.amount_invested > 0 ? (gl / inv.amount_invested * 100) : 0
                    return (
                      <tr key={inv.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--purple-deep)' }}>{inv.name}</p>
                            {inv.source === 'pluggy' && (
                              <span className="badge" style={{ background: 'var(--teal-light)', color: 'var(--teal-dark)' }}>
                                Open Finance
                              </span>
                            )}
                          </div>
                          {inv.broker && <p style={{ fontSize: '0.7rem', color: 'var(--purple-light)' }}>{inv.broker}</p>}
                        </td>
                        <td className="col-sm" style={{ color: 'var(--purple-light)', fontSize: '0.8rem' }}>
                          {ASSET_LABELS[inv.asset_type] ?? inv.asset_type}
                        </td>
                        <td style={{ textAlign: 'right', fontSize: '0.875rem', color: 'var(--purple-deep)' }}>{formatBRL(inv.amount_invested)}</td>
                        <td style={{ textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: 'var(--purple-deep)' }}>{formatBRL(inv.current_value)}</td>
                        <td className="col-md" style={{ textAlign: 'right' }}>
                          <p className={gl >= 0 ? 'amount-positive' : 'amount-negative'} style={{ fontSize: '0.875rem' }}>
                            {gl >= 0 ? '+' : ''}{formatBRL(gl)}
                          </p>
                          <p style={{ fontSize: '0.7rem', color: gl >= 0 ? 'var(--sage-dark)' : 'var(--coral)' }}>{formatPercent(glPct)}</p>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => openEdit(inv)} className="btn btn-ghost btn-icon"><Pencil size={14} /></button>
                            <button onClick={() => setDeleteInv(inv)} className="btn btn-danger btn-icon"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent title={editInv ? 'Editar Investimento' : 'Novo Investimento'}>
          <InvestmentForm key={editInv?.id ?? 'new'} investment={editInv} onSuccess={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteInv)}
        onOpenChange={(open) => { if (!open) setDeleteInv(undefined) }}
        title="Excluir investimento"
        description={`O ativo "${deleteInv?.name ?? ''}" será removido da carteira e dos indicadores de alocação.`}
        isPending={deleteMutation.isPending}
        onConfirm={() => { if (deleteInv) deleteMutation.mutate(deleteInv.id) }}
      />
    </div>
  )
}
