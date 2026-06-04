import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const ADMIN_EMAIL = 'alanadcms@gmail.com'

export function AdminRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <p className="text-sm text-[var(--crash-texto-sec)]">Carregando…</p>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.email?.toLowerCase() !== ADMIN_EMAIL) {
    return <Navigate to="/" replace />
  }

  return children
}
