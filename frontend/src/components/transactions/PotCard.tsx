import { useQuery } from '@tanstack/react-query'
import { PiggyBank, ArrowRight } from 'lucide-react'
import { potApi } from '@/api/pot'
import { formatBRL } from '@/lib/formatters'

interface Props {
  month: number
  year: number
}

/** Caixa único do casal: reserva do dia a dia com uma pessoa, excedente
 *  transferido para quem guarda/investe. Substitui o antigo acerto. */
export function PotCard({ month, year }: Props) {
  const { data: pot } = useQuery({
    queryKey: ['pot', month, year],
    queryFn: () => potApi.status(month, year),
  })

  if (!pot || (pot.couple_income === 0 && pot.couple_expense === 0)) return null

  const stats = [
    { label: 'Renda do casal', value: pot.couple_income, color: 'var(--sage-dark)', bg: 'var(--sage-light)' },
    { label: 'Gastos do casal', value: pot.couple_expense, color: 'var(--coral)', bg: 'var(--coral-light)' },
    {
      label: 'Sobra para guardar', value: pot.leftover,
      color: pot.leftover >= 0 ? 'var(--teal-dark)' : 'var(--coral)',
      bg: pot.leftover >= 0 ? 'var(--teal-light)' : 'var(--coral-light)',
    },
  ]

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PiggyBank size={16} color="var(--teal-dark)" /> Caixa único
        </h3>
        <span style={{ fontSize: '0.72rem', color: 'var(--purple-light)', fontWeight: 500 }}>
          reserva de {formatBRL(pot.reserve)} com {pot.keeper_name}
        </span>
      </div>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))', gap: '0.75rem' }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 'var(--radius-sm)', padding: '0.625rem 0.875rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.2rem' }}>
                {s.label}
              </p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: s.color, whiteSpace: 'nowrap' }}>
                {formatBRL(s.value)}
              </p>
            </div>
          ))}
        </div>

        {/* Transferência do excedente */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap',
          padding: '0.625rem 0.875rem', background: 'var(--bg)', borderRadius: 'var(--radius-sm)',
          fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.5,
        }}>
          {pot.to_transfer > 0 ? (
            <>
              <span>
                <strong style={{ color: 'var(--purple-deep)' }}>{pot.keeper_name}</strong> recebeu {formatBRL(pot.keeper_income)},
                gastou {formatBRL(pot.keeper_expense)} e já enviou {formatBRL(pot.already_transferred)} —
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 700, color: 'var(--teal-dark)', whiteSpace: 'nowrap' }}>
                a transferir: {formatBRL(pot.to_transfer)} <ArrowRight size={13} /> {pot.saver_name}
              </span>
            </>
          ) : (
            <span>
              Excedente de <strong style={{ color: 'var(--purple-deep)' }}>{pot.keeper_name}</strong> já
              transferido neste mês ({formatBRL(pot.already_transferred)} enviados; reserva de {formatBRL(pot.reserve)} mantida).
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
