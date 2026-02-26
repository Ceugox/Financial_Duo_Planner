import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { goalsApi, type PurchaseGoal } from '@/api/goals'
import { dashboardApi } from '@/api/dashboard'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { GoalCard } from '@/components/goals/GoalCard'
import { GoalForm } from '@/components/goals/GoalForm'
import { currentMonthYear } from '@/lib/formatters'

export function GoalsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editGoal, setEditGoal] = useState<PurchaseGoal | undefined>()
  const [showCompleted, setShowCompleted] = useState(false)

  const { month, year } = currentMonthYear()

  const { data: goals, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: goalsApi.list,
  })

  const { data: dashboardSummary } = useQuery({
    queryKey: ['dashboard-summary', month, year],
    queryFn: () => dashboardApi.summary(month, year),
  })

  const monthlySavings = dashboardSummary?.month_balance ?? 0

  const openNew = () => { setEditGoal(undefined); setDialogOpen(true) }
  const openEdit = (goal: PurchaseGoal) => { setEditGoal(goal); setDialogOpen(true) }

  const activeGoals = goals?.filter((g) => !g.is_completed) ?? []
  const completedGoals = goals?.filter((g) => g.is_completed) ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 600, color: 'var(--purple-deep)', marginBottom: '0.25rem' }}>
            Objetivos de Compra
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--purple-light)' }}>
            {activeGoals.length} em andamento · {completedGoals.length} concluídos
          </p>
        </div>
        <button onClick={openNew} className="btn btn-primary">
          <Plus size={16} /> Novo Objetivo
        </button>
      </div>

      {/* Active goals grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 256, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : activeGoals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎯</div>
          <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--purple-dark)', marginBottom: '0.25rem' }}>
            Nenhum objetivo cadastrado
          </p>
          <p style={{ fontSize: '0.78rem' }}>Crie seu primeiro objetivo de compra!</p>
          <button onClick={openNew} className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Criar objetivo
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {activeGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => openEdit(goal)}
              monthlySavings={monthlySavings}
            />
          ))}
        </div>
      )}

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="btn btn-ghost"
            style={{ fontSize: '0.8rem', padding: '0.375rem 0.75rem', color: 'var(--purple-light)' }}
          >
            {showCompleted ? '▼' : '▶'} Objetivos Concluídos ({completedGoals.length})
          </button>
          {showCompleted && (
            <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {completedGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={() => openEdit(goal)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent title={editGoal ? 'Editar Objetivo' : 'Novo Objetivo'}>
          <GoalForm goal={editGoal} onSuccess={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* FAB for mobile */}
      <button onClick={openNew} className="fab hide-on-lg" title="Novo objetivo">
        <Plus size={22} />
      </button>
    </div>
  )
}
