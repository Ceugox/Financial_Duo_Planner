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
    name: goal?.name ?? '',
    target_amount: goal?.target_amount ?? 0,
    saved_amount: goal?.saved_amount ?? 0,
    monthly_contribution: goal?.monthly_contribution ?? 0,
    saved_amount_source: goal?.saved_amount_source ?? 'manual',
    priority: goal?.priority ?? 'media',
    target_date: goal?.target_date ?? null,
    category: goal?.category ?? null,
    image_url: goal?.image_url ?? null,
    notes: goal?.notes ?? null,
  })
  const mutation = useMutation({
    mutationFn: goal ? (data: GoalCreate) => goalsApi.update(goal.id, data) : goalsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      qc.invalidateQueries({ queryKey: ['plan'] })
      onSuccess()
    },
  })
  const field = (key: keyof GoalCreate, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }))
  return <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    <label className="label" htmlFor="goal-name">Nome do objetivo *</label>
    <input id="goal-name" className="input-field" type="text" required value={form.name} onChange={(e) => field('name', e.target.value)} placeholder="Ex: entrada do imóvel" />
    <div className="xl-cols-2">
      <div><label className="label" htmlFor="goal-target">Valor desejado (R$) *</label><input id="goal-target" className="input-field" type="number" required min="0.01" step="0.01" value={form.target_amount || ''} onChange={(e) => field('target_amount', Number(e.target.value))} /></div>
      <div><label className="label" htmlFor="goal-saved">Já reservado (R$)</label><input id="goal-saved" className="input-field" type="number" min="0" step="0.01" value={form.saved_amount || ''} onChange={(e) => field('saved_amount', Number(e.target.value))} /></div>
    </div>
    <label className="label" htmlFor="goal-saved-source">Origem do valor reservado</label>
    <select id="goal-saved-source" className="input-field" value={form.saved_amount_source ?? 'manual'} onChange={(e) => field('saved_amount_source', e.target.value)}>
      <option value="manual">Informado por mim</option>
      <option value="linked">Vinculado a dados (saldo/carteira)</option>
    </select>
    <p style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>O valor reservado é informado por você e não é vinculado automaticamente a um saldo bancário.</p>
    <label className="label" htmlFor="goal-contribution">Aporte mensal planejado (R$)</label>
    <input id="goal-contribution" className="input-field" type="number" min="0" step="0.01" value={form.monthly_contribution || ''} onChange={(e) => field('monthly_contribution', Number(e.target.value))} />
    <div className="xl-cols-2">
      <div><label className="label" htmlFor="goal-priority">Prioridade</label><select id="goal-priority" className="input-field" value={form.priority ?? 'media'} onChange={(e) => field('priority', e.target.value)}><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option></select></div>
      <div><label className="label" htmlFor="goal-date">Prazo</label><input id="goal-date" className="input-field" type="date" value={form.target_date ?? ''} onChange={(e) => field('target_date', e.target.value || null)} /></div>
    </div>
    <label className="label" htmlFor="goal-category">Categoria</label>
    <input id="goal-category" className="input-field" type="text" value={form.category ?? ''} onChange={(e) => field('category', e.target.value || null)} />
    <label className="label" htmlFor="goal-notes">Observações</label>
    <textarea id="goal-notes" className="input-field" rows={2} value={form.notes ?? ''} onChange={(e) => field('notes', e.target.value || null)} />
    {mutation.isError && <p role="alert" style={{ color: 'var(--coral)' }}>Erro ao salvar o objetivo. Confira os valores e tente novamente.</p>}
    <button type="submit" disabled={mutation.isPending} className="btn btn-primary">{mutation.isPending ? 'Salvando...' : goal ? 'Atualizar objetivo' : 'Criar objetivo'}</button>
  </form>
}
