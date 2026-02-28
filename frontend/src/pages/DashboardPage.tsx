import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { dashboardApi } from '@/api/dashboard'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { MonthlyChart } from '@/components/dashboard/MonthlyChart'
import { CategoryPieChart } from '@/components/dashboard/CategoryPieChart'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { currentMonthYear, formatBRL } from '@/lib/formatters'

function Skeleton({ style }: { style?: React.CSSProperties }) {
  return <div className="skeleton" style={{ height: 80, ...style }} />
}

export function DashboardPage() {
  const { month, year } = currentMonthYear()

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

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.875rem' }}
          className="xl-cols-4"
        >
          {[1,2,3,4].map((i) => <Skeleton key={i} style={{ height: 100, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
        <Skeleton style={{ height: 300, borderRadius: 'var(--radius-lg)' }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Summary cards */}
      {summary && <SummaryCards data={summary} />}

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
              <Link
                to="/investimentos"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--teal-dark)',
                  textDecoration: 'none',
                }}
              >
                Ver tudo <ArrowUpRight size={14} />
              </Link>
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
