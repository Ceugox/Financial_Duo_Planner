import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X, Inbox, AlertTriangle, CheckCheck, ArrowLeftRight } from 'lucide-react'
import { reviewApi, type ReviewItem } from '@/api/review'
import { categoriesApi } from '@/api/categories'
import { formatBRL, formatDate } from '@/lib/formatters'

const INVALIDATE_KEYS = ['transactions', 'dashboard', 'insights', 'budgets', 'review'] as const

function ReviewRow({ item, onDone }: { item: ReviewItem; onDone: () => void }) {
  const [categoryId, setCategoryId] = useState<string>(item.suggested_category ? String(item.suggested_category.id) : '')

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })

  const accept = useMutation({
    mutationFn: () => reviewApi.accept(item.id, categoryId ? Number(categoryId) : null, false),
    onSuccess: onDone,
  })
  const acceptTransfer = useMutation({
    mutationFn: () => reviewApi.accept(item.id, null, false, true),
    onSuccess: onDone,
  })
  const dismiss = useMutation({
    mutationFn: () => reviewApi.dismiss(item.id),
    onSuccess: onDone,
  })

  const busy = accept.isPending || acceptTransfer.isPending || dismiss.isPending

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
      padding: '0.75rem 0',
      borderBottom: '1px solid rgba(121,108,134,0.08)',
    }}>
      <div style={{ flex: '1 1 200px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-1)' }}>{item.description}</p>
          {item.possible_duplicate && (
            <span className="badge" style={{ background: 'var(--coral-light)', color: 'var(--coral)', gap: '0.25rem' }}>
              <AlertTriangle size={11} /> possível duplicata
            </span>
          )}
          {item.transfer_suspect && (
            <span className="badge" style={{ background: 'var(--purple-muted, #ece9f6)', color: 'var(--purple-dark)', gap: '0.25rem' }}>
              <ArrowLeftRight size={11} /> transferência?
            </span>
          )}
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
          {formatDate(item.date)} · {item.account_name ?? (item.source === 'pluggy' ? 'Open Finance' : 'OFX')}
          {item.possible_duplicate && item.duplicate_of ? ` · parecida com "${item.duplicate_of}"` : ''}
          {item.transfer_suspect && item.transfer_reason ? ` · ${item.transfer_reason}` : ''}
        </p>
      </div>

      <span
        className={item.type === 'income' ? 'amount-income' : 'amount-expense'}
        style={{ fontSize: '0.875rem', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
      >
        {item.type === 'income' ? '+' : '-'}{formatBRL(item.amount)}
      </span>

      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className="input-field"
        style={{ width: 'auto', minWidth: 130, fontSize: '0.8rem', padding: '0.45rem 0.625rem' }}
        aria-label="Categoria sugerida"
      >
        <option value="">Sem categoria</option>
        {categories?.filter((c) => c.type !== (item.type === 'expense' ? 'income' : 'expense')).map((c) => (
          <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
        ))}
      </select>

      <div style={{ display: 'flex', gap: '0.375rem' }}>
        <button
          onClick={() => accept.mutate()}
          disabled={busy}
          className="btn btn-primary btn-icon"
          title="Aceitar e lançar"
        >
          <Check size={15} />
        </button>
        <button
          onClick={() => acceptTransfer.mutate()}
          disabled={busy}
          className={item.transfer_suspect ? 'btn btn-secondary btn-icon' : 'btn btn-ghost btn-icon'}
          title="Lançar como transferência entre contas (fora dos gastos e receitas)"
        >
          <ArrowLeftRight size={15} />
        </button>
        <button
          onClick={() => dismiss.mutate()}
          disabled={busy}
          className="btn btn-ghost btn-icon"
          title="Descartar sugestão"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )
}

/** Fila de sugestões do Open Finance/OFX — nada entra nos números sem aceite. */
export function ReviewQueue() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['review'], queryFn: reviewApi.list })

  const invalidateAll = () => {
    INVALIDATE_KEYS.forEach((key) => qc.invalidateQueries({ queryKey: [key] }))
  }

  const acceptAll = useMutation({
    mutationFn: reviewApi.acceptAll,
    onSuccess: invalidateAll,
  })

  if (!data || data.summary.pending_count === 0) return null

  const { summary, items } = data
  const monthDelta = summary.month_expense_if_accepted - summary.month_expense_current

  return (
    <div className="card animate-fade-up">
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.625rem' }}>
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Inbox size={16} color="var(--teal-dark)" />
          Possíveis duplicatas
          <span className="badge" style={{ background: 'var(--teal-light)', color: 'var(--teal-dark)' }}>
            {summary.pending_count}
          </span>
        </h3>
        <button
          onClick={() => acceptAll.mutate()}
          disabled={acceptAll.isPending}
          className="btn btn-secondary"
          style={{ fontSize: '0.78rem', padding: '0.45rem 0.875rem', minHeight: 'auto' }}
        >
          <CheckCheck size={14} />
          {acceptAll.isPending ? 'Resolvendo…' : 'Resolver automaticamente'}
        </button>
      </div>

      <div style={{ padding: '0.25rem 1.5rem 1rem' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', padding: '0.625rem 0', lineHeight: 1.5 }}>
          O import lança tudo sozinho — aqui ficam só os itens que parecem repetir um lançamento
          que vocês fizeram à mão. Aceite (✓) se for um gasto diferente, marque como transferência
          (<ArrowLeftRight size={10} style={{ display: 'inline' }} />) se for movimentação entre contas
          próprias, ou descarte (✗) se já estiver lançado. "Resolver automaticamente" aplica a triagem
          padrão e deixa aqui apenas as duplicatas.
          {monthDelta > 0 && (
            <> Aceitando tudo, as despesas deste mês vão de <strong>{formatBRL(summary.month_expense_current)}</strong> para{' '}
            <strong>{formatBRL(summary.month_expense_if_accepted)}</strong>.</>
          )}
        </p>
        {items.map((item) => (
          <ReviewRow key={item.id} item={item} onDone={invalidateAll} />
        ))}
      </div>
    </div>
  )
}
