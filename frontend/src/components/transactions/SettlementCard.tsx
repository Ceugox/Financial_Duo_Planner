import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { HandCoins, Check, Undo2 } from 'lucide-react'
import { settlementApi } from '@/api/settlement'
import { formatBRL } from '@/lib/formatters'

interface Props {
  month: number
  year: number
}

export function SettlementCard({ month, year }: Props) {
  const qc = useQueryClient()

  const { data: status } = useQuery({
    queryKey: ['settlement', month, year],
    queryFn: () => settlementApi.status(month, year),
  })

  const settleMutation = useMutation({
    mutationFn: () => settlementApi.settle(month, year),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settlement', month, year] }),
  })

  const unsettleMutation = useMutation({
    mutationFn: () => settlementApi.unsettle(month, year),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settlement', month, year] }),
  })

  if (!status || status.members.length < 2 || status.total_shared === 0) return null

  const nameOf = (id: number | null) => status.members.find((m) => m.user_id === id)?.name?.split(' ')[0] ?? '—'
  const hasTransfer = status.transfer_amount > 0 && status.transfer_from && status.transfer_to

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HandCoins size={16} color="var(--teal-dark)" /> Acerto do casal
        </h3>
        <span style={{ fontSize: '0.72rem', color: 'var(--purple-light)', fontWeight: 500 }}>
          {formatBRL(status.total_shared)} compartilhados
        </span>
      </div>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

        {/* Quem pagou o quê */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '0.75rem' }}>
          {status.members.map((m) => (
            <div key={m.user_id} style={{
              padding: '0.625rem 0.875rem',
              background: 'var(--bg)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
            }}>
              <p style={{ fontWeight: 700, color: 'var(--purple-deep)', marginBottom: '0.2rem' }}>
                {m.name.split(' ')[0]}
                <span style={{ fontWeight: 500, color: 'var(--purple-light)', marginLeft: '0.375rem' }}>
                  cota {m.share_pct.toFixed(0)}%
                </span>
              </p>
              <p style={{ color: 'var(--text-2)' }}>
                pagou {formatBRL(m.shared_paid)} · devia {formatBRL(m.shared_owed)}
              </p>
            </div>
          ))}
        </div>

        {/* Resultado */}
        {status.settled ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap',
            padding: '0.75rem 1rem',
            background: 'var(--sage-light)',
            borderRadius: 'var(--radius-sm)',
          }}>
            <Check size={16} color="var(--sage-dark)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--sage-dark)', flex: 1 }}>
              Mês acertado{status.settlement ? ` — ${nameOf(status.settlement.payer_id)} transferiu ${formatBRL(status.settlement.amount)} para ${nameOf(status.settlement.receiver_id)}` : ''}
            </span>
            <button
              onClick={() => unsettleMutation.mutate()}
              disabled={unsettleMutation.isPending}
              className="btn btn-ghost"
              style={{ fontSize: '0.75rem', padding: '0.375rem 0.625rem' }}
            >
              <Undo2 size={13} /> Desfazer
            </button>
          </div>
        ) : hasTransfer ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
            padding: '0.75rem 1rem',
            background: 'var(--yellow-light)',
            borderRadius: 'var(--radius-sm)',
          }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--yellow-dark)', flex: 1 }}>
              {nameOf(status.transfer_from)} deve {formatBRL(status.transfer_amount)} para {nameOf(status.transfer_to)}
            </span>
            <button
              onClick={() => settleMutation.mutate()}
              disabled={settleMutation.isPending}
              className="btn btn-primary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
            >
              {settleMutation.isPending ? 'Registrando...' : 'Registrar acerto'}
            </button>
          </div>
        ) : (
          <p style={{ fontSize: '0.83rem', color: 'var(--teal-dark)', fontWeight: 600, padding: '0.25rem 0' }}>
            Contas em dia — cada um pagou a sua parte.
          </p>
        )}

        <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
          A cota é proporcional à receita de cada um no mês (sem receitas, 50/50).
          Só despesas marcadas como "do casal" entram no cálculo.
        </p>
      </div>
    </div>
  )
}
