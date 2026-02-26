import { Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/':              { title: 'Dashboard',     subtitle: 'Visão geral das suas finanças' },
  '/transacoes':    { title: 'Transações',    subtitle: 'Receitas e despesas' },
  '/investimentos': { title: 'Investimentos', subtitle: 'Sua carteira' },
  '/objetivos':     { title: 'Objetivos',     subtitle: 'Metas de compra' },
}

interface Props {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: Props) {
  const location = useLocation()
  const info = PAGE_TITLES[location.pathname] ?? { title: 'Finanças', subtitle: '' }
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <header style={{
      height: 64,
      background: 'var(--cream)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.25rem',
      gap: '1rem',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
        <button
          onClick={onMenuClick}
          className="btn btn-ghost btn-icon hide-on-lg"
          style={{ flexShrink: 0 }}
          aria-label="Menu"
        >
          <Menu size={20} strokeWidth={1.75} />
        </button>
        <div style={{ minWidth: 0 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.15rem',
            fontWeight: 700,
            color: 'var(--purple-deep)',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {info.title}
          </h1>
          <p style={{ fontSize: '0.7rem', color: 'var(--purple-light)' }}
            className="show-sm"
          >
            {info.subtitle}
          </p>
        </div>
      </div>

      <div style={{
        fontSize: '0.72rem',
        color: 'var(--purple-light)',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
        className="show-sm"
      >
        {today}
      </div>
    </header>
  )
}
