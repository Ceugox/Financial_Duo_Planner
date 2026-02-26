import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react'
import type { DashboardSummary } from '@/api/dashboard'
import { formatBRL } from '@/lib/formatters'

interface Props {
  data: DashboardSummary
}

interface CardConfig {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  type: 'income' | 'expense' | 'balance' | 'savings'
  iconStyle: React.CSSProperties
}

export function SummaryCards({ data }: Props) {
  const cards: CardConfig[] = [
    {
      label: 'Receitas do Mês',
      value: formatBRL(data.month_income),
      icon: TrendingUp,
      type: 'income',
      iconStyle: { background: 'var(--sage-light)', color: 'var(--sage-dark)' },
    },
    {
      label: 'Despesas do Mês',
      value: formatBRL(data.month_expense),
      icon: TrendingDown,
      type: 'expense',
      iconStyle: { background: 'var(--coral-light)', color: 'var(--coral)' },
    },
    {
      label: 'Saldo do Mês',
      value: formatBRL(data.month_balance),
      icon: Wallet,
      type: 'balance',
      iconStyle: { background: 'var(--teal-light)', color: 'var(--teal-dark)' },
    },
    {
      label: 'Taxa de Poupança',
      value: `${data.savings_rate.toFixed(1)}%`,
      sub: 'do mês',
      icon: PiggyBank,
      type: 'savings',
      iconStyle: { background: 'var(--yellow-light)', color: 'var(--yellow-dark)' },
    },
  ]

  const valueColors: Record<string, string> = {
    income:  'var(--sage-dark)',
    expense: 'var(--coral)',
    balance: data.month_balance >= 0 ? 'var(--teal-dark)' : 'var(--coral)',
    savings: 'var(--yellow-dark)',
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '0.875rem',
    }}
      className="xl-cols-4"
    >
      {cards.map((card, i) => (
        <article
          key={card.label}
          className={`metric-card ${card.type} animate-fade-up animate-fade-up-${i + 1}`}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
            <div>
              <p className="metric-label">{card.label}</p>
              <p className="metric-value" style={{ color: valueColors[card.type] }}>
                {card.value}
              </p>
              {card.sub && (
                <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.125rem' }}>
                  {card.sub}
                </p>
              )}
            </div>
            <div style={{
              ...card.iconStyle,
              padding: '0.625rem',
              borderRadius: 'var(--radius-sm)',
              flexShrink: 0,
            }}>
              <card.icon size={18} strokeWidth={2} />
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
