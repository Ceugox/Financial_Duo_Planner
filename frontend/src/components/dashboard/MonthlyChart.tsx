import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import type { MonthlyChartItem } from '@/api/dashboard'
import { formatMonth, formatBRL } from '@/lib/formatters'

interface Props {
  data: MonthlyChartItem[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '0.875rem 1rem',
      boxShadow: 'var(--shadow-md)',
      fontFamily: 'var(--font-body)',
      minWidth: 160,
    }}>
      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--purple-deep)', marginBottom: '0.5rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {formatMonth(label as string)}
      </p>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.fill }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--purple-light)' }}>{p.name}</span>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--purple-deep)' }}>{formatBRL(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function MonthlyChart({ data }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    monthLabel: formatMonth(d.month),
  }))

  return (
    <div className="card animate-fade-up animate-fade-up-2">
      <div className="card-header">
        <h3 className="card-title">Receitas vs. Despesas</h3>
        <span style={{ fontSize: '0.72rem', color: 'var(--purple-light)', fontWeight: 500 }}>
          últimos 12 meses
        </span>
      </div>
      <div style={{ padding: '1.25rem 0.5rem 0.5rem' }}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 0, right: 8, left: -16, bottom: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="monthLabel"
              tick={{ fontSize: 11, fill: 'var(--purple-light)', fontFamily: 'var(--font-body)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: 'var(--purple-light)', fontFamily: 'var(--font-body)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(116,170,155,0.06)', radius: 4 }} />
            <Bar dataKey="income"  name="Receitas" fill="var(--sage)"  radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="expense" name="Despesas" fill="var(--coral)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', padding: '0.75rem 0 0.25rem' }}>
          {[{ color: 'var(--sage)', label: 'Receitas' }, { color: 'var(--coral)', label: 'Despesas' }].map((l) => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--purple-light)', fontWeight: 500 }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
