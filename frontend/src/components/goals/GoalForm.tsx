import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { goalsApi, type GoalCreate, type PurchaseGoal } from '@/api/goals'

interface Props {
  goal?: PurchaseGoal
  onSuccess: () => void
}

export function GoalForm({ goal, onSuccess }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState<GoalCreate>({
    name:          goal?.name ?? '',
    target_amount: goal?.target_amount ?? 0,
    saved_amount:  goal?.saved_amount ?? 0,
    priority:      goal?.priority ?? 'media',
    target_date:   goal?.target_date ?? null,
    category:      goal?.category ?? null,
    image_url:     goal?.image_url ?? null,
    notes:         goal?.notes ?? null,
  })

  const mutation = useMutation({
    mutationFn: goal
      ? (data: GoalCreate) => goalsApi.update(goal.id, data)
      : goalsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      onSuccess()
    },
  })

  const field = (key: keyof GoalCreate, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      <div>
        <label className="label">Nome do Objetivo *</label>
        <input type="text" required
          value={form.name} onChange={(e) => field('name', e.target.value)}
          placeholder="Ex: iPhone, Viagem para Europa..."
          className="input-field"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
        <div>
          <label className="label">Valor da Meta (R$) *</label>
          <input type="number" required min="0.01" step="0.01"
            value={form.target_amount || ''}
            onChange={(e) => field('target_amount', parseFloat(e.target.value) || 0)}
            className="input-field"
          />
        </div>
        <div>
          <label className="label">Já Guardado (R$)</label>
          <input type="number" min="0" step="0.01"
            value={form.saved_amount || ''}
            onChange={(e) => field('saved_amount', parseFloat(e.target.value) || 0)}
            className="input-field"
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
        <div>
          <label className="label">Prioridade</label>
          <select value={form.priority ?? 'media'} onChange={(e) => field('priority', e.target.value)} className="input-field">
            <option value="alta">🔴 Alta</option>
            <option value="media">🟡 Média</option>
            <option value="baixa">🟢 Baixa</option>
          </select>
        </div>
        <div>
          <label className="label">Prazo</label>
          <input type="date"
            value={form.target_date ?? ''}
            onChange={(e) => field('target_date', e.target.value || null)}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="label">Categoria</label>
        <input type="text"
          value={form.category ?? ''}
          onChange={(e) => field('category', e.target.value || null)}
          placeholder="Tecnologia, Viagem, Carro..."
          className="input-field"
        />
      </div>

      <div>
        <label className="label">Observações</label>
        <textarea
          value={form.notes ?? ''} onChange={(e) => field('notes', e.target.value || null)}
          rows={2} className="input-field" style={{ resize: 'none' }}
        />
      </div>

      {mutation.isError && (
        <p style={{ fontSize: '0.85rem', color: 'var(--coral)', padding: '0.625rem 0.875rem', background: 'var(--coral-light)', borderRadius: 'var(--radius-sm)' }}>
          Erro ao salvar. Tente novamente.
        </p>
      )}

      <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
        {mutation.isPending ? 'Salvando...' : goal ? 'Atualizar objetivo' : 'Criar objetivo'}
      </button>
    </form>
  )
}
