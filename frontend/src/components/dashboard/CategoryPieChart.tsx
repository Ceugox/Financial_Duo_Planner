import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { CategoryBreakdownItem } from '@/api/dashboard'
import { formatBRL } from '@/lib/formatters'

interface Props {
  data: CategoryBreakdownItem[]
}

export function CategoryPieChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="card-header">
          <h3 className="card-title">Por Categoria</h3>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--purple-dark)', marginBottom: '0.25rem' }}>
            Sem despesas
          </p>
          <p style={{ fontSize: '0.78rem' }}>Nenhuma despesa este mês</p>
        </div>
      </div>
    )
  }

  const chartData = data.slice(0, 7).map((d) => ({
    name: `${d.category_icon} ${d.category_name}`,
    value: d.total,
    color: d.category_color,
    percentage: d.percentage,
  }))

  const total = chartData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="card animate-fade-up animate-fade-up-3">
      <div className="card-header">
        <h3 className="card-title">Por Categoria</h3>
        <span style={{ fontSize: '0.72rem', color: 'var(--purple-light)', fontWeight: 500 }}>despesas do mês</span>
      </div>
      <div style={{ padding: '1rem' }}>
        {/* Donut + total in centre */}
        <div style={{ position: 'relative' }}>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%" cy="50%"
                innerRadius={52} outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [formatBRL(Number(value)), 'Total']}
                contentStyle={{
                  fontFamily: 'var(--font-body)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-md)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Centre label */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}>
            <p style={{ fontSize: '0.62rem', color: 'var(--purple-light)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Total</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--purple-deep)', lineHeight: 1.2 }}>
              {formatBRL(total)}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {chartData.map((d) => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--purple-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.name}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--purple-deep)' }}>{formatBRL(d.value)}</span>
                <span style={{
                  fontSize: '0.65rem',
                  background: 'var(--purple-muted)',
                  color: 'var(--purple)',
                  padding: '0.1rem 0.375rem',
                  borderRadius: 99,
                  fontWeight: 600,
                }}>
                  {d.percentage.toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
