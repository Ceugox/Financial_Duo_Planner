import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, Wallet, TrendingUp, Target } from 'lucide-react'

const ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Início' },
  { to: '/transacoes', icon: ArrowLeftRight, label: 'Transações' },
  { to: '/orcamento', icon: Wallet, label: 'Orçamento' },
  { to: '/investimentos', icon: TrendingUp, label: 'Invest.' },
  { to: '/objetivos', icon: Target, label: 'Objetivos' },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav hide-on-lg">
      {ITEMS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
        >
          <Icon size={20} strokeWidth={1.75} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
