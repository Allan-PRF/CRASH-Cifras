import { useEffect, useRef, useState } from 'react'
import { AnotacaoEditorForm } from '../musicas/AnotacaoEditorForm.jsx'
import { updatePlaylistItem } from '../../services/playlists'

export const ANOTACAO_EVENTO_PLACEHOLDER =
  'Ex.: transpor de Dó pra Sol neste culto, pad mais seco no verso…'

export function normalizarAnotacaoEvento(valor) {
  return String(valor ?? '').trim()
}

/** Textarea de nota isolada no item da playlist (salva em playlist_itens.anotacao_evento). */
export function AnotacaoEventoItemBloco({
  itemId,
  initialValue = '',
  disabled = false,
  onSaved,
}) {
  const [value, setValue] = useState(() => normalizarAnotacaoEvento(initialValue))
  const [saving, setSaving] = useState(false)
  const [savedVisible, setSavedVisible] = useState(false)
  const [saveError, setSaveError] = useState('')
  const lastSavedRef = useRef(normalizarAnotacaoEvento(initialValue))

  useEffect(() => {
    const next = normalizarAnotacaoEvento(initialValue)
    setValue(next)
    lastSavedRef.current = next
  }, [itemId, initialValue])

  useEffect(() => {
    if (!savedVisible) return undefined
    const timer = window.setTimeout(() => setSavedVisible(false), 2500)
    return () => window.clearTimeout(timer)
  }, [savedVisible])

  async function handleBlur() {
    if (disabled || value === lastSavedRef.current) return

    setSaving(true)
    setSavedVisible(false)
    setSaveError('')
    try {
      await updatePlaylistItem(itemId, {
        anotacao_evento: value.trim() || null,
      })
      lastSavedRef.current = value
      setSavedVisible(true)
      onSaved?.()
    } catch (err) {
      setSaveError(err.message || 'Não foi possível salvar a nota deste evento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 border-t border-[var(--crash-borda)] pt-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--crash-cifra)]">
          📝 Nota deste evento
        </span>
        <span className="min-w-[4.5rem] text-right text-[10px] font-medium text-[var(--crash-cifra)]">
          {saving ? 'Salvando…' : savedVisible ? 'Salvo' : ''}
        </span>
      </div>
      <p className="mb-2 text-[11px] leading-relaxed text-[var(--crash-texto-sec)]">
        Só vale neste culto — não altera a anotação da pasta do ministro.
      </p>
      <AnotacaoEditorForm
        value={value}
        onChange={setValue}
        onBlur={handleBlur}
        saving={saving || disabled}
        variant="folha"
        rows={3}
        className="!border-[var(--crash-borda)] text-xs"
        placeholder={ANOTACAO_EVENTO_PLACEHOLDER}
      />
      <p id={`anotacao-evento-hint-${itemId}`} className="sr-only">
        {ANOTACAO_EVENTO_PLACEHOLDER}
      </p>
      {saveError && (
        <p className="mt-1 text-xs text-red-400" role="alert">
          {saveError}
        </p>
      )}
    </div>
  )
}
