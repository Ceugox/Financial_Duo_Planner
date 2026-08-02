import { useEffect, useState } from 'react'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { ArrowLeftRight, Repeat } from 'lucide-react'
import { transactionsApi, type TransactionCreate, type Transaction } from '@/api/transactions'
import { categoriesApi } from '@/api/categories'

interface Props {
  transaction?: Transaction
  onSuccess: () => void
}

const PAYMENT_METHODS = ['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Boleto']

function getErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return 'Erro ao salvar. Tente novamente.'
  }

  const detail = error.response?.data?.detail
  if (typeof detail === 'string') return detail

  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((item) => item?.msg)
      .filter(Boolean)
      .join(' ')
  }

  if (error.response?.status === 404) {
    return 'Lançamento não encontrado. Atualize a lista e tente novamente.'
  }

  return 'Erro ao salvar. Tente novamente.'
}

function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildInitialForm(transaction: Transaction | undefined, today: string): TransactionCreate {
  return {
    type: transaction?.type ?? 'expense',
    amount: transaction?.amount ?? 0,
    description: transaction?.description ?? '',
    category_id: transaction?.category_id ?? null,
    payment_method: transaction?.payment_method ?? null,
    date: transaction?.date ?? today,
    is_recurrent: transaction?.is_recurrent ?? false,
    recurrence_day: transaction?.recurrence_day ?? null,
    notes: transaction?.notes ?? null,
    is_shared: transaction?.is_shared ?? true,
    is_transfer: transaction?.is_transfer ?? false,
  }
}

/** Janela de cadastro redesenhada: valor em destaque, categoria em grade de
 *  chips (padrão dos apps de finanças), atalhos de data e pagamento em chips. */
