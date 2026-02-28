import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Search, User } from 'lucide-react'
import { transactionsApi, type Transaction } from '@/api/transactions'
import { categoriesApi } from '@/api/categories'
import { authApi } from '@/api/auth'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { formatBRL, formatDate } from '@/lib/formatters'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function UserComparisonCard({ name, income, expense }: { name: string; income: number; expense: number }) {
  const balance = income - expense
  const initial = name.charAt(0).toUpperCase()

  return (
    <div style={{
      background: 'white',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-card)',
      padding: '1rem 1.125rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'var(--purple-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
        }}>
          {initial}
        </div>
        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--purple-deep)' }}>{name}</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
        {[
          { label: 'Receitas',  value: income,   color: 'var(--sage-dark)',  bg: 'var(--sage-light)' },
          { label: 'Despesas',  value: expense,  color: 'var(--coral)',       bg: 'var(--coral-light)' },
          { label: 'Saldo',     value: balance,  color: balance >= 0 ? 'var(--teal-dark)' : 'var(--coral)', bg: balance >= 0 ? 'var(--teal-light)' : 'var(--coral-light)' },
        ].map((s) => (
          <div key={s.label} style={{
            background: s.bg,
            borderRadius: 8,
            padding: '0.5rem 0.625rem',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.2rem' }}>
              {s.label}
            </p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700, color: s.color, whiteSpace: 'nowrap' }}>
              {formatBRL(s.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TransactionsPage() {
  const qc = useQueryClient()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [typeFilter, setTypeFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [search, setSearch] = useState('')
  const [editTx, setEditTx] = useState<Transaction | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', month, year, typeFilter, categoryFilter, userFilter, search],
    queryFn: () => transactionsApi.list({
      month, year,
      type: typeFilter || undefined,
      category_id: categoryFilter ? Number(categoryFilter) : undefined,
      user_id: userFilter ? Number(userFilter) : undefined,
      search: search || undefined,
      page_size: 100,
    }),
  })

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: authApi.users })

  const deleteMutation = useMutation({
    mutationFn: transactionsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const totalIncome  = transactions?.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0) ?? 0
  const totalExpense = transactions?.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0) ?? 0
  const balance      = totalIncome - totalExpense

  // Per-user stats computed from loaded transactions (used only in Todos mode)
  const showComparison = !userFilter && (users?.length ?? 0) > 1
  const userStats = showComparison
    ? users!.map((u) => {
        const txs = transactions ?? []
        const uIncome  = txs.filter((t) => t.user_id === u.id && t.type === 'income').reduce((s, t) => s + t.amount, 0)
        const uExpense = txs.filter((t) => t.user_id === u.id && t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        return { user: u, income: uIncome, expense: uExpense }
      })
    : []

  const openNew  = () => { setEditTx(undefined); setDialogOpen(true) }
  const openEdit = (tx: Transaction) => { setEditTx(tx); setDialogOpen(true) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Filters */}
      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', alignItems: 'center' }}>
          {/* Month + Year */}
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input-field" style={{ width: 'auto' }}>
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="input-field" style={{ width: 80 }} />

          {/* User */}
          {users && users.length > 1 && (
            <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="input-field" style={{ width: 'auto' }}>
              <option value="">Todos os usuários</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}

          {/* Type */}
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-field" style={{ width: 'auto' }}>
            <option value="">Todos os tipos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
          </select>

          {/* Category */}
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input-field" style={{ width: 'auto' }}>
            <option value="">Todas</option>
            {categories?.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>

          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 140 }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--purple-light)' }} />
            <input
              type="text" placeholder="Buscar descrição..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="input-field" style={{ paddingLeft: '2.25rem' }}
            />
          </div>

          <button onClick={openNew} className="btn btn-primary" style={{ marginLeft: 'auto' }}>
            <Plus size={16} /> Nova Transação
          </button>
        </div>
      </div>

      {/* Per-user comparison (only when Todos selected and 2+ users) */}
      {showComparison && (
        <div>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <User size={12} /> Comparativo por usuário
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${userStats.length}, 1fr)`, gap: '0.875rem' }}>
            {userStats.map(({ user, income, expense }) => (
              <UserComparisonCard key={user.id} name={user.name} income={income} expense={expense} />
            ))}
          </div>
        </div>
      )}

      {/* Totals strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem' }}>
        {[
          { label: userFilter ? `Receitas — ${users?.find(u => String(u.id) === userFilter)?.name ?? ''}` : 'Receitas do Casal',  value: totalIncome,  colorVar: 'var(--sage-dark)',  bgVar: 'var(--sage-light)' },
          { label: userFilter ? `Despesas — ${users?.find(u => String(u.id) === userFilter)?.name ?? ''}` : 'Despesas do Casal',  value: totalExpense, colorVar: 'var(--coral)',       bgVar: 'var(--coral-light)' },
          { label: 'Saldo',     value: balance,      colorVar: balance >= 0 ? 'var(--teal-dark)' : 'var(--coral)', bgVar: balance >= 0 ? 'var(--teal-light)' : 'var(--coral-light)' },
        ].map((s) => (
          <div key={s.label} style={{
            background: 'white',
            borderRadius: 'var(--radius-lg)',
            padding: '0.875rem 1rem',
            textAlign: 'center',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-card)',
          }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.25rem' }}>
              {s.label}
            </p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, color: s.colorVar }}>
              {formatBRL(s.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="card-header">
          <span style={{ fontSize: '0.85rem', color: 'var(--purple-light)', fontWeight: 500 }}>
            {transactions?.length ?? 0} transações
            {userFilter && users && (
              <span style={{ marginLeft: '0.5rem', background: 'var(--purple-pale, #f3f0ff)', color: 'var(--purple-dark)', padding: '0.1rem 0.5rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600 }}>
                {users.find(u => String(u.id) === userFilter)?.name}
              </span>
            )}
          </span>
          <button onClick={openNew} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
            <Plus size={14} /> Nova
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--purple-light)', fontSize: '0.875rem' }}>
            Carregando...
          </div>
        ) : (transactions?.length ?? 0) === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💸</div>
            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--purple-dark)', marginBottom: '0.25rem' }}>
              Nenhuma transação
            </p>
            <p style={{ fontSize: '0.78rem' }}>Ajuste os filtros ou adicione uma transação</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th className="col-sm">Categoria</th>
                  <th>Data</th>
                  <th className="col-md">Pagamento</th>
                  {!userFilter && users && users.length > 1 && <th className="col-sm">Usuário</th>}
                  <th style={{ textAlign: 'right' }}>Valor</th>
                  <th style={{ width: 64 }}></th>
                </tr>
              </thead>
              <tbody>
                {transactions?.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <span style={{
                          width: 32, height: 32,
                          borderRadius: 8,
                          background: (tx.category?.color ?? '#9CA3AF') + '22',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.9rem', flexShrink: 0,
                        }}>
                          {tx.category?.icon ?? '📌'}
                        </span>
                        <div>
                          <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--purple-deep)' }}>{tx.description}</p>
                          {tx.is_recurrent && (
                            <span style={{ fontSize: '0.62rem', background: 'var(--yellow-light)', color: 'var(--yellow-dark)', padding: '0.1rem 0.375rem', borderRadius: 99, fontWeight: 600 }}>
                              Recorrente
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="col-sm" style={{ color: 'var(--purple-light)', fontSize: '0.8rem' }}>
                      {tx.category?.name ?? '—'}
                    </td>
                    <td style={{ color: 'var(--purple-light)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {formatDate(tx.date)}
                    </td>
                    <td className="col-md" style={{ color: 'var(--purple-light)', fontSize: '0.8rem' }}>
                      {tx.payment_method ?? '—'}
                    </td>
                    {!userFilter && users && users.length > 1 && (
                      <td className="col-sm">
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 600,
                          background: 'var(--purple-pale, #f3f0ff)',
                          color: 'var(--purple-dark)',
                          padding: '0.15rem 0.5rem',
                          borderRadius: 99,
                          whiteSpace: 'nowrap',
                        }}>
                          {users.find(u => u.id === tx.user_id)?.name?.split(' ')[0] ?? '—'}
                        </span>
                      </td>
                    )}
                    <td style={{ textAlign: 'right' }}>
                      <span className={tx.type === 'income' ? 'amount-income' : 'amount-expense'} style={{ fontSize: '0.875rem' }}>
                        {tx.type === 'income' ? '+' : '-'}{formatBRL(tx.amount)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => openEdit(tx)} className="btn btn-ghost btn-icon" title="Editar">
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => { if (confirm('Excluir esta transação?')) deleteMutation.mutate(tx.id) }}
                          className="btn btn-danger btn-icon" title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent title={editTx ? 'Editar Transação' : 'Nova Transação'}>
          <TransactionForm key={editTx?.id ?? 'new'} transaction={editTx} onSuccess={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <button onClick={openNew} className="fab hide-on-lg" title="Nova transação">
        <Plus size={22} />
      </button>
    </div>
  )
}
