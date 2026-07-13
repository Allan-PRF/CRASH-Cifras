import { useState } from 'react'
import {
  btnCifraConfirmClassName,
  btnSecondaryClassName,
} from '../ui/inputClasses'

/**
 * Prompt ao sair do teleprompter com BPM de sessão diferente do salvo.
 */
export function SalvarBpmPessoalModal({ open, bpm, onSalvar, onAgoraNao }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  async function handleSalvar() {
    setLoading(true)
    setError('')
    try {
      await onSalvar()
    } catch (err) {
      setError(err.message || 'Não foi possível salvar o BPM.')
      setLoading(false)
      return
    }
    setLoading(false)
  }

  function handleAgoraNao() {
    if (loading) return
    setError('')
    onAgoraNao()
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="salvar-bpm-pessoal-title"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--crash-cifra)]/40 bg-[var(--crash-fundo-card)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="salvar-bpm-pessoal-title"
          className="text-lg font-bold text-[var(--crash-cifra)]"
        >
          Salvar BPM?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--crash-texto-sec)]">
          Salvar este BPM ({bpm}) para esta música?
        </p>
        {error && (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={handleAgoraNao}
            disabled={loading}
            className={btnSecondaryClassName}
          >
            Agora não
          </button>
          <button
            type="button"
            onClick={handleSalvar}
            disabled={loading}
            className={btnCifraConfirmClassName}
          >
            {loading ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
