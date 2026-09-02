import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import horizontalLogo from '../../../Imagens/Logo Horizontal.png'
import { useAuth } from './auth-context'

function ShieldIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M12 3 5.5 5.8v5.5c0 4.2 2.7 7.9 6.5 9.7 3.8-1.8 6.5-5.5 6.5-9.7V5.8L12 3Z" />
      <path d="m9.2 12 1.8 1.8 3.9-4" />
    </svg>
  )
}

export function LoginPage() {
  const { status, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (status === 'authenticated') return <Navigate to="/app" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const authError = await signIn(email.trim(), password)
    if (authError) setError(authError)
    setIsSubmitting(false)
  }

  const isConfigurationError = status === 'configuration_error'

  return (
    <main className="login-page">
      <div className="login-page__texture" aria-hidden="true" />
      <section className="login-intro" aria-labelledby="login-title">
        <img className="login-logo" src={horizontalLogo} alt="ZION ProService" />
        <div className="login-intro__copy">
          <span className="eyebrow">Controle técnico em campo</span>
          <h1 id="login-title">
            <span className="login-title__plain">Manutenção com</span>{' '}
            <span>histórico.</span>
            <br />
            <span className="login-title__plain">Operação com</span>{' '}
            <span className="login-title__plain">controle.</span>
          </h1>
          <p>
            Uma base segura para cuidar de equipamentos, serviços e da rotina técnica.
          </p>
        </div>
        <div className="security-note">
          <ShieldIcon />
          <div>
            <strong>Acesso protegido</strong>
            <span>Seus dados permanecem isolados por organização.</span>
          </div>
        </div>
      </section>

      <section className="login-panel" aria-label="Acesso à conta">
        <div className="login-card">
          <img className="login-card__mobile-logo" src={horizontalLogo} alt="ZION ProService" />
          <div className="login-card__number" aria-hidden="true">01 / ACESSO</div>
          <span className="eyebrow">Área restrita</span>
          <h2>Entre na sua conta</h2>
          <p className="login-card__description">
            Use as credenciais cadastradas para acessar o ProService.
          </p>

          {isConfigurationError && (
            <div className="alert alert--error" role="alert">
              A integração com o Supabase não está configurada neste ambiente.
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit} noValidate={false}>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                name="email"
                type="text"
                autoComplete="username"
                placeholder="lucas ou tecnico@empresa.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSubmitting || isConfigurationError}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting || isConfigurationError}
                required
              />
            </div>

            <div className="form-status" aria-live="polite">
              {error && <div className="alert alert--error">{error}</div>}
            </div>

            <button
              className="primary-button"
              type="submit"
              disabled={isSubmitting || isConfigurationError}
            >
              {isSubmitting ? 'Verificando acesso…' : 'Entrar no ProService'}
              <span aria-hidden="true">→</span>
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
