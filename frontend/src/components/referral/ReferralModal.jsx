import { useEffect, useState } from 'react'
import { REFERRAL_SHARE_TEXT } from '@crash-cifras/shared/referral'
import { btnPrimaryClassName, btnSecondaryClassName } from '../ui/inputClasses'
import { fetchReferralStats } from '../../services/referrals'

function buildShareMessage(link) {
  return `${REFERRAL_SHARE_TEXT}\n${link}`
}

export function ReferralModal({ open, onClose }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return

    setLoading(true)
    setError('')
    fetchReferralStats()
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [open])

  if (!open) return null

  async function copyLink() {
    if (!stats?.link) return
    try {
      await navigator.clipboard.writeText(stats.link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Não foi possível copiar o link.')
    }
  }

  function shareWhatsApp() {
    if (!stats?.link) return
    const text = buildShareMessage(stats.link)
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="referral-modal-title"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--crash-borda)] bg-[var(--crash-fundo-card)] p-6 shadow-xl">
        <header className="flex items-start justify-between gap-4">
          <h2 id="referral-modal-title" className="text-xl font-bold text-white">
            Tire um amigo do sufoco
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-[var(--crash-texto-sec)] hover:bg-white/10 hover:text-white"
            aria-label="Fechar"
          >
            Fechar
          </button>
        </header>

        {loading && (
          <p className="mt-6 text-sm text-[var(--crash-texto-sec)]">Carregando…</p>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        {!loading && stats && (
          <div className="mt-6 space-y-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--crash-texto-sec)]">
                Seu link exclusivo
              </p>
              <p className="mt-2 break-all rounded-lg border border-[var(--crash-borda)] bg-black px-3 py-2 text-sm text-white">
                {stats.link}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={copyLink} className={btnPrimaryClassName}>
                {copied ? 'Link copiado' : 'Copiar link'}
              </button>
              <button type="button" onClick={shareWhatsApp} className={btnSecondaryClassName}>
                Compartilhar via WhatsApp
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
