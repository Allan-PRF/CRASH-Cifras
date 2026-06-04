import { Link } from 'react-router-dom'
import { btnPrimaryClassName } from '../ui/inputClasses'
import { useUserSettings } from '../../hooks/useUserSettings'
import { acessoCompletoAtivo, planoAtende, planoEfetivo } from '../../lib/planos'

export function PlanoGate({ minimo = 'solo', children }) {
  const { settings, loading } = useUserSettings()

  if (loading) {
    return <p className="text-sm text-[var(--crash-texto-sec)]">Verificando plano…</p>
  }

  const liberado = acessoCompletoAtivo(settings) && planoAtende(planoEfetivo(settings), minimo)
  if (liberado) return children

  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-[var(--crash-cifra)]/40 bg-black/60 p-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--crash-cifra)]">
        Renovar assinatura
      </p>
      <h1 className="mt-2 text-2xl font-bold text-white">Seu plano não libera esta área</h1>
      <p className="mt-2 text-sm text-[var(--crash-texto-sec)]">
        Para continuar usando este recurso, escolha ou renove um plano compatível.
      </p>
      <Link to="/assinatura" className={`mt-5 inline-block ${btnPrimaryClassName}`}>
        Ver planos
      </Link>
    </section>
  )
}
