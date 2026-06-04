import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useSecurityGuard } from '../hooks/useSecurityGuard'

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  useSecurityGuard()

  if (loading) {
    return (
      <p className="py-12 text-center text-sm text-[var(--crash-texto-sec)]">
        Carregando…
      </p>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
