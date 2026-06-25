import { useEffect, useState } from 'react'
import { TranspositorTomDropdown } from '../cifra/TranspositorTomDropdown'
import { FormField } from '../ui/FormField'
import { InfoTooltip } from '../ui/InfoTooltip'
import { FUNCIONALIDADE_TOOLTIPS } from '../../lib/funcionalidadeTooltips'
import {
  btnPrimaryClassName,
  btnSecondaryClassName,
  selectClassName,
} from '../ui/inputClasses'
import { copiarMusica } from '../../services/musicas'

export function CompartilharMusicaModal({
  open,
  musica,
  ministros,
  ministroAtualId,
  onClose,
  onCopied,
  titulo = 'Compartilhar música',
  confirmLabel = 'Copiar',
}) {
  const [ministroDestinoId, setMinistroDestinoId] = useState('')
  const [tomDestino, setTomDestino] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const opcoes = ministros.filter((m) => m.id !== ministroAtualId)

  useEffect(() => {
    if (!open) return
    const destinos = ministros.filter((m) => m.id !== ministroAtualId)
    setMinistroDestinoId(destinos.length === 1 ? destinos[0].id : '')
    setTomDestino(null)
    setError('')
    setLoading(false)
  }, [open, ministroAtualId, ministros])

  if (!open || !musica) return null

  const ministroDestino = ministros.find((m) => m.id === ministroDestinoId)
  const tomOriginal = musica.tom_original || null
  const tomExibido = tomDestino ?? tomOriginal
  const tomFoiAlterado = tomDestino != null && tomDestino !== tomOriginal

  async function handleCopiar(e) {
    e.preventDefault()
    if (!ministroDestinoId) {
      setError('Selecione o ministro de destino.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const copia = await copiarMusica(musica.id, {
        ministroIdDestino: ministroDestinoId,
        tomDestino: tomFoiAlterado ? tomDestino : undefined,
      })
      console.log('[compartilhar] cópia criada:', copia.id, copia.titulo)
      onCopied?.(copia)
      onClose()
    } catch (err) {
      setError(err.message || 'Não foi possível copiar a música.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    if (loading) return
    onClose()
  }

  function handleApplyTom(novoTom) {
    if (!novoTom || novoTom === tomOriginal) {
      setTomDestino(null)
    } else {
      setTomDestino(novoTom)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compartilhar-musica-title"
      onClick={handleClose}
    >
      <div
        className="relative my-4 w-full max-w-md rounded-2xl border border-[var(--crash-borda)] bg-[var(--crash-fundo-card)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="compartilhar-musica-title" className="inline-flex items-center gap-1 text-lg font-bold text-white">
          {titulo}
          <InfoTooltip
            text={FUNCIONALIDADE_TOOLTIPS.copiarCena}
            label="Sobre copiar para outro ministro"
          />
        </h2>
        <p className="mt-2 text-sm text-[var(--crash-texto-sec)]">
          Copiar <span className="font-medium text-white">{musica.titulo}</span>
          {ministroDestino ? (
            <> para <span className="font-medium text-white">{ministroDestino.nome}</span></>
          ) : (
            ' para outra pasta'
          )}
          . A original permanece onde está.
        </p>

        <form onSubmit={handleCopiar} className="mt-5 space-y-4">
          <FormField label="Copiar para">
            <select
              required
              value={ministroDestinoId}
              onChange={(e) => setMinistroDestinoId(e.target.value)}
              className={selectClassName}
              disabled={loading}
            >
              <option value="">Selecione…</option>
              {opcoes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                  {m.tom_padrao ? ` · ${m.tom_padrao}` : ''}
                </option>
              ))}
            </select>
          </FormField>

          <div className="space-y-2">
            <p className="text-xs text-[var(--crash-texto-sec)]">
              Tom da cópia:{' '}
              <span className="font-semibold text-[var(--crash-cifra)]">{tomExibido || '—'}</span>
              {!tomFoiAlterado && tomOriginal ? (
                <span className="text-[var(--crash-texto-sec)]"> (atual da música)</span>
              ) : null}
            </p>
            <TranspositorTomDropdown
              tomAtual={tomExibido}
              onApplyTom={handleApplyTom}
              triggerLabel="Trocar o tom"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          {opcoes.length === 0 && (
            <p className="text-xs text-[var(--crash-texto-sec)]">
              Crie outro ministro para compartilhar músicas entre pastas.
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={handleClose} disabled={loading} className={btnSecondaryClassName}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || opcoes.length === 0}
              className={btnPrimaryClassName}
            >
              {loading ? 'Copiando…' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
