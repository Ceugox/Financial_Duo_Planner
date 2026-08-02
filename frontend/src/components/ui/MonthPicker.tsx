import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMonthFull } from '@/lib/formatters'

interface Props {
  month: number
  year: number
  onChange: (month: number, year: number) => void
  /** Impede navegar além do mês atual (padrão: true) */
  maxCurrent?: boolean
}

export function MonthPicker({ month, year, onChange, maxCurrent = true }: Props) {
  const now = new Date()
  const isCurrent = month === now.getMonth() + 1 && year === now.getFullYear()
  const atMax = maxCurrent && isCurrent

  const prev = () => {
    if (month === 1) onChange(12, year - 1)
    else onChange(month - 1, year)
  }
  const next = () => {
    if (atMax) return
    if (month === 12) onChange(1, year + 1)
    else onChange(month + 1, year)
  }

  const label = formatMonthFull(`${year}-${String(month).padStart(2, '0')}`)

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem',
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 99,
      padding: '0.25rem',
      boxShadow: 'var(--shadow-card)',
    }}>
      <button onClick={prev} className="btn btn-ghost btn-icon" aria-label="Mês anterior" style={{ borderRadius: 99 }}>
        <ChevronLeft size={16} />
      </button>
      <span style={{
        fontSize: '0.85rem',
        fontWeight: 600,
        color: 'var(--text-1)',
        minWidth: 120,
        textAlign: 'center',
        textTransform: 'capitalize',
      }}>
        {label}
      </span>
      <button
        onClick={next}
        className="btn btn-ghost btn-icon"
        aria-label="Próximo mês"
        disabled={atMax}
        style={{ borderRadius: 99, opacity: atMax ? 0.3 : 1, cursor: atMax ? 'default' : 'pointer' }}
      >
        <ChevronRight size={16} />
      </button>
      {!isCurrent && (
        <button
          onClick={() => onChange(now.getMonth() + 1, now.getFullYear())}
          className="btn btn-ghost"
          style={{ fontSize: '0.72rem', padding: '0.25rem 0.625rem', minHeight: 'auto', borderRadius: 99, color: 'var(--teal-dark)' }}
        >
          Hoje
        </button>
      )}
    </div>
  )
}
