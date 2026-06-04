import { useState } from 'react'
import { btnPrimaryClassName, btnSecondaryClassName } from './inputClasses'

const btnDangerClassName =
  'rounded-lg border border-red-800 bg-red-950/60 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-900/50 disabled:opacity-50'

export function ConfirmDeleteModal({
  open,
  title = 'Confirmar exclusão',
  message,
  extraWarning = null,
  confirmLabel = 'Excluir',
  cancelLabel = 'Cancelar',
  onConfirm,
  onClose,
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  async function handleConfirm() {
    setLoading(true)
    setError('')
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(err.message || 'Não foi possível excluir.')
    } finally {
      setLoading(false)
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
      aria-labelledby="confirm-delete-title"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--crash-borda)] bg-[var(--crash-fundo-card)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-delete-title" className="text-lg font-bold text-white">
          {title}
        </h2>
        {message && (
          <p className="mt-3 whitespace-pre-line text-sm text-[var(--crash-texto-sec)]">
            {message}
          </p>
        )}
        {extraWarning && (
          <p className="mt-3 whitespace-pre-line rounded-lg border border-amber-700/40 bg-amber-950/25 p-3 text-sm text-amber-100/90">
            {extraWarning}
          </p>
        )}
        {error && (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className={btnSecondaryClassName}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={btnDangerClassName}
          >
            {loading ? 'Excluindo…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
