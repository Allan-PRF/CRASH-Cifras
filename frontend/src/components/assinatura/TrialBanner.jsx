import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useUserSettings } from '../../hooks/useUserSettings'
import {
  acessoCompletoAtivo,
  assinaturaAtiva,
  diasRestantesTrial,
  diasTotaisTrial,
  trialAtivo,
} from '../../lib/planos'

export function TrialBanner() {
  const { settings, loading } = useUserSettings()
  const location = useLocation()
  const navigate = useNavigate()

  const trial = !loading && trialAtivo(settings)
  const subAtiva = !loading && assinaturaAtiva(settings)
  const assinaturaExpiraEm = settings?.assinatura_expira_em

  const diasAteExpirar = useMemo(() => {
    if (!subAtiva || !assinaturaExpiraEm) return null
    const diffMs = new Date(assinaturaExpiraEm).getTime() - Date.now()
    return Math.max(0, Math.ceil(diffMs / 86400000))
  }, [assinaturaExpiraEm, subAtiva])

  const bannerSub = useMemo(() => {
    if (!subAtiva || diasAteExpirar == null) return null

    if (diasAteExpirar <= 3) {
      const texto =
        diasAteExpirar === 0
          ? '🚨 URGENTE! Sua assinatura expira hoje!'
          : diasAteExpirar === 1
            ? '🚨 URGENTE! Sua assinatura expira amanhã!'
            : `🚨 URGENTE! Sua assinatura expira em ${diasAteExpirar} dias!`
      return {
        text: texto,
        className:
          'block border-b border-red-500/30 bg-red-950/40 px-4 py-2 text-center text-xs font-semibold text-red-100 animate-pulse',
      }
    }

    if (diasAteExpirar <= 5) {
      return {
        text: `🚨 Atenção! Sua assinatura expira em ${diasAteExpirar} dias`,
        className:
          'block border-b border-red-500/20 bg-red-950/25 px-4 py-2 text-center text-xs font-semibold text-red-100',
      }
    }

    if (diasAteExpirar <= 10) {
      return {
        text: `⚠️ Sua assinatura expira em ${diasAteExpirar} dias — Renovar agora`,
        className:
          'block border-b border-[var(--crash-cifra)]/25 bg-[var(--crash-cifra)]/15 px-4 py-2 text-center text-xs font-semibold text-white',
      }
    }

    if (diasAteExpirar <= 20) {
      return {
        text: `🔔 Sua assinatura renova em ${diasAteExpirar} dias`,
        className:
          'block border-b border-yellow-500/25 bg-yellow-950/20 px-4 py-2 text-center text-xs font-medium text-yellow-100',
      }
    }

    return null
  }, [diasAteExpirar, subAtiva])

  // Popup ao abrir (<= 5 dias), 1x por dia
  const [renewOpen, setRenewOpen] = useState(false)
  useEffect(() => {
    if (!subAtiva || diasAteExpirar == null || diasAteExpirar > 5) return
    if (location.pathname.startsWith('/assinatura')) return

    const today = new Date().toISOString().slice(0, 10)
    const key = `crash-renew-popup-${today}`
    if (localStorage.getItem(key) === '1') return
    setRenewOpen(true)
  }, [diasAteExpirar, location.pathname, subAtiva])

  function lembrarDepois() {
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem(`crash-renew-popup-${today}`, '1')
    setRenewOpen(false)
  }

  // Popup ao fechar/sair (<= 3 dias)
  useEffect(() => {
    if (!subAtiva || diasAteExpirar == null || diasAteExpirar > 3) return

    const handler = (e) => {
      // Dialog nativo do browser (limitação da plataforma)
      const msg =
        diasAteExpirar === 0
          ? 'Sua assinatura expira hoje. Renovar antes de sair?'
          : `Sua assinatura expira em ${diasAteExpirar} dia(s). Renovar antes de sair?`
      e.preventDefault()
      // eslint-disable-next-line no-param-reassign
      e.returnValue = msg
      return msg
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [diasAteExpirar, subAtiva])

  const trialDias = diasRestantesTrial(settings)
  const trialTotal = diasTotaisTrial(settings)

  return (
    <>
      {trial && (
        <Link
          to="/assinatura"
          className="block border-b border-[var(--crash-cifra)]/20 bg-[var(--crash-cifra)]/10 px-4 py-2 text-center text-xs font-medium text-white"
        >
          🎹 Teste grátis ({trialTotal} dias) — {trialDias} dia{trialDias !== 1 ? 's' : ''}{' '}
          restante{trialDias !== 1 ? 's' : ''}
        </Link>
      )}

      {!trial && bannerSub && (
        <Link to="/assinatura" className={bannerSub.className}>
          {bannerSub.text}
        </Link>
      )}

      {renewOpen && (
        <div className="fixed right-4 top-16 z-50 w-full max-w-[340px]">
          <div
            className="rounded-2xl border border-[var(--crash-borda)] bg-[var(--crash-fundo-card)] p-4 shadow-lg"
            role="dialog"
            aria-modal="false"
            aria-labelledby="renew-toast-title"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id="renew-toast-title" className="text-base font-bold text-white">
                Renovação da assinatura
              </h2>
              <button
                type="button"
                onClick={lembrarDepois}
                className="rounded-md px-2 py-1 text-xs text-[var(--crash-texto-sec)] hover:bg-white/10 hover:text-white"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <p className="mt-2 text-sm text-[var(--crash-texto-sec)]">
              Sua assinatura expira em{' '}
              <strong className="text-white">{diasAteExpirar}</strong>{' '}
              dia{diasAteExpirar === 1 ? '' : 's'}.
            </p>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => navigate('/assinatura')}
                className="rounded-lg bg-[var(--crash-cifra)] px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
              >
                Renovar agora
              </button>
              <button
                type="button"
                onClick={lembrarDepois}
                className="rounded-lg border border-[var(--crash-borda)] bg-black/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/60"
              >
                Lembrar depois
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function TrialAccessRedirect({ children }) {
  const location = useLocation()
  const { settings, loading } = useUserSettings()

  if (loading) return children

  const isBillingPage = location.pathname.startsWith('/assinatura')
  const isAccountPage = location.pathname.startsWith('/conta')
  const canAccess = acessoCompletoAtivo(settings)

  if (!canAccess && !isBillingPage && !isAccountPage) {
    return <Navigate to="/assinatura" replace />
  }

  return children
}
