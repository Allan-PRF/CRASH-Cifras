import { useState } from 'react'
import { btnCifraConfirmClassName, btnSecondaryClassName } from '../ui/inputClasses'

/**
 * Etapa C — ao salvar tom corrigido, pergunta se propaga para a fonte motor.
 */
export function PropagarTomAcervoModal({ open, tomOriginal, onPropagar, onManterCopia, onClose }) {
  const [loading, setLoading] = useState(false)
  const [modo, setModo] = useState(null)
  const [error, setError] = useState('')

  if (!open) return null

  async function handlePropagar() {
    setLoading(true)
    setModo('propagar')
    setError('')
    try {
      await onPropagar()
      onClose()
    } catch (err) {
      setError(err.message || 'Não foi possível propagar a correção.')
    } finally {
      setLoading(false)
      setModo(null)
    }
  }

  async function handleManterCopia() {
    setLoading(true)
    setModo('copia')
    setError('')
    try {
      await onManterCopia()
      onClose()
    } catch (err) {
      setError(err.message || 'Não foi possível salvar.')
    } finally {
      setLoading(false)
      setModo(null)
    }
  }

  function handleClose() {
    if (loading) return
    setError('')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="propagar-tom-title"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--crash-borda)] bg-[var(--crash-fundo-card)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="propagar-tom-title" className="text-lg font-bold text-white">
          Propagar correção para a fonte do acervo?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--crash-texto-sec)]">
          Você alterou o tom original para <strong className="text-white">{tomOriginal || '—'}</strong>.
          Deseja corrigir também a versão motor no acervo compartilhado? Novas importações
          passarão a usar esse tom.
        </p>
        {error && (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={handleManterCopia}
            disabled={loading}
            className={btnSecondaryClassName}
          >
            {loading && modo === 'copia' ? 'Salvando…' : 'Não'}
          </button>
          <button
            type="button"
            onClick={handlePropagar}
            disabled={loading}
            className={btnCifraConfirmClassName}
          >
            {loading && modo === 'propagar' ? 'Propagando…' : 'Sim, propagar'}
          </button>
        </div>
      </div>
    </div>
  )
}
