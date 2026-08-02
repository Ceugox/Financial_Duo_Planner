import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Wand2, Tags } from 'lucide-react'
import { categoriesApi, type CategoryCreate } from '@/api/categories'
import { categoryRulesApi } from '@/api/categoryRules'
import type { Category } from '@/api/transactions'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

const TYPE_LABELS: Record<string, string> = { income: 'Receita', expense: 'Despesa', both: 'Ambos' }

function CategoryForm({ category, onSuccess }: { category?: Category; onSuccess: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<CategoryCreate>({
    name: category?.name ?? '',
    type: category?.type ?? 'expense',
    icon: category?.icon ?? '📌',
    color: category?.color ?? '#8B8B94',
  })

  const mutation = useMutation({
    mutationFn: category
      ? (data: CategoryCreate) => categoriesApi.update(category.id, data)
      : categoriesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onSuccess()
    },
  })

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      <div>
        <label className="label">Nome *</label>
        <input
          type="text" required maxLength={100}
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          className="input-field"
          placeholder="Ex: Mercado, Assinaturas..."
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.875rem' }}>
        <div>
          <label className="label">Tipo</label>
          <select
            value={form.type}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
            className="input-field"
          >
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
            <option value="both">Ambos</option>
          </select>
        </div>
        <div>
          <label className="label">Ícone</label>
          <input
            type="text" maxLength={4}
            value={form.icon}
            onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
            className="input-field"
            style={{ textAlign: 'center' }}
          />
        </div>
        <div>
          <label className="label">Cor</label>
          <input
            type="color"
            value={form.color}
            onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
            className="input-field"
            style={{ padding: '0.25rem', height: '2.55rem', cursor: 'pointer' }}
          />
        </div>
      </div>

      {mutation.isError && (
        <p style={{ fontSize: '0.85rem', color: 'var(--coral)', padding: '0.625rem 0.875rem', background: 'var(--coral-light)', borderRadius: 'var(--radius-sm)' }}>
          Erro ao salvar categoria. Tente novamente.
        </p>
      )}

      <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
        {mutation.isPending ? 'Salvando...' : category ? 'Atualizar categoria' : 'Criar categoria'}
      </button>
    </form>
  )
}