export function TransactionForm({ transaction, onSuccess }: Props) {
  const qc = useQueryClient()
  // Data local (não UTC): toISOString() à noite no Brasil cai no dia seguinte
  const now = new Date()
  const today = localISO(now)
  const yesterday = localISO(new Date(now.getTime() - 24 * 60 * 60 * 1000))

  const [form, setForm] = useState<TransactionCreate>(() => buildInitialForm(transaction, today))

  useEffect(() => {
    setForm(buildInitialForm(transaction, today))
  }, [transaction, today])

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })
  const filteredCategories = categories?.filter((c) => c.type === form.type || c.type === 'both') ?? []

  const mutation = useMutation({
    mutationFn: transaction
      ? (data: TransactionCreate) => transactionsApi.update(transaction.id, data)
      : transactionsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['pot'] })
      qc.invalidateQueries({ queryKey: ['insights'] })
      onSuccess()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      ...form,
      recurrence_day: form.is_recurrent ? form.recurrence_day ?? null : null,
    })
  }

  const field = (key: keyof TransactionCreate, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const setType = (type: TransactionCreate['type']) =>
    setForm((prev) => ({ ...prev, type, category_id: null }))

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.4rem 0.75rem',
    borderRadius: 99,
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: `1px solid ${active ? 'var(--teal)' : 'var(--border)'}`,
    background: active ? 'var(--teal-light)' : 'white',
    color: active ? 'var(--teal-dark)' : 'var(--text-2)',
    whiteSpace: 'nowrap',
  })

  return (
    <form onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}
    >
      {/* Type toggle */}
      <div className="type-toggle">
        <button
          type="button"
          onClick={() => setType('expense')}
          className={form.type === 'expense' ? 'active-expense' : ''}
        >
          Despesa
        </button>
        <button
          type="button"
          onClick={() => setType('income')}
          className={form.type === 'income' ? 'active-income' : ''}
        >
          Receita
        </button>
      </div>

      {/* Valor em destaque */}
      <div style={{ textAlign: 'center', padding: '0.25rem 0' }}>
        <label className="label" style={{ display: 'block', marginBottom: '0.25rem' }}>Valor *</label>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.375rem' }}>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-3)' }}>R$</span>
          <input
            type="number" required min="0.01" step="0.01" autoFocus={!transaction}
            value={form.amount === 0 ? '' : form.amount}
            onChange={(e) => field('amount', e.target.valueAsNumber || 0)}
            placeholder="0,00"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2rem', fontWeight: 700, width: '11ch', maxWidth: '100%',
              border: 'none', borderBottom: '2px solid var(--border)', outline: 'none',
              textAlign: 'center', background: 'transparent',
              color: form.type === 'expense' ? 'var(--coral)' : 'var(--sage-dark)',
            }}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="label">Descrição *</label>
        <input
          type="text" required
          value={form.description}
          onChange={(e) => field('description', e.target.value)}
          placeholder={form.type === 'expense' ? 'Ex: Mercado, Uber, Condomínio...' : 'Ex: Salário, Pensão...'}
          className="input-field"
        />
      </div>

      {/* Data com atalhos */}
      <div>
        <label className="label">Data *</label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => field('date', today)} style={chipStyle(form.date === today)}>Hoje</button>
          <button type="button" onClick={() => field('date', yesterday)} style={chipStyle(form.date === yesterday)}>Ontem</button>
          <input
            type="date" required
            value={form.date}
            onChange={(e) => field('date', e.target.value)}
            className="input-field"
            style={{ flex: 1, minWidth: 140 }}
          />
        </div>
      </div>

      {/* Categoria em grade */}
      <div>
        <label className="label">Categoria</label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
          gap: '0.5rem',
          maxHeight: 216,
          overflowY: 'auto',
          paddingRight: '0.25rem',
        }}>
          {filteredCategories.map((c) => {
            const active = form.category_id === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => field('category_id', active ? null : c.id)}
                title={c.name}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
                  padding: '0.55rem 0.375rem',
                  borderRadius: 'var(--radius-sm)',
                  border: `1.5px solid ${active ? (c.color || 'var(--teal)') : 'var(--border)'}`,
                  background: active ? (c.color || '#14b8a6') + '1c' : 'white',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{c.icon}</span>
                <span style={{
                  fontSize: '0.66rem', fontWeight: 600,
                  color: active ? 'var(--purple-deep)' : 'var(--text-2)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
                }}>
                  {c.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Pagamento em chips (só despesa) */}
      {form.type === 'expense' && (
        <div>
          <label className="label">Pagamento</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => field('payment_method', form.payment_method === m ? null : m)}
                style={chipStyle(form.payment_method === m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.is_transfer ?? false}
            onChange={(e) => field('is_transfer', e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--teal)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--purple-dark)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <ArrowLeftRight size={13} /> Transferência entre contas
            <span style={{ fontSize: '0.7rem', color: 'var(--purple-light)', fontWeight: 400 }}>
              (fica fora dos gastos e receitas)
            </span>
          </span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.is_recurrent}
            onChange={(e) => field('is_recurrent', e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--teal)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--purple-dark)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Repeat size={13} /> Repete todo mês
          </span>
        </label>
      </div>

      {form.is_recurrent && (
        <div>
          <label className="label">Dia da recorrência</label>
          <input
            type="number"
            min="1"
            max="31"
            value={form.recurrence_day ?? ''}
            onChange={(e) => field('recurrence_day', e.target.value ? Number(e.target.value) : null)}
            placeholder="Usa o dia da data se ficar vazio"
            className="input-field"
          />
        </div>
      )}

      {/* Notas */}
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

      {mutation.isError && (
        <p style={{ fontSize: '0.85rem', color: 'var(--coral)', padding: '0.625rem 0.875rem', background: 'var(--coral-light)', borderRadius: 'var(--radius-sm)' }}>
          {getErrorMessage(mutation.error)}
        </p>
      )}

      <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
        {mutation.isPending ? 'Salvando...' : transaction ? 'Atualizar transação' : 'Adicionar transação'}
      </button>
    </form>
  )
}
