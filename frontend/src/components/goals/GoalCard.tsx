import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, Plus, Check } from 'lucide-react'
import type { PurchaseGoal } from '@/api/goals'
import { goalsApi } from '@/api/goals'
import { formatBRL, formatDate } from '@/lib/formatters'
import { Badge } from '@/components/ui/Badge'

const PRIORITY_LABELS: Record<string, string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }
const PRIORITY_VARIANTS: Record<string, 'danger' | 'warning' | 'info'> = { alta: 'danger', media: 'warning', baixa: 'info' }

interface Props {
  goal: PurchaseGoal
  onEdit: () => void
  monthlySavings?: number
}

export function GoalCard({ goal, onEdit, monthlySavings }: Props) {
  const qc = useQueryClient()
  const [depositAmount, setDepositAmount] = useState('')
  const [showDeposit, setShowDeposit] = useState(false)

  const progress  = Math.min((goal.saved_amount / goal.target_amount) * 100, 100)
  const remaining = goal.target_amount - goal.saved_amount

  const monthsEstimate = monthlySavings && monthlySavings > 0 && !goal.is_completed
    ? Math.ceil(remaining / monthlySavings)
    : null

  const depositMutation = useMutation({
    mutationFn: ({ id, amount }: { id: number; amount: number }) => goalsApi.deposit(id, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      setDepositAmount('')
      setShowDeposit(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: goalsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })

  return (
    <article style={{
      background: 'white',
      borderRadius: 'var(--radius-lg)',
      border: `1px solid ${goal.is_completed ? 'var(--sage-light)' : 'var(--border)'}`,
      boxShadow: 'var(--shadow-card)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'box-shadow 0.2s',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-card)' }}
    >
      {/* Accent line */}
      <div style={{
        height: 3,
        background: goal.is_completed
          ? 'linear-gradient(90deg, var(--sage), var(--teal))'
          : 'linear-gradient(90deg, var(--teal), var(--purple-light))',
      }} />

      <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.05rem',
              fontWeight: 600,
              color: 'var(--purple-deep)',
              marginBottom: '0.375rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {goal.name}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
              <Badge variant={PRIORITY_VARIANTS[goal.priority] ?? 'default'}>
                {PRIORITY_LABELS[goal.priority] ?? goal.priority}
              </Badge>
              {goal.is_completed && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--sage-dark)', background: 'var(--sage-light)', padding: '0.15rem 0.5rem', borderRadius: 99 }}>
                  <Check size={10} /> Concluído
                </span>
              )}
              {goal.category && (
                <span style={{ fontSize: '0.7rem', color: 'var(--purple-light)', background: 'var(--purple-muted)', padding: '0.15rem 0.5rem', borderRadius: 99 }}>
                  {goal.category}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.125rem', flexShrink: 0 }}>
            <button onClick={onEdit} className="btn btn-ghost btn-icon"><Pencil size={13} /></button>
            <button onClick={() => { if (confirm('Excluir este objetivo?')) deleteMutation.mutate(goal.id) }} className="btn btn-danger btn-icon"><Trash2 size={13} /></button>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--purple-light)', fontWeight: 500 }}>
              {formatBRL(goal.saved_amount)} de {formatBRL(goal.target_amount)}
            </span>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: goal.is_completed ? 'var(--sage-dark)' : 'var(--teal-dark)',
            }}>
              {progress.toFixed(0)}%
            </span>
          </div>
          <div className="progress-track">
            <div className={`progress-fill${goal.is_completed ? ' completed' : ''}`} style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Info pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {!goal.is_completed && remaining > 0 && (
            <span style={{ fontSize: '0.72rem', background: 'var(--purple-muted)', color: 'var(--purple-dark)', padding: '0.25rem 0.625rem', borderRadius: 99, fontWeight: 500 }}>
              Faltam {formatBRL(remaining)}
            </span>
          )}
          {goal.target_date && (
            <span style={{ fontSize: '0.72rem', background: 'var(--yellow-light)', color: 'var(--yellow-dark)', padding: '0.25rem 0.625rem', borderRadius: 99, fontWeight: 500 }}>
              📅 {formatDate(goal.target_date)}
            </span>
          )}
          {monthsEstimate && (
            <span style={{ fontSize: '0.72rem', background: 'var(--teal-light)', color: 'var(--teal-dark)', padding: '0.25rem 0.625rem', borderRadius: 99, fontWeight: 500 }}>
              ⏱ ~{monthsEstimate} {monthsEstimate === 1 ? 'mês' : 'meses'}
            </span>
          )}
        </div>

        {/* Deposit */}
        {!goal.is_completed && (
          <div style={{ marginTop: 'auto' }}>
            {showDeposit ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="number" min="0.01" step="0.01"
                  placeholder="R$ 0,00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="input-field"
                  style={{ flex: 1, fontSize: '0.875rem' }}
                  autoFocus
                />
                <button
                  onClick={() => { const a = parseFloat(depositAmount); if (a > 0) depositMutation.mutate({ id: goal.id, amount: a }) }}
                  disabled={depositMutation.isPending}
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 0.875rem', fontSize: '0.8rem' }}
                >
                  {depositMutation.isPending ? '...' : 'OK'}
                </button>
                <button onClick={() => setShowDeposit(false)} className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeposit(true)}
                className="btn"
                style={{
                  width: '100%',
                  border: '1.5px dashed var(--teal-light)',
                  color: 'var(--teal-dark)',
                  background: 'transparent',
                  fontSize: '0.8rem',
                  padding: '0.5rem',
                }}
              >
                <Plus size={14} /> Depositar
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
