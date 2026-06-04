import { useEffect } from 'react'
import { handleJwtExpiredGlobal } from '../lib/jwtExpiredGlobal'

/**
 * Substitui tela de erro "JWT expired": tenta refresh e recarrega ou vai ao login.
 */
export function ErroJWT() {
  useEffect(() => {
    void handleJwtExpiredGlobal()
  }, [])

  return (
    <p className="py-12 text-center text-sm text-[var(--crash-texto-sec)]">
      Renovando sessão…
    </p>
  )
}
