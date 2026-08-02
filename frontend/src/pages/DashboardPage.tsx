import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { dashboardApi } from '@/api/dashboard'
import { insightsApi } from '@/api/insights'
import { budgetsApi } from '@/api/budgets'
import { reviewApi } from '@/api/review'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { MonthlyChart } from '@/components/dashboard/MonthlyChart'
import { CategoryPieChart } from '@/components/dashboard/CategoryPieChart'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { InsightsStrip } from '@/components/dashboard/InsightsStrip'
import { ForecastCard } from '@/components/dashboard/ForecastCard'
import { MonthPicker } from '@/components/ui/MonthPicker'
import { currentMonthYear, formatBRL } from '@/lib/formatters'

function Skeleton({ style }: { style?: React.CSSProperties }) {
  return <div className="skeleton" style={{ height: 80, ...style }} />
}

function CardLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.25rem',
        fontSize: '0.78rem', fontWeight: 600,
        color: 'var(--teal-dark)', textDecoration: 'none',
      }}
    >
      {label} <ArrowUpRight size={14} />
    </Link>
  )
}

export function DashboardPage() {
  const { month: nowMonth, year: nowYear } = currentMonthYear()
  const [month, setMonth] = useState(nowMonth)
  const [year, setYear] = useState(nowYear)
  const isCurrentMonth = month === nowMonth && year === nowYear

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard', 'summary', month, year],
    queryFn: () => dashboardApi.summary(month, year),
  })

  const { data: monthlyChart, isLoading: loadingChart } = useQuery({
    queryKey: ['dashboard', 'monthly-chart'],
    queryFn: () => dashboardApi.monthlyChart(12),
  })

  const { data: categoryBreakdown } = useQuery({
    queryKey: ['dashboard', 'category-breakdown', month, year],
    queryFn: () => dashboardApi.categoryBreakdown(month, year, 'expense'),
  })

  const { data: recentTransactions } = useQuery({
    queryKey: ['dashboard', 'recent'],
    queryFn: () => dashboardApi.recentTransactions(8),
  })

  const { data: insights } = useQuery({
    queryKey: ['insights', 'feed', month, year],
    queryFn: () => insightsApi.feed(month, year),
  })

  const { data: forecast } = useQuery({
    queryKey: ['insights', 'forecast', month, year],
    queryFn: () => insightsApi.forecast(month, year),
    enabled: isCurrentMonth,
  })

  const { data: budgetStatus } = useQuery({
    queryKey: ['budgets', 'status', month, year],
    queryFn: () => budgetsApi.status(month, year),
  })

  const { data: review } = useQuery({
    queryKey: ['review'],
    queryFn: reviewApi.list,
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="summary-grid-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} style={{ height: 100, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
        <Skeleton style={{ height: 300, borderRadius: 'var(--radius-lg)' }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Período */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ fontSize: '1.25rem' }}>Visão geral</h2>
        <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
      </div>

      {/* Sugestões do Open Finance aguardando revisão */}
      {review && review.summary.pending_count > 0 && (
        <Link
          to="/conexoes"
          className="animate-fade-up"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'var(--teal-light)',
            border: '1px solid var(--teal)',
            borderRadius: 'var(--radius)',
            padding: '0.75rem 1.125rem',
            textDecoration: 'none',
          }}
        >
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--teal-dark)', flex: 1 }}>
            {review.summary.pending_count === 1
              ? '1 possível duplicata do banco aguardando sua decisão'
              : `${review.summary.pending_count} possíveis duplicatas do banco aguardando sua decisão`}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', fontWeight: 600, color: 'var(--teal-dark)' }}>
            Revisar <ArrowUpRight size={14} />
          </span>
        </Link>
      )}

      {/* Summary cards */}
      {summary && <SummaryCards data={summary} />}

      {/* Insights heurísticos */}
      {insights && <InsightsStrip insights={insights} />}

      {/* Previsão do mês corrente + orçamento */}
      {(isCurrentMonth && forecast) || (budgetStatus && budgetStatus.items.length > 0) ? (
        <div style={{ display: 'grid', gap: '1.25rem' }} className="xl-cols-2">
          {isCurrentMonth && forecast && <ForecastCard forecast={forecast} />}

          {budgetStatus && budgetStatus.items.length > 0 && (
            <div className="card animate-fade-up animate-fade-up-3">
              <div className="card-header">
                <h3 className="card-title">Orçamento</h3>
                <CardLink to="/orcamento" label="Gerenciar" />
              </div>
              <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {budgetStatus.items.slice(0, 5).map((item) => (
                  <div key={item.category_id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        {item.category_icon} {item.category_name}
                      </span>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatBRL(item.spent)} / {formatBRL(item.budget)}
                      </span>
                    </div>
                    <div className="progress-track">
                      <div style={{
                        height: '100%',
                        width: `${Math.min(item.pct, 100)}%`,
                        borderRadius: 99,
                        background: item.level === 'over' ? 'var(--coral)' : item.level === 'warning' ? 'var(--cream-deeper)' : 'var(--sage)',
                        transition: 'width 0.4s ease-out',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Chart + Pie */}
      <div style={{ display: 'grid', gap: '1.25rem' }} className="xl-cols-chart">
        <div>
          {!loadingChart && monthlyChart && monthlyChart.length > 0
            ? <MonthlyChart data={monthlyChart} />
            : (
              <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--purple-light)', fontSize: '0.875rem' }}>Sem dados para o gráfico</p>
              </div>
            )
          }
        </div>
        <CategoryPieChart data={categoryBreakdown ?? []} />
      </div>

      {/* Recent transactions + Investment summary */}
      <div style={{ display: 'grid', gap: '1.25rem' }} className="xl-cols-2">
        <RecentTransactions transactions={recentTransactions ?? []} />

        {/* Investment quick card */}
        {summary && (
          <div className="card animate-fade-up animate-fade-up-4">
            <div className="card-header">
              <h3 className="card-title">Carteira</h3>
              <CardLink to="/investimentos" label="Ver tudo" />
            </div>
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { label: 'Total Investido', value: formatBRL(summary.total_invested), color: 'var(--purple-deep)' },
                { label: 'Valor Atual',    value: formatBRL(summary.total_current_value), color: 'var(--teal-dark)' },
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--purple-light)', fontWeight: 500 }}>{row.label}</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: row.color, fontFamily: 'var(--font-display)' }}>{row.value}</span>
                </div>
              ))}

              <div style={{ height: 1, background: 'var(--border)' }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--purple-light)', fontWeight: 500 }}>Ganho / Perda</span>
                <span style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-display)',
                  color: summary.investment_gain_loss >= 0 ? 'var(--sage-dark)' : 'var(--coral)',
                }}>
                  {summary.investment_gain_loss >= 0 ? '+' : ''}{formatBRL(summary.investment_gain_loss)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
