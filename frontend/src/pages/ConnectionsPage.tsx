import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw, Trash2, Landmark, FileUp, ExternalLink, TrendingUp } from 'lucide-react'
import axios from 'axios'
import { connectionsApi, type BankConnection, type SyncResult, type OfxImportResult, type InvestmentSyncResult } from '@/api/connections'
import { authApi } from '@/api/auth'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatDate } from '@/lib/formatters'

function errorDetail(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error) && typeof error.response?.data?.detail === 'string') {
    return error.response.data.detail
  }
  return fallback
}

function SyncSummary({ result }: { result: SyncResult | OfxImportResult }) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '0.5rem',
      padding: '0.625rem 0.875rem',
      background: 'var(--teal-light)',
      borderRadius: 'var(--radius-sm)',
      fontSize: '0.8rem',
      color: 'var(--teal-dark)',
      fontWeight: 500,
    }}>
      <span><strong>{result.imported}</strong> sugeridas para revisão (em Transações)</span>
      <span>· <strong>{result.skipped_duplicates}</strong> já existiam</span>
      {result.uncategorized > 0 && (
        <span>· <strong>{result.uncategorized}</strong> sem categoria (crie regras em Categorias)</span>
      )}
    </div>
  )
}

function InvSyncSummary({ result }: { result: InvestmentSyncResult }) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '0.5rem',
      padding: '0.625rem 0.875rem',
      background: 'var(--purple-muted)',
      borderRadius: 'var(--radius-sm)',
      fontSize: '0.8rem',
      color: 'var(--purple-dark)',
      fontWeight: 500,
    }}>
      <span><strong>{result.total_positions}</strong> posições na corretora</span>
      <span>· <strong>{result.created}</strong> novas</span>
      <span>· <strong>{result.updated}</strong> atualizadas</span>
      {result.removed_sold > 0 && <span>· <strong>{result.removed_sold}</strong> vendidas removidas</span>}
      {result.removed_manual > 0 && <span>· <strong>{result.removed_manual}</strong> manuais substituídas</span>}
    </div>
  )
}

