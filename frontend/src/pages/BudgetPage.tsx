import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Repeat, Trash2, TrendingUp, Wallet } from 'lucide-react'
import { budgetsApi, type BudgetStatusItem } from '@/api/budgets'
import { insightsApi } from '@/api/insights'
import { categoriesApi } from '@/api/categories'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { MonthPicker } from '@/components/ui/MonthPicker'
import { RecurringBanner } from '@/components/transactions/RecurringBanner'
import { formatBRL, formatDate, currentMonthYear } from '@/lib/formatters'

const CADENCE_LABEL: Record<string, string> = {
  weekly: 'semanal',
  monthly: 'mensal',
  yearly: 'anual',
}

/** Ritmo (padrão Copilot): cor pelo pace projetado, não só pelo estouro. */
function paceColor(item: BudgetStatusItem, monthProgress: number): string {
  if (item.pct >= 100) return 'var(--coral)'
  if (monthProgress > 0 && item.pct / 100 > monthProgress) return 'var(--yellow-dark)'
  return 'var(--sage-dark)'
}

function paceBarBg(item: BudgetStatusItem, monthProgress: number): string {
  if (item.pct >= 100) return 'var(--coral)'
  if (monthProgress > 0 && item.pct / 100 > monthProgress) return 'var(--cream-deeper)'
  return 'var(--sage)'
}

function BudgetBar({ item, monthProgress }: { item: BudgetStatusItem; monthProgress: number }) {
  return (
    <div style={{ position: 'relative' }}>
      <div className="progress-track" style={{ height: 10 }}>
        <div
          style={{
            height: '100%',
            width: `${Math.min(item.pct, 100)}%`,
            background: paceBarBg(item, monthProgress),
            borderRadius: 99,
            transition: 'width 0.4s ease-out',
          }}
        />
      </div>
      {/* Marcador "onde o mês está hoje" */}
      {monthProgress > 0 && monthProgress < 1 && (
        <span
          title="Ponto do mês hoje"
          style={{
            position: 'absolute',
            left: `${monthProgress * 100}%`,
            top: -2,
            width: 2,
            height: 14,
            background: 'var(--purple-dark)',
            borderRadius: 2,
            opacity: 0.55,
          }}
        />
      )}
    </div>
  )
}

