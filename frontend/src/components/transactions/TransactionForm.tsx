import { useState } from 'react'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { transactionsApi, type TransactionCreate, type Transaction } from '@/api/transactions'
import { categoriesApi } from '@/api/categories'

interface Props {
  transaction?: Transaction
  onSuccess: () => void
}

const PAYMENT_METHODS = ['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Transferência', 'Boleto']

export function TransactionForm({ transaction, onSuccess }: Props) {
  const qc = useQueryClient()
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState<TransactionCreate>({
    type: transaction?.type ?? 'expense',
    amount: transaction?.amount ?? 0,
    description: transaction?.description ?? '',
    category_id: transaction?.category_id ?? null,
    payment_method: transaction?.payment_method ?? null,
    date: transaction?.date ?? today,
    is_recurrent: transaction?.is_recurrent ?? false,
    notes: transaction?.notes ?? null,
  })

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })
  const filteredCategories = categories?.filter((c) => c.type === form.type || c.type === 'both') ?? []

  const mutation = useMutation({
    mutationFn: transaction
      ? (data: TransactionCreate) => transactionsApi.update(transaction.id, data)
      : transactionsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onSuccess()
    },
  })

  const field = (key: keyof TransactionCreate, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      {/* Type toggle */}
      <div className="type-toggle">
        <button
          type="button"
          onClick={() => field('type', 'expense')}
          className={form.type === 'expense' ? 'active-expense' : ''}
        >
          Despesa
        </button>
        <button
          type="button"
          onClick={() => field('type', 'income')}
          className={form.type === 'income' ? 'active-income' : ''}
        >
          Receita
        </button>
      </div>

      {/* Description */}
      <div>
        <label className="label">Descrição *</label>
        <input
          type="text" required
          value={form.description}
          onChange={(e) => field('description', e.target.value)}
          placeholder="Ex: Supermercado, Salário..."
          className="input-field"
        />
      </div>

      {/* Amount + Date */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
        <div>
          <label className="label">Valor (R$) *</label>
          <input
            type="number" required min="0.01" step="0.01"
            value={form.amount || ''}
            onChange={(e) => field('amount', parseFloat(e.target.value) || 0)}
            className="input-field"
          />
        </div>
        <div>
          <label className="label">Data *</label>
          <input
            type="date" required
            value={form.date}
            onChange={(e) => field('date', e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      {/* Category + Payment */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
        <div>
          <label className="label">Categoria</label>
          <select
            value={form.category_id ?? ''}
            onChange={(e) => field('category_id', e.target.value ? Number(e.target.value) : null)}
            className="input-field"
          >
            <option value="">Sem categoria</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Pagamento</label>
          <select
            value={form.payment_method ?? ''}
            onChange={(e) => field('payment_method', e.target.value || null)}
            className="input-field"
          >
            <option value="">Selecionar</option>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="label">Observações</label>
        <textarea
          value={form.notes ?? ''}
          onChange={(e) => field('notes', e.target.value || null)}
          rows={2}
          className="input-field"
          style={{ resize: 'none' }}
        />
      </div>

      {/* Recurrent */}
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={form.is_recurrent}
          onChange={(e) => field('is_recurrent', e.target.checked)}
          style={{ width: 16, height: 16, accentColor: 'var(--teal)', cursor: 'pointer' }}
        />
        <span style={{ fontSize: '0.875rem', color: 'var(--purple-dark)', fontWeight: 500 }}>Transação recorrente</span>
      </label>

      {mutation.isError && (
        <p style={{ fontSize: '0.85rem', color: 'var(--coral)', padding: '0.625rem 0.875rem', background: 'var(--coral-light)', borderRadius: 'var(--radius-sm)' }}>
          Erro ao salvar. Tente novamente.
        </p>
      )}

      <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
        {mutation.isPending ? 'Salvando...' : transaction ? 'Atualizar transação' : 'Adicionar transação'}
      </button>
    </form>
  )
}
