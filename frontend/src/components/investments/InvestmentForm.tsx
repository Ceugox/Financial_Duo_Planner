import { useState } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { investmentsApi, type InvestmentCreate, type Investment } from '@/api/investments'

interface Props {
  investment?: Investment
  onSuccess: () => void
}

const ASSET_TYPES = [
  { value: 'acoes',      label: '📈 Ações' },
  { value: 'fiis',       label: '🏢 FIIs' },
  { value: 'renda_fixa', label: '🏦 Renda Fixa' },
  { value: 'crypto',     label: '₿ Crypto' },
  { value: 'poupanca',   label: '💰 Poupança' },
  { value: 'fundos',     label: '📊 Fundos' },
  { value: 'outros',     label: '📌 Outros' },
]

export function InvestmentForm({ investment, onSuccess }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState<InvestmentCreate>({
    name:            investment?.name ?? '',
    asset_type:      investment?.asset_type ?? 'renda_fixa',
    amount_invested: investment?.amount_invested ?? 0,
    current_value:   investment?.current_value ?? 0,
    quantity:        investment?.quantity ?? null,
    purchase_date:   investment?.purchase_date ?? null,
    broker:          investment?.broker ?? null,
    notes:           investment?.notes ?? null,
  })

  const mutation = useMutation({
    mutationFn: investment
      ? (data: InvestmentCreate) => investmentsApi.update(investment.id, data)
      : investmentsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onSuccess()
    },
  })

  const field = (key: keyof InvestmentCreate, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      <div>
        <label className="label">Nome *</label>
        <input type="text" required value={form.name}
          onChange={(e) => field('name', e.target.value)}
          placeholder="Ex: Tesouro Selic 2029, PETR4..."
          className="input-field"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
        <div>
          <label className="label">Tipo de Ativo *</label>
          <select value={form.asset_type} onChange={(e) => field('asset_type', e.target.value)} className="input-field">
            {ASSET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Corretora</label>
          <input type="text" value={form.broker ?? ''}
            onChange={(e) => field('broker', e.target.value || null)}
            placeholder="XP, Nu Invest..."
            className="input-field"
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
        <div>
          <label className="label">Valor Investido (R$) *</label>
          <input type="number" required min="0" step="0.01"
            value={form.amount_invested || ''}
            onChange={(e) => field('amount_invested', parseFloat(e.target.value) || 0)}
            className="input-field"
          />
        </div>
        <div>
          <label className="label">Valor Atual (R$) *</label>
          <input type="number" required min="0" step="0.01"
            value={form.current_value || ''}
            onChange={(e) => field('current_value', parseFloat(e.target.value) || 0)}
            className="input-field"
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
        <div>
          <label className="label">Quantidade</label>
          <input type="number" step="0.000001"
            value={form.quantity ?? ''}
            onChange={(e) => field('quantity', e.target.value ? parseFloat(e.target.value) : null)}
            className="input-field"
          />
        </div>
        <div>
          <label className="label">Data de Compra</label>
          <input type="date"
            value={form.purchase_date ?? ''}
            onChange={(e) => field('purchase_date', e.target.value || null)}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="label">Observações</label>
        <textarea value={form.notes ?? ''} onChange={(e) => field('notes', e.target.value || null)}
          rows={2} className="input-field" style={{ resize: 'none' }} />
      </div>

      {mutation.isError && (
        <p style={{ fontSize: '0.85rem', color: 'var(--coral)', padding: '0.625rem 0.875rem', background: 'var(--coral-light)', borderRadius: 'var(--radius-sm)' }}>
          Erro ao salvar. Tente novamente.
        </p>
      )}

      <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
        {mutation.isPending ? 'Salvando...' : investment ? 'Atualizar investimento' : 'Adicionar investimento'}
      </button>
    </form>
  )
}
