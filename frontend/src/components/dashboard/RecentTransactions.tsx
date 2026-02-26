import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import type { Transaction } from '@/api/transactions'
import { formatBRL, formatDate } from '@/lib/formatters'

interface Props {
  transactions: Transaction[]
}

export function RecentTransactions({ transactions }: Props) {
  return (
    <div className="card animate-fade-up animate-fade-up-3">
      <div className="card-header">
        <h3 className="card-title">Últimas Transações</h3>
        <Link
          to="/transacoes"
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
          Ver todas <ArrowUpRight size={14} />
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💸</div>
          <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--purple-dark)', marginBottom: '0.25rem' }}>
            Sem transações
          </p>
          <p style={{ fontSize: '0.78rem' }}>Adicione sua primeira transação</p>
        </div>
      ) : (
        <div style={{ padding: '0.25rem 0' }}>
          {transactions.map((tx, i) => (
            <div
              key={tx.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.75rem 1.25rem',
                borderBottom: i < transactions.length - 1 ? '1px solid var(--border)' : 'none',
                gap: '0.875rem',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(246,245,205,0.4)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '')}
            >
              {/* Category icon */}
              <div style={{
                width: 38, height: 38,
                borderRadius: 'var(--radius-sm)',
                background: (tx.category?.color ?? '#9CA3AF') + '22',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                flexShrink: 0,
              }}>
                {tx.category?.icon ?? '📌'}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--purple-deep)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tx.description}
                </p>
                <p style={{ fontSize: '0.72rem', color: 'var(--purple-light)', marginTop: '0.1rem' }}>
                  {tx.category?.name ?? 'Sem categoria'} · {formatDate(tx.date)}
                </p>
              </div>

              {/* Amount */}
              <span className={tx.type === 'income' ? 'amount-income' : 'amount-expense'} style={{ fontSize: '0.9rem', flexShrink: 0 }}>
                {tx.type === 'income' ? '+' : '-'}{formatBRL(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
