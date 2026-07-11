import { useState } from 'react'
import { TranspositorTom } from '../cifra/TranspositorTom'
import { TomSelectorDialogShell } from '../cifra/TomSelectorDialogShell'
import { btnCifraConfirmClassName, btnSecondaryClassName, inputClassName } from '../ui/inputClasses'

/**
 * Mini-form Etapa D — tom sugerido + comentário opcional.
 */
export function ReportTomErradoModal({
  open,
  tomAtual,
  onSubmit,
  onClose,
}) {
  const [tomSugerido, setTomSugerido] = useState(tomAtual || null)
  const [comentario, setComentario] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  async function handleSubmit() {
    if (!tomSugerido) {
      setError('Escolha o tom sugerido.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onSubmit({ tomSugerido, comentario: comentario.trim() || null })
      setComentario('')
      onClose()
    } catch (err) {
      setError(err.message || 'Não foi possível enviar o reporte.')
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
    <TomSelectorDialogShell
      open={open}
      onClose={handleClose}
      ariaLabel="Reportar tom errado"
      borderClassName="border-amber-500/80"
    >
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white">Reportar tom errado</h2>
          <p className="mt-1 text-xs text-[var(--crash-texto-sec)]">
            Tom atual na fonte: <strong className="text-white">{tomAtual || '—'}</strong>
          </p>
        </div>

        <TranspositorTom
          tomAtual={tomSugerido}
          onSelectTom={setTomSugerido}
          compacto
          mobileCompact
        />

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--crash-texto-sec)]">
            Comentário (opcional)
          </label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={3}
            className={inputClassName}
            placeholder="Explique por que o tom ainda está errado…"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={handleClose} disabled={loading} className={btnSecondaryClassName}>
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} disabled={loading} className={btnCifraConfirmClassName}>
            {loading ? 'Enviando…' : 'Enviar reporte'}
          </button>
        </div>
      </div>
    </TomSelectorDialogShell>
  )
}
