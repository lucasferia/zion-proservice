import { Link, Navigate, useLocation } from 'react-router-dom'
import horizontalLogo from '../../../Imagens/Logo Horizontal.png'
import { LoadingScreen } from '../../components/LoadingScreen'
import { getDefaultAccessPath } from './access'
import { useAuth } from './auth-context'

export function SignupConfirmationPage() {
  const location = useLocation()
  const state = location.state as { email?: string; confirmationRequired?: boolean } | null

  return (
    <main className="portal-message-page">
      <section className="portal-message-card">
        <img src={horizontalLogo} alt="ZION ProService" />
        <span className="portal-message-card__mark" aria-hidden="true">✓</span>
        <span className="eyebrow">Cadastro recebido</span>
        <h1>{state?.confirmationRequired === false ? 'Sua conta foi criada' : 'Confirme seu e-mail'}</h1>
        <p>
          {state?.confirmationRequired === false
            ? 'O cadastro foi concluído. Entre com sua conta para acompanhar a liberação.'
            : <>Enviamos uma confirmação para <strong>{state?.email ?? 'o e-mail informado'}</strong>. Abra o link recebido antes de entrar.</>}
        </p>
        <div className="portal-message-card__notice">Após a confirmação, seu acesso permanecerá pendente até a validação da equipe ZION.</div>
        <Link className="primary-button" to="/login">Ir para o login <span aria-hidden="true">→</span></Link>
      </section>
    </main>
  )
}

export function AuthConfirmationPage() {
  const { status, accessStatus, accessContext } = useAuth()

  if (status === 'loading' || (status === 'authenticated' && accessStatus === 'loading')) {
    return <LoadingScreen label="Confirmando seu e-mail" />
  }
  if (status === 'authenticated' && accessStatus === 'resolved' && accessContext) {
    return <Navigate to={getDefaultAccessPath(accessContext)} replace />
  }

  return (
    <main className="portal-message-page">
      <section className="portal-message-card">
        <img src={horizontalLogo} alt="ZION ProService" />
        <span className="eyebrow">Confirmação de e-mail</span>
        <h1>Confirmação concluída</h1>
        <p>Seu e-mail foi processado. Entre na conta para verificar o estado da liberação.</p>
        <Link className="primary-button" to="/login">Entrar no portal <span aria-hidden="true">→</span></Link>
      </section>
    </main>
  )
}
