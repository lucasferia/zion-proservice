import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingScreen } from '../../components/LoadingScreen'
import { getDefaultAccessPath } from './access'
import { useAuth, type AccessContextKind } from './auth-context'

export function AccessResolutionError() {
  const { retryAccessResolution, signOut } = useAuth()

  return (
    <main className="access-error-page">
      <section className="access-error-card" role="alert">
        <span className="eyebrow">Acesso não confirmado</span>
        <h1>Não foi possível validar sua conta</h1>
        <p>Confira sua conexão e tente novamente. Nenhuma área do sistema foi liberada.</p>
        <div>
          <button className="primary-button" type="button" onClick={() => void retryAccessResolution()}>
            Tentar novamente <span aria-hidden="true">↻</span>
          </button>
          <button className="secondary-button" type="button" onClick={() => void signOut()}>
            Sair
          </button>
        </div>
      </section>
    </main>
  )
}

export function ProtectedRoute({ allowed }: { allowed?: AccessContextKind[] }) {
  const { status, accessStatus, accessContext } = useAuth()
  const location = useLocation()

  if (status === 'loading' || (status === 'authenticated' && accessStatus === 'loading')) {
    return <LoadingScreen label="Validando seu ambiente de acesso" />
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (accessStatus === 'error') return <AccessResolutionError />
  if (accessStatus !== 'resolved' || !accessContext) {
    return <LoadingScreen label="Preparando seu acesso" />
  }

  if (allowed && !allowed.includes(accessContext.kind)) {
    return <Navigate to={getDefaultAccessPath(accessContext)} replace />
  }

  return <Outlet />
}

export function AccessRedirect() {
  const { status, accessStatus, accessContext } = useAuth()

  if (status === 'loading' || (status === 'authenticated' && accessStatus === 'loading')) {
    return <LoadingScreen label="Validando seu ambiente de acesso" />
  }
  if (status !== 'authenticated') return <Navigate to="/login" replace />
  if (accessStatus === 'error') return <AccessResolutionError />
  if (accessStatus !== 'resolved' || !accessContext) return <LoadingScreen label="Preparando seu acesso" />
  return <Navigate to={getDefaultAccessPath(accessContext)} replace />
}
