import {
  ArrowUpRight, ArrowDownRight, PiggyBank, Users, Copy, Gauge, TrendingUp, Zap, Sparkles,
} from 'lucide-react'
import type { Insight } from '@/api/insights'

const KIND_ICONS: Record<string, React.ElementType> = {
  spending_up: ArrowUpRight,
  spending_down: ArrowDownRight,
  savings: PiggyBank,
  couple: Users,
  duplicate: Copy,
  budget: Gauge,
  price_increase: TrendingUp,
  big_expense: Zap,
}

const SEVERITY_STYLES: Record<Insight['severity'], { bg: string; fg: string }> = {
  critical: { bg: 'var(--coral-light)', fg: 'var(--coral)' },
  warning:  { bg: 'var(--yellow-light)', fg: 'var(--yellow-dark)' },
  positive: { bg: 'var(--sage-light)', fg: 'var(--sage-dark)' },
  info:     { bg: 'var(--purple-muted)', fg: 'var(--purple-dark)' },
}

export function InsightsStrip({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null

  return (
    <section aria-label="Insights do mês" className="animate-fade-up animate-fade-up-2">
      <p style={{
        fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
        color: 'var(--text-3)', marginBottom: '0.625rem',
        display: 'flex', alignItems: 'center', gap: '0.375rem',
      }}>
        <Sparkles size={12} /> Insights do mês
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
        gap: '0.75rem',
      }}>
        {insights.slice(0, 6).map((insight, i) => {
          const Icon = KIND_ICONS[insight.kind] ?? Sparkles
          const style = SEVERITY_STYLES[insight.severity]
          return (
            <article
              key={`${insight.kind}-${i}`}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-card)',
                padding: '0.875rem 1rem',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
              }}
            >
              <span style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: style.bg, color: style.fg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {insight.category_icon
                  ? <span style={{ fontSize: '1rem' }}>{insight.category_icon}</span>
                  : <Icon size={16} strokeWidth={2.25} />}
              </span>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3 }}>
                  {insight.title}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginTop: '0.2rem', lineHeight: 1.45 }}>
                  {insight.detail}
                </p>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