function RulesCard({ categories }: { categories: Category[] }) {
  const qc = useQueryClient()
  const [pattern, setPattern] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [feedback, setFeedback] = useState('')

  const { data: rules } = useQuery({ queryKey: ['category-rules'], queryFn: categoryRulesApi.list })

  const createMutation = useMutation({
    mutationFn: () => categoryRulesApi.create(pattern.trim(), Number(categoryId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['category-rules'] })
      setPattern('')
      setFeedback('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: categoryRulesApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['category-rules'] }),
  })

  const applyMutation = useMutation({
    mutationFn: categoryRulesApi.apply,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setFeedback(result.updated > 0
        ? `${result.updated} transação(ões) sem categoria foram categorizadas.`
        : 'Nenhuma transação sem categoria combina com essa regra.')
    },
  })

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Regras de categorização automática</h3>
      </div>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
          Quando a descrição de uma transação importada (OFX ou Open Finance) contém o texto da regra,
          a categoria é aplicada na hora. Use o botão <Wand2 size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /> para
          aplicar a regra também nas transações antigas sem categoria.
        </p>

        <form
          onSubmit={(e) => { e.preventDefault(); if (pattern.trim() && categoryId) createMutation.mutate() }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}
        >
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder='Descrição contém... (ex: "uber", "ifood")'
            className="input-field"
            style={{ flex: 2, minWidth: 180 }}
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="input-field"
            style={{ flex: 1, minWidth: 140 }}
            required
          >
            <option value="">Categoria...</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <button
            type="submit"
            disabled={!pattern.trim() || !categoryId || createMutation.isPending}
            className="btn btn-primary"
          >
            <Plus size={15} /> Regra
          </button>
        </form>

        {createMutation.isError && (
          <p style={{ fontSize: '0.8rem', color: 'var(--coral)' }}>
            Não foi possível criar (regra duplicada?).
          </p>
        )}
        {feedback && (
          <p style={{ fontSize: '0.8rem', color: 'var(--teal-dark)', background: 'var(--teal-light)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
            {feedback}
          </p>
        )}

        {(rules?.length ?? 0) === 0 ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', textAlign: 'center', padding: '0.75rem 0' }}>
            Nenhuma regra ainda — crie a primeira acima.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {rules!.map((rule) => (
              <div key={rule.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.5rem 0.75rem',
                background: 'var(--bg)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.83rem',
              }}>
                <code style={{ fontWeight: 600, color: 'var(--purple-deep)' }}>"{rule.pattern}"</code>
                <span style={{ color: 'var(--text-3)' }}>→</span>
                <span>{rule.category.icon} {rule.category.name}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.25rem' }}>
                  <button
                    onClick={() => applyMutation.mutate(rule.id)}
                    className="btn btn-ghost btn-icon"
                    title="Aplicar nas transações sem categoria"
                    disabled={applyMutation.isPending}
                  >
                    <Wand2 size={14} />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(rule.id)}
                    className="btn btn-danger btn-icon"
                    title="Excluir regra"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function CategoriesPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<Category | undefined>()
  const [deleteCategory, setDeleteCategory] = useState<Category | undefined>()
  const qc = useQueryClient()

  const { data: categories, isLoading } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })

  const deleteMutation = useMutation({
    mutationFn: categoriesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setDeleteCategory(undefined)
    },
  })

  const openNew = () => { setEditCategory(undefined); setDialogOpen(true) }
  const openEdit = (cat: Category) => { setEditCategory(cat); setDialogOpen(true) }

  const grouped = {
    expense: categories?.filter((c) => c.type === 'expense') ?? [],
    income: categories?.filter((c) => c.type === 'income') ?? [],
    both: categories?.filter((c) => c.type === 'both') ?? [],
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Categorias</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--purple-light)' }}>
            Cores e ícones usados nos gráficos e nas listas
          </p>
        </div>
        <button onClick={openNew} className="btn btn-primary">
          <Plus size={16} /> Nova Categoria
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 56 }} />)}
        </div>
      ) : (categories?.length ?? 0) === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Tags size={26} color="var(--purple-light)" /></div>
          <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--purple-dark)' }}>Nenhuma categoria</p>
        </div>
      ) : (
        <div className="auto-grid-cards">
          {(['expense', 'income', 'both'] as const).map((type) => grouped[type].length > 0 && (
            <div key={type} className="card">
              <div className="card-header">
                <h3 className="card-title">{TYPE_LABELS[type]}</h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--purple-light)' }}>{grouped[type].length}</span>
              </div>
              <div style={{ padding: '0.5rem 0' }}>
                {grouped[type].map((cat) => (
                  <div key={cat.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.5rem 1.25rem',
                  }}>
                    <span style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: cat.color + '22',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.95rem', flexShrink: 0,
                    }}>
                      {cat.icon}
                    </span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--purple-deep)', flex: 1 }}>
                      {cat.name}
                    </span>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: cat.color, flexShrink: 0 }} title={cat.color} />
                    <button onClick={() => openEdit(cat)} className="btn btn-ghost btn-icon" title="Editar">
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteCategory(cat)}
                      className="btn btn-danger btn-icon"
                      title={cat.is_default ? 'Categoria padrão não pode ser excluída' : 'Excluir'}
                      disabled={cat.is_default}
                      style={cat.is_default ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <RulesCard categories={categories ?? []} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent title={editCategory ? 'Editar Categoria' : 'Nova Categoria'}>
          <CategoryForm key={editCategory?.id ?? 'new'} category={editCategory} onSuccess={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteCategory)}
        onOpenChange={(open) => { if (!open) setDeleteCategory(undefined) }}
        title="Excluir categoria"
        description={`A categoria "${deleteCategory?.name ?? ''}" será removida; transações dela ficam sem categoria.`}
        isPending={deleteMutation.isPending}
        onConfirm={() => { if (deleteCategory) deleteMutation.mutate(deleteCategory.id) }}
      />
    </div>
  )
}
