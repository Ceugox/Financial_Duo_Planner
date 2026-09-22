import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { planApi, type PlanEvent, type PlanEventInput, type PlanSettings } from '@/api/plan'
import { formatBRL, formatDate } from '@/lib/formatters'

const initialEvent: PlanEventInput = { name: '', date: '', end_date: null, kind: 'income', amount: 0, recurrence: 'monthly', notes: null }
const labels = { conservative: 'Conservador', base: 'Base', optimistic: 'Otimista' }
const statusLabels = { on_track: 'No caminho', at_risk: 'Precisa de ajuste', overdue: 'Prazo vencido', insufficient_data: 'Dados insuficientes', completed: 'Concluído' }

export function PlanPage() {
  const qc = useQueryClient()
  const [horizon, setHorizon] = useState<5 | 10>(5)
  const [draft, setDraft] = useState<PlanSettings | null>(null)
  const [event, setEvent] = useState<PlanEventInput>(initialEvent)
  const [editingEventId, setEditingEventId] = useState<number | null>(null)
  const projection = useQuery({ queryKey: ['plan', 'projection'], queryFn: planApi.projection })
  const settings = useQuery({ queryKey: ['plan', 'settings'], queryFn: planApi.settings })
  const events = useQuery({ queryKey: ['plan', 'events'], queryFn: planApi.events })
  const insights = useQuery({ queryKey: ['plan', 'insights'], queryFn: planApi.insights })
  const refresh = () => qc.invalidateQueries({ queryKey: ['plan'] })
  const saveSettings = useMutation({ mutationFn: planApi.updateSettings, onSuccess: () => { setDraft(null); refresh() } })
  const saveEvent = useMutation({
    mutationFn: (value: PlanEventInput) => editingEventId === null ? planApi.createEvent(value) : planApi.updateEvent(editingEventId, value),
    onSuccess: () => { setEvent(initialEvent); setEditingEventId(null); refresh() },
  })
  const deleteEvent = useMutation({ mutationFn: planApi.deleteEvent, onSuccess: refresh })
  const selectedSettings = draft ?? settings.data
  const data = projection.data
  const activeGoals = data?.goals.filter((goal) => goal.status !== 'completed') ?? []
  const horizonGoals = activeGoals.filter((goal) => {
    if (!goal.target_date) return true
    return new Date(goal.target_date).getTime() <= new Date(data!.as_of).setFullYear(new Date(data!.as_of).getFullYear() + horizon)
  })
  const points = (data?.monthly ?? []).slice(0, horizon * 12).filter((_, i) => (i + 1) % 12 === 0).map((point, i) => ({ ...point, year: `Ano ${i + 1}` }))
  const editEvent = (item: PlanEvent) => {
    setEditingEventId(item.id)
    setEvent({ name: item.name, date: item.date, end_date: item.end_date, kind: item.kind, amount: item.amount, recurrence: item.recurrence, notes: item.notes })
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'start' }}>
      <div><h2 style={{ fontSize: '1.35rem' }}>Meu plano financeiro</h2><p style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Metas, aportes e decisões para os próximos anos.</p></div>
      <div className="type-toggle" role="group" aria-label="Horizonte do plano">
        {[5, 10].map((years) => <button key={years} type="button" aria-pressed={horizon === years} className={horizon === years ? 'active-income' : ''} onClick={() => setHorizon(years as 5 | 10)}>{years} anos</button>)}
      </div>
    </header>

    {projection.isLoading && <div role="status" className="card card-body">Carregando plano...</div>}
    {projection.isError && <div role="alert" className="card card-body"><p>Não foi possível carregar o plano.</p><button className="btn btn-secondary" onClick={() => projection.refetch()}>Tentar novamente</button></div>}
    {data && <>
      {data.goals.length === 0 && <section className="card card-body"><h3>Comece por uma meta</h3><p>Cadastre o valor desejado, o prazo e um aporte mensal para montar seu plano.</p><Link to="/objetivos" className="btn btn-primary" style={{ marginTop: '1rem' }}>Criar meta</Link></section>}
      {data.warnings.length > 0 && <section className="card card-body" aria-label="Limitações do plano"><h3>O que falta conferir</h3><ul style={{ paddingLeft: '1.25rem' }}>{data.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></section>}
      <section className="summary-grid-3">
        <article className="metric-card"><p className="metric-label">Capacidade mensal observada</p><p className="metric-value">{data.evidence.monthly_capacity === null ? 'Sem histórico suficiente' : formatBRL(data.evidence.monthly_capacity)}</p><p style={{ fontSize: '0.75rem' }}>{data.evidence.closed_months} meses fechados · lançamentos registrados</p></article>
        <article className="metric-card"><p className="metric-label">Aportes planejados</p><p className="metric-value">{formatBRL(data.allocation.requested_monthly)}</p><p style={{ fontSize: '0.75rem' }}>Valores informados por meta</p></article>
        <article className="metric-card"><p className="metric-label">Diferença mensal</p><p className="metric-value">{data.allocation.shortfall_monthly === null ? 'A verificar' : formatBRL(data.allocation.shortfall_monthly)}</p><p style={{ fontSize: '0.75rem' }}>Aportes acima da capacidade observada</p></article>
      </section>
      <p style={{ color: 'var(--text-3)', fontSize: '0.78rem' }}>Base observada: {data.evidence.period_start && data.evidence.period_end ? `${formatDate(data.evidence.period_start)} a ${formatDate(data.evidence.period_end)}` : 'período ainda indisponível'}. Projeções usam premissas editáveis e não representam rendimento garantido.</p>
      <section className="card">
        <div className="card-header"><h3 className="card-title">Metas em até {horizon} anos</h3><Link to="/objetivos">Editar metas e aportes</Link></div>
        <div className="card-body" style={{ display: 'grid', gap: '0.9rem' }}>
          {horizonGoals.length === 0 && <p>Nenhuma meta neste horizonte. Metas sem prazo aparecem aqui até receberem uma data.</p>}
          {horizonGoals.map((goal) => <article key={goal.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}><h4>{goal.name}</h4><strong>{statusLabels[goal.status]}</strong></div>
            <p style={{ fontSize: '0.82rem' }}>Meta {formatBRL(goal.target_amount)}{goal.target_date ? ` até ${formatDate(goal.target_date)}` : ' · sem prazo definido'} · aporte informado {formatBRL(goal.monthly_contribution)}/mês</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>Já reservado ({goal.saved_amount_source === 'linked' ? 'vinculado' : 'informado'}): {formatBRL(goal.saved_amount)}. Projeção: {goal.projected_amount === null ? 'dados insuficientes' : formatBRL(goal.projected_amount)}{goal.projected_amount_real === null ? '' : ` · em valores de hoje ${formatBRL(goal.projected_amount_real)}`}{goal.gap === null ? '' : ` · diferença estimada ${formatBRL(goal.gap)}`}.</p>
          </article>)}
        </div>
      </section>
      <section className="card"><div className="card-header"><h3 className="card-title">Evolução projetada</h3></div><div className="card-body">
        <p style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>Soma estimada das metas ao fim de cada ano do plano, em valores nominais e em valores de hoje (real). Linha de projeção baseada em aportes e premissas, sem garantia.</p>
        {points.some((point) => point.goal_total !== null) ? <div role="img" aria-label="Linha com evolução anual projetada do total das metas, nominal e real" style={{ height: 240, marginTop: '0.75rem' }}><ResponsiveContainer><LineChart data={points}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="year" /><YAxis width={65} tickFormatter={(n: number) => `${Math.round(n / 1000)} mil`} /><Tooltip formatter={(value) => formatBRL(Number(value ?? 0))} /><Line dataKey="goal_total" name="Total projetado (nominal)" stroke="var(--teal-dark)" strokeWidth={2} dot /><Line dataKey="goal_total_real" name="Em valores de hoje" stroke="var(--purple-dark)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} /></LineChart></ResponsiveContainer></div> : <p>Sem dados suficientes para desenhar a evolução.</p>}
        <p style={{ fontSize: '0.78rem' }}>Ao final de {horizon} anos: {points.at(-1)?.goal_total == null ? 'projeção indisponível' : `${formatBRL(points.at(-1)!.goal_total!)} nominal · ${formatBRL(points.at(-1)!.goal_total_real ?? 0)} em valores de hoje`}.</p>
      </div></section>
      <section className="card card-body"><h3>Cenários de retorno</h3><p style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>O retorno é uma hipótese anual aplicada à projeção. Compare possibilidades, sem tratar valores como promessa.</p><div className="auto-grid-cards" style={{ marginTop: '0.75rem' }}>{data.scenarios.map((scenario) => <article key={scenario.key} style={{ padding: '0.9rem', background: 'var(--purple-muted)', borderRadius: 'var(--radius)' }}><h4>{labels[scenario.key]}</h4><p>Retorno suposto: {scenario.annual_return_rate.toFixed(1)}% ao ano</p><p>{scenario.goals.filter((goal) => goal.gap !== null && goal.gap > 0).length} metas com diferença projetada</p></article>)}</div></section>
      {insights.data && insights.data.length > 0 && <section className="card card-body"><h3>Decisões para suas metas</h3>{insights.data.map((item, i) => <article key={`${item.goal_id}-${i}`} style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}><p><strong>Fato:</strong> {item.fact}</p><p><strong>Impacto:</strong> {item.impact}</p><p><strong>Ação possível:</strong> {item.action}</p><p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Premissas: inflação {item.assumptions.inflation_rate}% · retorno {item.assumptions.annual_return_rate}% a.a. · {item.assumptions.history_months} meses de histórico. Evidência: {item.evidence_period.start ?? 'indisponível'} a {item.evidence_period.end ?? 'indisponível'}.</p></article>)}</section>}
    </>}

    <section className="card card-body"><h3>Premissas do plano</h3>
      {settings.isLoading && <p>Carregando premissas...</p>}
      {settings.isError && <p role="alert">Não foi possível carregar as premissas.</p>}
      {selectedSettings && <form onSubmit={(e) => { e.preventDefault(); saveSettings.mutate(selectedSettings) }} style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>
        <label>Inflação anual (%)<input className="input-field" type="number" step="0.1" min="0" max="100" value={selectedSettings.inflation_rate} onChange={(e) => setDraft({ ...selectedSettings, inflation_rate: Number(e.target.value) })} /></label>
        <label>Retorno anual hipotético (%)<input className="input-field" type="number" step="0.1" min="-100" max="100" value={selectedSettings.annual_return_rate} onChange={(e) => setDraft({ ...selectedSettings, annual_return_rate: Number(e.target.value) })} /></label>
        <label>Meses fechados usados como histórico<input className="input-field" type="number" min="1" max="120" step="1" value={selectedSettings.history_months} onChange={(e) => setDraft({ ...selectedSettings, history_months: Number(e.target.value) })} /></label>
        {saveSettings.isError && <p role="alert">Não foi possível salvar as premissas.</p>}<button className="btn btn-primary" disabled={saveSettings.isPending}>{saveSettings.isPending ? 'Salvando...' : 'Salvar premissas'}</button>
      </form>}
    </section>

    <section className="card card-body"><h3>Eventos futuros</h3><p style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>Registre mudanças de renda ou despesa para refletir seus planos.</p>
      {events.isLoading && <p>Carregando eventos...</p>}
      {events.isError && <p role="alert">Não foi possível carregar os eventos.</p>}
      {events.data?.map((item) => <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', padding: '0.65rem 0' }}><span>{item.name} · {formatDate(item.date)}{item.end_date ? ` até ${formatDate(item.end_date)}` : ''} · {item.kind === 'income' ? 'receita' : 'despesa'} {formatBRL(item.amount)} ({item.recurrence === 'monthly' ? 'mensal' : 'única'})</span><span><button className="btn btn-ghost" onClick={() => editEvent(item)}>Editar</button><button className="btn btn-danger" disabled={deleteEvent.isPending} onClick={() => { if (window.confirm(`Excluir ${item.name}?`)) deleteEvent.mutate(item.id) }}>Excluir</button></span></div>)}
      <form onSubmit={(e) => { e.preventDefault(); saveEvent.mutate(event) }} style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
        <h4>{editingEventId === null ? 'Adicionar evento' : 'Editar evento'}</h4>
        <label>Nome<input className="input-field" required value={event.name} onChange={(e) => setEvent({ ...event, name: e.target.value })} /></label>
        <label>Data<input className="input-field" type="date" required value={event.date} onChange={(e) => setEvent({ ...event, date: e.target.value })} /></label>
        <label>Tipo<select className="input-field" value={event.kind} onChange={(e) => setEvent({ ...event, kind: e.target.value as PlanEventInput['kind'] })}><option value="income">Receita</option><option value="expense">Despesa</option></select></label>
        <label>Valor (R$)<input className="input-field" type="number" min="0.01" step="0.01" required value={event.amount || ''} onChange={(e) => setEvent({ ...event, amount: Number(e.target.value) })} /></label>
        <label>Frequência<select className="input-field" value={event.recurrence} onChange={(e) => setEvent({ ...event, recurrence: e.target.value as PlanEventInput['recurrence'], end_date: e.target.value === 'once' ? null : event.end_date })}><option value="monthly">Mensal</option><option value="once">Única</option></select></label>
        {event.recurrence === 'monthly' && <label>Data final (opcional)<input className="input-field" type="date" min={event.date || undefined} value={event.end_date ?? ''} onChange={(e) => setEvent({ ...event, end_date: e.target.value || null })} /></label>}
        <label>Observações<input className="input-field" value={event.notes ?? ''} onChange={(e) => setEvent({ ...event, notes: e.target.value || null })} /></label>
        {saveEvent.isError && <p role="alert">Não foi possível salvar o evento.</p>}
        <div style={{ display: 'flex', gap: '0.5rem' }}><button className="btn btn-primary" disabled={saveEvent.isPending}>{saveEvent.isPending ? 'Salvando...' : 'Salvar evento'}</button>{editingEventId !== null && <button type="button" className="btn btn-secondary" onClick={() => { setEditingEventId(null); setEvent(initialEvent) }}>Cancelar edição</button>}</div>
      </form>
    </section>
  </div>
}