export function ConnectionsPage() {
  const qc = useQueryClient()
  const [itemId, setItemId] = useState('')
  const [nickname, setNickname] = useState('')
  const [deleteConn, setDeleteConn] = useState<BankConnection | undefined>()
  const [syncResults, setSyncResults] = useState<Record<number, SyncResult>>({})
  const [invSyncConn, setInvSyncConn] = useState<BankConnection | undefined>()
  const [invResults, setInvResults] = useState<Record<number, InvestmentSyncResult>>({})
  const [ofxResult, setOfxResult] = useState<OfxImportResult | undefined>()
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: status, isLoading } = useQuery({ queryKey: ['connections'], queryFn: connectionsApi.status })
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: authApi.users })

  const createMutation = useMutation({
    mutationFn: () => connectionsApi.create(itemId.trim(), nickname.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['connections'] })
      setItemId('')
      setNickname('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: connectionsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['connections'] })
      setDeleteConn(undefined)
    },
  })

  const syncMutation = useMutation({
    mutationFn: connectionsApi.sync,
    onSuccess: (result, id) => {
      setSyncResults((prev) => ({ ...prev, [id]: result }))
      qc.invalidateQueries({ queryKey: ['review'] })
      qc.invalidateQueries({ queryKey: ['connections'] })
    },
  })

  const invSyncMutation = useMutation({
    mutationFn: (conn: BankConnection) => connectionsApi.syncInvestments(conn.id, true),
    onSuccess: (result, conn) => {
      setInvResults((prev) => ({ ...prev, [conn.id]: result }))
      qc.invalidateQueries({ queryKey: ['investments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setInvSyncConn(undefined)
    },
  })

  const ofxMutation = useMutation({
    mutationFn: connectionsApi.importOfx,
    onSuccess: (result) => {
      setOfxResult(result)
      qc.invalidateQueries({ queryKey: ['review'] })
      if (fileRef.current) fileRef.current.value = ''
    },
  })

  const configured = status?.pluggy_configured ?? false

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Open Finance (Pluggy) */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Open Finance — contas conectadas</h3>
          <a
            href="https://meu.pluggy.ai"
            target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', fontWeight: 600, color: 'var(--teal-dark)', textDecoration: 'none' }}
          >
            meu.pluggy.ai <ExternalLink size={13} />
          </a>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {!configured && !isLoading && (
            <div style={{
              padding: '1rem 1.25rem',
              background: 'var(--yellow-light)',
              borderRadius: 'var(--radius)',
              fontSize: '0.83rem',
              color: 'var(--yellow-dark)',
              lineHeight: 1.7,
            }}>
              <p style={{ fontWeight: 700, marginBottom: '0.375rem' }}>Integração ainda não configurada</p>
              <ol style={{ paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <li>Cada um cria conta no <strong>meu.pluggy.ai</strong> e conecta seus bancos (consentimento Open Finance oficial, gratuito).</li>
                <li>Crie uma aplicação em <strong>dashboard.pluggy.ai</strong> e copie o client ID e o secret.</li>
                <li>No servidor, defina <code>PLUGGY_CLIENT_ID</code> e <code>PLUGGY_CLIENT_SECRET</code> no <code>.env</code> e reinicie.</li>
                <li>Volte aqui e cadastre o <em>item ID</em> de cada conexão bancária.</li>
              </ol>
            </div>
          )}

          {/* Lista de conexões */}
          {(status?.connections.length ?? 0) === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem 0' }}>
              <div className="empty-state-icon"><Landmark size={26} color="var(--purple-light)" /></div>
              <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--purple-dark)', marginBottom: '0.25rem' }}>
                Nenhuma conta conectada
              </p>
              <p style={{ fontSize: '0.78rem' }}>Cadastre o item ID da conexão feita no Meu Pluggy</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {status!.connections.map((conn) => (
                <div key={conn.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    background: 'var(--bg)',
                    borderRadius: 'var(--radius)',
                  }}>
                    <span style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'var(--teal-light)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Landmark size={17} color="var(--teal-dark)" />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--purple-deep)' }}>{conn.nickname}</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--purple-light)' }}>
                        {users?.find((u) => u.id === conn.user_id)?.name ?? '—'}
                        {' · '}
                        {conn.last_synced_at ? `sincronizado ${formatDate(conn.last_synced_at)}` : 'nunca sincronizado'}
                      </p>
                    </div>
                    <button
                      onClick={() => syncMutation.mutate(conn.id)}
                      disabled={syncMutation.isPending}
                      className="btn btn-secondary"
                      style={{ padding: '0.5rem 0.875rem', fontSize: '0.8rem' }}
                    >
                      <RefreshCw size={14} className={syncMutation.isPending ? 'spin' : undefined} />
                      Sincronizar
                    </button>
                    <button
                      onClick={() => setInvSyncConn(conn)}
                      disabled={invSyncMutation.isPending}
                      className="btn btn-secondary"
                      style={{ padding: '0.5rem 0.875rem', fontSize: '0.8rem' }}
                      title="Espelhar posições da corretora na carteira"
                    >
                      <TrendingUp size={14} />
                      Investimentos
                    </button>
                    <button onClick={() => setDeleteConn(conn)} className="btn btn-danger btn-icon" title="Remover conexão">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {syncResults[conn.id] && <SyncSummary result={syncResults[conn.id]} />}
                  {invResults[conn.id] && <InvSyncSummary result={invResults[conn.id]} />}
                </div>
              ))}
            </div>
          )}

          {syncMutation.isError && (
            <p style={{ fontSize: '0.8rem', color: 'var(--coral)', padding: '0.625rem 0.875rem', background: 'var(--coral-light)', borderRadius: 'var(--radius-sm)' }}>
              {errorDetail(syncMutation.error, 'Falha ao sincronizar. Verifique a conexão no Meu Pluggy.')}
            </p>
          )}

          {/* Nova conexão */}
          <form
            onSubmit={(e) => { e.preventDefault(); if (itemId.trim()) createMutation.mutate() }}
            style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}
          >
            <input
              type="text"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              placeholder="Item ID (uuid da conexão na Pluggy)"
              className="input-field"
              style={{ flex: 2, minWidth: 220 }}
            />
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Apelido (ex: Nubank Marcell)"
              className="input-field"
              style={{ flex: 1, minWidth: 150 }}
            />
            <button type="submit" disabled={!itemId.trim() || createMutation.isPending} className="btn btn-primary">
              <Plus size={15} /> {createMutation.isPending ? 'Validando...' : 'Conectar'}
            </button>
          </form>
          {createMutation.isError && (
            <p style={{ fontSize: '0.8rem', color: 'var(--coral)' }}>
              {errorDetail(createMutation.error, 'Não foi possível validar este item na Pluggy.')}
            </p>
          )}
        </div>
      </div>

      {/* Import OFX */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Importar extrato (OFX)</h3>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
            Alternativa sem configuração: exporte o extrato em OFX no app do banco
            (Nubank: Extrato → Exportar · Inter: Extrato → Exportar OFX · Itaú: Extrato → salvar como OFX)
            e envie aqui. Transações repetidas são ignoradas automaticamente e as regras de categorização são aplicadas.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', alignItems: 'center' }}>
            <input
              ref={fileRef}
              type="file"
              accept=".ofx,.qfx,text/plain"
              className="input-field"
              style={{ flex: 1, minWidth: 220, padding: '0.45rem 0.875rem' }}
              onChange={() => setOfxResult(undefined)}
            />
            <button
              onClick={() => { const f = fileRef.current?.files?.[0]; if (f) ofxMutation.mutate(f) }}
              disabled={ofxMutation.isPending}
              className="btn btn-primary"
            >
              <FileUp size={15} /> {ofxMutation.isPending ? 'Importando...' : 'Importar'}
            </button>
          </div>
          {ofxResult && <SyncSummary result={ofxResult} />}
          {ofxMutation.isError && (
            <p style={{ fontSize: '0.8rem', color: 'var(--coral)', padding: '0.625rem 0.875rem', background: 'var(--coral-light)', borderRadius: 'var(--radius-sm)' }}>
              {errorDetail(ofxMutation.error, 'Falha ao importar o arquivo.')}
            </p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteConn)}
        onOpenChange={(open) => { if (!open) setDeleteConn(undefined) }}
        title="Remover conexão"
        description={`A conexão "${deleteConn?.nickname ?? ''}" será removida. As transações já importadas permanecem.`}
        isPending={deleteMutation.isPending}
        onConfirm={() => { if (deleteConn) deleteMutation.mutate(deleteConn.id) }}
      />

      <ConfirmDialog
        open={Boolean(invSyncConn)}
        onOpenChange={(open) => { if (!open) setInvSyncConn(undefined) }}
        title="Sincronizar investimentos"
        description={`As posições de "${invSyncConn?.nickname ?? ''}" serão espelhadas na carteira e os investimentos cadastrados manualmente serão REMOVIDOS — o Open Finance passa a ser a fonte da carteira. Posições vendidas na corretora também saem. Sincronizações futuras só atualizam os valores.`}
        isPending={invSyncMutation.isPending}
        onConfirm={() => { if (invSyncConn) invSyncMutation.mutate(invSyncConn) }}
      />

      <style>{`
        @keyframes spin-slow { to { transform: rotate(360deg); } }
        .spin { animation: spin-slow 1s linear infinite; }
      `}</style>
    </div>
  )
}
