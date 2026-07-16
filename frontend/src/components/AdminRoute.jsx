import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { isAdminUser } from '../lib/admin'

export function AdminRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <p className="text-sm text-[var(--crash-texto-sec)]">Carregando…</p>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!isAdminUser(user)) {
    return <Navigate to="/" replace />
  }

  return children
}
