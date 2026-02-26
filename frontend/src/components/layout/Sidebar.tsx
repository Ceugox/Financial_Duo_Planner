import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, TrendingUp, Target, LogOut, X } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transacoes', icon: ArrowLeftRight, label: 'Transações' },
  { to: '/investimentos', icon: TrendingUp, label: 'Investimentos' },
  { to: '/objetivos', icon: Target, label: 'Objetivos' },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: Props) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      {open && <div className="overlay hide-on-lg" onClick={onClose} />}

      <aside
        className="sidebar"
        style={{ transform: open ? 'translateX(0)' : undefined }}
        data-open={open}
      >
        {/* Brand */}
        <div style={{ padding: '1.5rem 1.25rem 1rem', borderBottom: '1px solid rgba(246,245,205,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 42, height: 42,
                borderRadius: '12px',
                overflow: 'hidden',
                flexShrink: 0,
                border: '2px solid rgba(236,228,136,0.35)',
              }}>
                <img
                  src="/logo.jpg"
                  alt="Logo"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
                />
              </div>
              <div>
                <p style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: 'var(--cream)',
                  lineHeight: 1.2,
                }}>
                  Finanças
                </p>
                <p style={{ fontSize: '0.7rem', color: 'rgba(246,245,205,0.5)', letterSpacing: '0.04em' }}>
                  do casal
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="hide-on-lg btn btn-ghost btn-icon"
              style={{ color: 'rgba(246,245,205,0.5)' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '1rem 0', overflowY: 'auto' }}>
          <p style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(246,245,205,0.3)',
            padding: '0 1.75rem',
            marginBottom: '0.5rem',
          }}>
            Menu
          </p>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={18} strokeWidth={1.75} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div style={{ padding: '1rem', borderTop: '1px solid rgba(246,245,205,0.1)' }}>
          {user && (
            <div style={{ marginBottom: '0.75rem', padding: '0 0.25rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cream)' }}>{user.name}</p>
              <p style={{ fontSize: '0.7rem', color: 'rgba(246,245,205,0.4)' }}>{user.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="btn btn-ghost"
            style={{
              width: '100%',
              justifyContent: 'flex-start',
              color: 'rgba(246,245,205,0.5)',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius)',
              gap: '0.625rem',
            }}
          >
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <style>{`
        @media (max-width: 1023px) {
          .sidebar {
            transform: ${open ? 'translateX(0)' : 'translateX(-100%)'};
          }
        }
        @media (min-width: 1024px) {
          .sidebar { transform: translateX(0) !important; }
        }
      `}</style>
    </>
  )
}
