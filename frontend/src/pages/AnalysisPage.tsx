import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ReferenceLine, Legend,
} from 'recharts'
import { AlertTriangle, ChartSpline } from 'lucide-react'
import { insightsApi, type SpendingAnalysis } from '@/api/insights'
import { formatBRL, formatMonth } from '@/lib/formatters'

const PERIODS = [
  { months: 6, label: '6 meses' },
  { months: 12, label: '12 meses' },
]

const CAT_COLORS = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', 'var(--cat-6)']

function compactBRL(value: number): string {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1).replace('.', ',')}k`
  return String(Math.round(value))
}

function KpiRow({ data }: { data: SpendingAnalysis }) {
  const cards = [
    { label: 'Gasto médio mensal', value: formatBRL(data.avg_expense), sub: 'meses fechados do período', color: 'var(--purple-deep)' },
    { label: 'Gasto médio por dia', value: formatBRL(data.avg_daily_expense), sub: 'sobre a média mensal', color: 'var(--teal-dark)' },
    {
      label: 'Mês mais caro',
      value: data.highest_month ? formatBRL(data.highest_month.expense) : '—',
      sub: data.highest_month ? formatMonth(data.highest_month.month) : 'sem dados',
      color: 'var(--coral)',
    },
    {
      label: 'Mês mais leve',
      value: data.lowest_month ? formatBRL(data.lowest_month.expense) : '—',
      sub: data.lowest_month ? formatMonth(data.lowest_month.month) : 'sem dados',
      color: 'var(--sage-dark)',
    },
  ]
  return (
    <div className="summary-grid-4">
      {cards.map((card, i) => (
        <article key={card.label} className={`metric-card animate-fade-up animate-fade-up-${i + 1}`}>
          <p className="metric-label">{card.label}</p>
          <p className="metric-value" style={{ color: card.color }}>{card.value}</p>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.125rem' }}>{card.sub}</p>
        </article>
      ))}
    </div>
  )
}

export function AnalysisPage() {
  const [months, setMonths] = useState(6)

  const { data, isLoading } = useQuery({
    queryKey: ['insights', 'spending-analysis', months],
    queryFn: () => insightsApi.spendingAnalysis(months),
  })

  if (isLoading || !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="summary-grid-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
        <div className="skeleton" style={{ height: 320, borderRadius: 'var(--radius-lg)' }} />
      </div>
    )
  }

  const monthlyData = data.monthly.map((p, i) => ({
    ...p,
    label: formatMonth(p.month),
    isCurrent: i === data.monthly.length - 1,
  }))

  const topCategories = data.categories.filter((c) => c.category_name !== 'Sem categoria').slice(0, 6)
  const trendData = data.months_axis.map((label, i) => {
    const row: Record<string, number | string> = { label: formatMonth(label) }
    topCategories.forEach((cat) => { row[cat.category_name] = cat.series[i] })
    return row
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ fontSize: '1.25rem' }}>Análise de gastos</h2>
        <div className="type-toggle" style={{ width: 'auto' }}>
          {PERIODS.map((p) => (
            <button
              key={p.months}
              onClick={() => setMonths(p.months)}
              className={months === p.months ? 'active-income' : ''}
              style={months === p.months ? { background: 'var(--teal)', color: 'white', boxShadow: '0 2px 8px rgba(68,117,107,0.4)' } : undefined}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <KpiRow data={data} />

      {/* Pontos de atenção */}
      {data.concerns.length > 0 && (
        <section aria-label="Pontos de atenção">
          <p style={{
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
            color: 'var(--text-3)', marginBottom: '0.625rem',
            display: 'flex', alignItems: 'center', gap: '0.375rem',
          }}>
            <AlertTriangle size={12} /> Pontos de atenção
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: '0.75rem' }}>
            {data.concerns.map((concern, i) => (
              <article key={`${concern.kind}-${i}`} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-card)',
                padding: '0.875rem 1rem',
                display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
              }}>
                <span style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: concern.kind === 'over_budget' ? 'var(--coral-light)' : 'var(--yellow-light)',
                  color: concern.kind === 'over_budget' ? 'var(--coral)' : 'var(--yellow-dark)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {concern.category_icon
                    ? <span style={{ fontSize: '1rem' }}>{concern.category_icon}</span>
                    : <AlertTriangle size={15} strokeWidth={2.25} />}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3 }}>{concern.title}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginTop: '0.2rem', lineHeight: 1.45 }}>{concern.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Gastos mensais + média */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Gastos por mês</h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
            média de {formatBRL(data.avg_expense)}/mês · o mês atual é parcial
          </span>
        </div>
        <div className="card-body" style={{ height: 300 }}>
          <ResponsiveContainer>
            <ComposedChart data={monthlyData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickFormatter={compactBRL} tickLine={false} axisLine={false} width={48} />
              <Tooltip
                formatter={(value, name) => [formatBRL(Number(value ?? 0)), name === 'expense' ? 'Despesas' : 'Receitas']}
                contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', fontSize: '0.8rem' }}
              />
              <Bar dataKey="expense" name="expense" radius={[5, 5, 0, 0]} fill="var(--coral-soft)" />
              <Line type="monotone" dataKey="income" name="income" stroke="var(--sage-dark)" strokeWidth={2} dot={false} />
              {data.avg_expense > 0 && (
                <ReferenceLine
                  y={data.avg_expense}
                  stroke="var(--purple-dark)"
                  strokeDasharray="5 4"
                  label={{ value: 'média', position: 'insideTopRight', fontSize: 10, fill: 'var(--purple-dark)' }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tendência por categoria */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ChartSpline size={16} color="var(--teal-dark)" /> Tendência por categoria
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>top {topCategories.length} do período</span>
        </div>
        {topCategories.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem 1rem' }}>
            <p style={{ fontSize: '0.8rem' }}>Sem despesas categorizadas no período.</p>
          </div>
        ) : (
          <>
            <div className="card-body" style={{ height: 280, paddingBottom: 0 }}>
              <ResponsiveContainer>
                <ComposedChart data={trendData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickFormatter={compactBRL} tickLine={false} axisLine={false} width={48} />
                  <Tooltip
                    formatter={(value, name) => [formatBRL(Number(value ?? 0)), String(name)]}
                    contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', fontSize: '0.8rem' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  {topCategories.map((cat, i) => (
                    <Line
                      key={cat.category_name}
                      type="monotone"
                      dataKey={cat.category_name}
                      stroke={CAT_COLORS[i % CAT_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Tabela resumo por categoria */}
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th style={{ textAlign: 'right' }}>Média mensal</th>
                    <th style={{ textAlign: 'right' }}>Mês atual</th>
                    <th className="col-sm" style={{ textAlign: 'right' }}>vs média</th>
                    <th className="col-sm" style={{ textAlign: 'right' }}>Peso no período</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categories.map((cat) => (
                    <tr key={`${cat.category_id}`}>
                      <td style={{ fontSize: '0.85rem', fontWeight: 500 }}>{cat.category_icon} {cat.category_name}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: '0.83rem' }}>{formatBRL(cat.avg_monthly)}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: '0.83rem', fontWeight: 600 }}>{formatBRL(cat.current_month)}</td>
                      <td className="col-sm" style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                        {cat.avg_monthly > 0 && cat.current_month > 0 ? (
                          <span style={{
                            fontWeight: 700,
                            color: cat.delta_pct_vs_avg > 10 ? 'var(--coral)' : cat.delta_pct_vs_avg < -10 ? 'var(--sage-dark)' : 'var(--text-2)',
                          }}>
                            {cat.delta_pct_vs_avg > 0 ? '+' : ''}{cat.delta_pct_vs_avg.toFixed(0)}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="col-sm" style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-2)' }}>
                        {cat.share_pct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
