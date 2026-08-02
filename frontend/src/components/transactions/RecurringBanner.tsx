import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Repeat, Check } from 'lucide-react'
import { transactionsApi } from '@/api/transactions'
import { formatBRL } from '@/lib/formatters'

interface Props {
  month: number
  year: number
}

/** Recorrências declaradas ainda não lançadas no mês — lançamento em um clique. */
export function RecurringBanner({ month, year }: Props) {
  const qc = useQueryClient()
  const now = new Date()
  const isPastOrCurrent = year < now.getFullYear() || (year === now.getFullYear() && month <= now.getMonth() + 1)

  const { data: pending } = useQuery({
    queryKey: ['recurring-pending', month, year],
    queryFn: () => transactionsApi.recurringPending(month, year),
    enabled: isPastOrCurrent,
  })

  const materialize = useMutation({
    mutationFn: () => transactionsApi.recurringMaterialize(month, year),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['insights'] })
      qc.invalidateQueries({ queryKey: ['budgets'] })
      qc.invalidateQueries({ queryKey: ['recurring-pending'] })
    },
  })

  if (!isPastOrCurrent || !pending || pending.length === 0) return null

  const total = pending.reduce((sum, tx) => sum + (tx.type === 'expense' ? tx.amount : -tx.amount), 0)

  return (
    <div
      className="animate-fade-up"
      style={{
        background: 'var(--yellow-light)',
        border: '1px solid var(--cream-deeper)',
        borderRadius: 'var(--radius)',
        padding: '0.875rem 1.125rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.875rem',
        flexWrap: 'wrap',
      }}
    >
      <span style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: 'var(--bg-card)', color: 'var(--yellow-dark)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Repeat size={16} strokeWidth={2.25} />
      </span>
      <div style={{ flex: 1, minWidth: 200 }}>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--yellow-dark)' }}>
          {pending.length === 1
            ? '1 recorrência ainda não lançada neste mês'
            : `${pending.length} recorrências ainda não lançadas neste mês`}
        </p>
        <p style={{ fontSize: '0.74rem', color: 'var(--yellow-dark)', opacity: 0.85 }}>
          {pending.slice(0, 3).map((tx) => tx.description).join(' · ')}
          {pending.length > 3 ? ` e mais ${pending.length - 3}` : ''}
          {' — '}impacto de {formatBRL(Math.abs(total))}
        </p>
      </div>
      <button
        onClick={() => materialize.mutate()}
        disabled={materialize.isPending}
        className="btn btn-primary"
        style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
      >
        <Check size={14} /> {materialize.isPending ? 'Lançando…' : 'Lançar todas'}
      </button>
    </div>
  )
}