export function BudgetPage() {
  const qc = useQueryClient()
  const { month: nowMonth, year: nowYear } = currentMonthYear()
  const [month, setMonth] = useState(nowMonth)
  const [year, setYear] = useState(nowYear)
  const [editing, setEditing] = useState<{ categoryId: number; name: string; icon: string; amount: number | null } | null>(null)
  const [amountInput, setAmountInput] = useState('')

  const isCurrentMonth = month === nowMonth && year === nowYear
  const now = new Date()
  const daysInMonth = new Date(year, month, 0).getDate()
  const monthProgress = isCurrentMonth ? now.getDate() / daysInMonth : 1

  const { data: status, isLoading } = useQuery({
    queryKey: ['budgets', 'status', month, year],
    queryFn: () => budgetsApi.status(month, year),
  })
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })
  const { data: subscriptions } = useQuery({
    queryKey: ['insights', 'subscriptions'],
    queryFn: insightsApi.subscriptions,
  })

  const upsert = useMutation({
    mutationFn: ({ categoryId, amount }: { categoryId: number; amount: number }) =>
      budgetsApi.upsert(categoryId, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] })
      qc.invalidateQueries({ queryKey: ['insights'] })
      setEditing(null)
    },
  })
  const remove = useMutation({
    mutationFn: budgetsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] })
      qc.invalidateQueries({ queryKey: ['insights'] })
      setEditing(null)
    },
  })

  const budgetedIds = new Set(status?.items.map((i) => i.category_id) ?? [])
  const unbudgetedCategories = (categories ?? []).filter(
    (c) => c.type !== 'income' && !budgetedIds.has(c.id),
  )

  const openEditor = (categoryId: number, name: string, icon: string, amount: number | null) => {
    setEditing({ categoryId, name, icon, amount })
    setAmountInput(amount != null ? String(amount) : '')
  }

  const totalRemaining = (status?.total_budget ?? 0) - (status?.total_spent ?? 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ fontSize: '1.25rem' }}>Orçamento do casal</h2>
        <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
      </div>

      {isCurrentMonth && <RecurringBanner month={month} year={year} />}

      {/* Totais */}
      {status && status.items.length > 0 && (
        <div className="summary-grid-3">
          {[
            { label: 'Orçado no mês', value: status.total_budget, color: 'var(--purple-dark)' },
            { label: 'Gasto no orçado', value: status.total_spent, color: 'var(--coral)' },
            { label: 'Disponível', value: totalRemaining, color: totalRemaining >= 0 ? 'var(--sage-dark)' : 'var(--coral)' },
          ].map((s) => (
            <div key={s.label} className="metric-card" style={{ textAlign: 'center' }}>
              <p className="metric-label">{s.label}</p>
              <p className="metric-value" style={{ color: s.color }}>{formatBRL(s.value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Limites por categoria */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wallet size={16} color="var(--teal-dark)" /> Limites por categoria
          </h3>
          {isCurrentMonth && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
              o traço roxo marca o ponto do mês hoje
            </span>
          )}
        </div>

        {isLoading ? (
          <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 56 }} />)}
          </div>
        ) : (status?.items.length ?? 0) === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Wallet size={26} color="var(--purple-light)" /></div>
            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--purple-dark)', marginBottom: '0.25rem' }}>
              Nenhum limite definido
            </p>
            <p style={{ fontSize: '0.78rem', maxWidth: 320 }}>
              Defina quanto o casal quer gastar por categoria e acompanhe o ritmo ao longo do mês.
            </p>
          </div>
        ) : (
          <div style={{ padding: '0.75rem 1.5rem 1rem', display: 'flex', flexDirection: 'column' }}>
            {status!.items.map((item) => (
              <div key={item.category_id} style={{ padding: '0.75rem 0', borderBottom: '1px solid rgba(121,108,134,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.45rem' }}>
                  <span style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: item.category_color + '22',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem',
                  }}>
                    {item.category_icon}
                  </span>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-1)', flex: 1, minWidth: 0 }}>
                    {item.category_name}
                  </p>
                  <p style={{ fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 700, color: paceColor(item, monthProgress) }}>{formatBRL(item.spent)}</span>
                    <span style={{ color: 'var(--text-3)' }}> / {formatBRL(item.budget)}</span>
                  </p>
                  <button
                    onClick={() => openEditor(item.category_id, item.category_name, item.category_icon, item.budget)}
                    className="btn btn-ghost btn-icon" title="Editar limite"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
                <BudgetBar item={item} monthProgress={monthProgress} />
                <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.3rem' }}>
                  {item.pct >= 100
                    ? `Estourou em ${formatBRL(item.spent - item.budget)}`
                    : item.pct / 100 > monthProgress && isCurrentMonth
                      ? `Acima do ritmo — nesse passo estoura antes do fim do mês`
                      : `Restam ${formatBRL(item.remaining)} (${item.pct.toFixed(0)}% usado)`}
                </p>
              </div>
            ))}

            {status!.unbudgeted_spent > 0 && (
              <p style={{ fontSize: '0.74rem', color: 'var(--text-3)', paddingTop: '0.75rem' }}>
                Fora do orçamento: {formatBRL(status!.unbudgeted_spent)} em categorias sem limite definido.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Categorias sem limite */}
      {unbudgetedCategories.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Adicionar limite</h3>
          </div>
          <div style={{ padding: '1rem 1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {unbudgetedCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => openEditor(c.id, c.name, c.icon, null)}
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.45rem 0.875rem', minHeight: 'auto' }}
              >
                <Plus size={13} /> {c.icon} {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Assinaturas e contas recorrentes detectadas */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Repeat size={16} color="var(--teal-dark)" /> Assinaturas &amp; recorrências detectadas
          </h3>
          {subscriptions && subscriptions.active_count > 0 && (
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--purple-dark)' }}>
              {formatBRL(subscriptions.total_monthly)}/mês
            </span>
          )}
        </div>

        {!subscriptions || subscriptions.items.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem 1rem' }}>
            <p style={{ fontSize: '0.8rem', maxWidth: 360 }}>
              Nada detectado ainda. Com pelo menos 3 cobranças do mesmo lugar em cadência regular
              (importadas por OFX/Pluggy ou lançadas à mão), elas aparecem aqui automaticamente.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th className="col-sm">Cadência</th>
                  <th className="col-md">Última cobrança</th>
                  <th style={{ textAlign: 'right' }}>Valor</th>
                  <th className="col-sm" style={{ textAlign: 'right' }}>Custo mensal</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.items.map((sub) => (
                  <tr key={`${sub.description}-${sub.cadence}`} style={{ opacity: sub.active ? 1 : 0.55 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                          {sub.category_icon ? `${sub.category_icon} ` : ''}{sub.description}
                        </span>
                        {sub.price_increased && (
                          <span className="badge" style={{ background: 'var(--coral-light)', color: 'var(--coral)', gap: '0.2rem' }}>
                            <TrendingUp size={11} /> +{formatBRL(sub.price_change)}
                          </span>
                        )}
                        {!sub.active && (
                          <span className="badge" style={{ background: 'var(--purple-muted)', color: 'var(--purple-dark)' }}>
                            inativa
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="col-sm" style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
                      {CADENCE_LABEL[sub.cadence] ?? sub.cadence}
                      {sub.cadence === 'monthly' ? ` · dia ${sub.expected_day}` : ''}
                    </td>
                    <td className="col-md" style={{ fontSize: '0.8rem', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                      {formatDate(sub.last_date)}
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: '0.85rem', fontWeight: 600 }}>
                      {formatBRL(sub.last_amount)}
                    </td>
                    <td className="col-sm" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: '0.8rem', color: 'var(--text-2)' }}>
                      {formatBRL(sub.monthly_cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Editor de limite */}
      <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open) setEditing(null) }}>
        <DialogContent title={editing ? `Limite — ${editing.icon} ${editing.name}` : 'Limite'}>
          {editing && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const value = Number(amountInput.replace(',', '.'))
                if (Number.isFinite(value) && value > 0) {
                  upsert.mutate({ categoryId: editing.categoryId, amount: value })
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div>
                <label className="label" htmlFor="budget-amount">Limite mensal (R$)</label>
                <input
                  id="budget-amount"
                  className="input-field"
                  inputMode="decimal"
                  autoFocus
                  placeholder="Ex.: 1200"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
                {editing.amount != null && (
                  <button
                    type="button"
                    onClick={() => remove.mutate(editing.categoryId)}
                    disabled={remove.isPending}
                    className="btn btn-danger"
                  >
                    <Trash2 size={14} /> Remover
                  </button>
                )}
                <button type="submit" disabled={upsert.isPending} className="btn btn-primary">
                  {upsert.isPending ? 'Salvando…' : 'Salvar limite'}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
