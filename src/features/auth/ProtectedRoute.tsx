import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingScreen } from '../../components/LoadingScreen'
import { useAuth } from './auth-context'

export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <LoadingScreen label="Verificando sua sessão" />

  if (status !== 'authenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
