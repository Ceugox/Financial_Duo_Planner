import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro na interface:', error, info)
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div
        style={{
          minHeight: '100dvh',
          background: 'var(--cream)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
        }}
      >
        <div
          className="card"
          style={{
            maxWidth: 440,
            width: '100%',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.35rem', marginBottom: '0.375rem' }}>
              Não foi possível carregar a tela
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--purple-light)' }}>
              Atualize a página. Se continuar, limpe a sessão e entre novamente.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
              Atualizar
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                localStorage.removeItem('auth-storage')
                window.location.href = '/login'
              }}
            >
              Limpar sessão
            </button>
          </div>
        </div>
      </div>
    )
  }
}
