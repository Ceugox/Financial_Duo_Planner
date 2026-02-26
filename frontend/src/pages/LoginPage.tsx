import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { TrendingUp } from 'lucide-react'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      console.error("❌ ERRO NO LOGIN:", err);
      if (!err.response) {
        setError('Erro de conexão. Verifique se a URL do backend está correta e se o CORS está liberado.');
      } else {
        setError('Email ou senha incorretos.');
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'grid',
      gridTemplateColumns: '1fr',
      background: 'var(--cream)',
    }}
      className="login-grid"
    >
      {/* Left — illustration panel */}
      <div style={{
        display: 'none',
        position: 'relative',
        background: 'var(--purple-dark)',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        padding: '3rem',
      }}
        className="login-left"
      >
        {/* Decorative circles */}
        <div style={{
          position: 'absolute',
          top: '-80px', right: '-80px',
          width: 320, height: 320,
          borderRadius: '50%',
          background: 'rgba(116,170,155,0.15)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-60px', left: '-60px',
          width: 240, height: 240,
          borderRadius: '50%',
          background: 'rgba(236,228,136,0.1)',
        }} />
        <div style={{
          position: 'absolute',
          top: '40%', left: '-40px',
          width: 120, height: 120,
          borderRadius: '50%',
          background: 'rgba(145,198,141,0.1)',
        }} />

        {/* Illustration */}
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: 380,
          aspectRatio: '1 / 1',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
          border: '2px solid rgba(246,245,205,0.12)',
        }}>
          <img
            src="/logo.jpg"
            alt="Organize suas finanças"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        {/* Tagline */}
        <div style={{ marginTop: '2rem', textAlign: 'center', maxWidth: 340 }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.75rem',
            fontWeight: 600,
            color: 'var(--cream)',
            lineHeight: 1.3,
            marginBottom: '0.75rem',
          }}>
            Finanças organizadas,<br />
            <em style={{ fontStyle: 'italic', color: 'var(--yellow)' }}>vida em harmonia</em>
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'rgba(246,245,205,0.55)', lineHeight: 1.7 }}>
            Acompanhe receitas, despesas, investimentos e conquiste seus objetivos juntos.
          </p>
        </div>

        {/* Stats strip */}
        <div style={{
          display: 'flex',
          gap: '2rem',
          marginTop: '2rem',
          padding: '1.25rem 2rem',
          background: 'rgba(246,245,205,0.06)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(246,245,205,0.1)',
        }}>
          {[
            { value: 'R$', label: 'Moeda' },
            { value: '100%', label: 'Privado' },
            { value: '4', label: 'Módulos' },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--yellow)' }}>{s.value}</p>
              <p style={{ fontSize: '0.7rem', color: 'rgba(246,245,205,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right — login form */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        minHeight: '100dvh',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }} className="animate-fade-up">
          {/* Mobile logo */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '2.5rem',
          }}
            className="hide-on-lg"
          >
            <div style={{
              width: 48, height: 48,
              borderRadius: 14,
              overflow: 'hidden',
              border: '2px solid var(--teal-light)',
              flexShrink: 0,
            }}>
              <img src="/logo.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, color: 'var(--purple-deep)', lineHeight: 1.2 }}>
                Finanças do Casal
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--purple-light)' }}>Gestão financeira privada</p>
            </div>
          </div>

          {/* Heading */}
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--purple-deep)',
            lineHeight: 1.2,
            marginBottom: '0.5rem',
          }}>
            Bem-vindo!
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--purple-light)', marginBottom: '2rem' }}>
            Acesse sua conta para continuar.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="input-field"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div style={{
                padding: '0.75rem 1rem',
                background: 'var(--coral-light)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--coral)',
                fontSize: '0.85rem',
                fontWeight: 500,
                border: '1px solid var(--coral)',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ marginTop: '0.25rem', fontSize: '0.95rem', gap: '0.5rem' }}
            >
              {loading ? (
                <>
                  <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                  Entrando...
                </>
              ) : (
                <>
                  <TrendingUp size={16} />
                  Entrar
                </>
              )}
            </button>
          </form>

          <p style={{
            marginTop: '2rem',
            fontSize: '0.75rem',
            color: 'var(--purple-light)',
            textAlign: 'center',
          }}>
            Acesso restrito · apenas convidados
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
