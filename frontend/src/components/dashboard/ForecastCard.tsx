import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts'
import { CalendarClock } from 'lucide-react'
import type { Forecast } from '@/api/insights'
import { formatBRL } from '@/lib/formatters'

function compactBRL(value: number): string {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1).replace('.', ',')}k`
  return String(Math.round(value))
}

export function ForecastCard({ forecast }: { forecast: Forecast }) {
  const stats = [
    {
      label: 'Fechamento previsto',
      value: formatBRL(forecast.projected_balance),
      color: forecast.projected_balance >= 0 ? 'var(--sage-dark)' : 'var(--coral)',
      hint: `${forecast.days_remaining} dias restantes`,
    },
    {
      label: 'Livre por dia',
      value: formatBRL(forecast.safe_to_spend_daily),
      color: 'var(--teal-dark)',
      hint: 'para fechar no zero a zero',
    },
    {
      label: 'Contas já esperadas',
      value: formatBRL(forecast.committed_remaining),
      color: 'var(--purple-dark)',
      hint: 'recorrências ainda não lançadas',
    },
  ]

  return (
    <div className="card animate-fade-up animate-fade-up-3">
      <div className="card-header">
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CalendarClock size={16} color="var(--teal-dark)" /> Previsão do mês
        </h3>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 500 }}>
          ritmo de {formatBRL(forecast.variable_daily_rate)}/dia
        </span>
      </div>

      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
          {stats.map((s) => (
            <div key={s.label}>
              <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
                {s.label}
              </p>
              <p style={{ fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums', fontSize: '1.15rem', fontWeight: 700, color: s.color, marginTop: '0.125rem' }}>
                {s.value}
              </p>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>{s.hint}</p>
            </div>
          ))}
        </div>

        <div style={{ width: '100%', height: 180 }}>
          <ResponsiveContainer>
            <ComposedChart data={forecast.series} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: 'var(--text-3)' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-3)' }}
                tickFormatter={compactBRL}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatBRL(Number(value ?? 0)),
                  name === 'actual' ? 'Gasto acumulado' : 'Projeção',
                ]}
                labelFormatter={(day) => `Dia ${day}`}
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-md)',
                  fontSize: '0.8rem',
                }}
              />
              {forecast.projected_income > 0 && (
                <ReferenceLine
                  y={forecast.projected_income}
                  stroke="var(--sage-dark)"
                  strokeDasharray="4 4"
                  label={{ value: 'renda', position: 'insideTopRight', fontSize: 10, fill: 'var(--sage-dark)' }}
                />
              )}
              <Line type="monotone" dataKey="actual" stroke="var(--coral)" strokeWidth={2.25} dot={false} isAnimationActive={false} connectNulls={false} />
              <Line type="monotone" dataKey="projected" stroke="var(--purple-light)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
