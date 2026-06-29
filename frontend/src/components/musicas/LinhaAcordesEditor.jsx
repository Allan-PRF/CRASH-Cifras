import { useEffect, useRef, useState } from 'react'
import { isValidChordSymbol } from '@crash-cifras/shared/chord-schema'
import { estiloMono } from '../cifra/LinhaPosicionada.jsx'

export function LinhaAcordesEditor({
  chords,
  fonteLetra,
  charWidthPx,
  color,
  fontWeight = 700,
  minCols = 0,
  onChordUpdate,
  onChordRemove,
  onEditStart,
}) {
  const [editingIndex, setEditingIndex] = useState(null)
  const [draft, setDraft] = useState('')
  const [erro, setErro] = useState(false)
  const inputRef = useRef(null)
  const rootRef = useRef(null)
  const skipBlurConfirmRef = useRef(false)

  const widthCols = Math.max(
    minCols,
    ...chords.map(({ pos, chord }) => pos + (chord?.length || 0)),
    0,
  )

  useEffect(() => {
    if (editingIndex === null) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editingIndex])

  useEffect(() => {
    if (editingIndex === null) return

    function onPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        confirmEdit(editingIndex)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [editingIndex, draft, chords])

  function closeEditor() {
    setEditingIndex(null)
    setDraft('')
    setErro(false)
  }

  function openEditor(index) {
    onEditStart?.()
    setEditingIndex(index)
    setDraft(chords[index]?.chord ?? '')
    setErro(false)
  }

  function confirmEdit(index) {
    if (skipBlurConfirmRef.current) {
      skipBlurConfirmRef.current = false
      return
    }

    const trimmed = draft.trim()
    if (!isValidChordSymbol(trimmed)) {
      setErro(true)
      return
    }

    if (trimmed !== chords[index]?.chord) {
      onChordUpdate?.(index, trimmed)
    }
    closeEditor()
  }

  function handleRemove(index) {
    skipBlurConfirmRef.current = true
    onChordRemove?.(index)
    closeEditor()
  }

  if (!chords.length) return null

  return (
    <div
      ref={rootRef}
      className="relative m-0 max-w-full overflow-x-auto overflow-y-visible"
      style={{
        ...estiloMono(fonteLetra, fontWeight),
        minHeight: `${fonteLetra * 1.25}px`,
        minWidth: widthCols > 0 ? widthCols * charWidthPx : undefined,
        color,
      }}
    >
      {chords.map(({ pos, chord }, i) => (
        <div
          key={`${pos}-${chord}-${i}`}
          className="absolute top-0"
          style={{ left: pos * charWidthPx }}
        >
          <button
            type="button"
            onClick={() => openEditor(i)}
            className="cursor-pointer whitespace-pre border-0 bg-transparent p-0 font-inherit text-inherit underline-offset-2 hover:underline hover:decoration-[var(--crash-cifra)] focus:outline-none focus:ring-1 focus:ring-[var(--crash-cifra)]/50"
            aria-label={`Editar acorde ${chord}`}
            aria-expanded={editingIndex === i}
          >
            {chord}
          </button>

          {editingIndex === i && (
            <div
              className="absolute left-0 top-full z-30 mt-1 w-44 rounded-lg border border-[var(--crash-cifra)]/40 bg-black p-2.5 shadow-xl shadow-black/80"
              role="dialog"
              aria-label={`Editar acorde ${chord}`}
            >
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value)
                  setErro(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    confirmEdit(i)
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    closeEditor()
                  }
                }}
                onBlur={() => confirmEdit(i)}
                className={`mb-2 w-full rounded border bg-black px-2 py-1.5 font-mono text-sm text-white outline-none ${
                  erro
                    ? 'border-red-500'
                    : 'border-[var(--crash-cifra)]/50 focus:border-[var(--crash-cifra)]'
                }`}
                aria-invalid={erro}
                aria-describedby={erro ? `chord-edit-erro-${i}` : undefined}
              />
              {erro && (
                <p id={`chord-edit-erro-${i}`} className="mb-2 text-xs text-red-400">
                  Acorde inválido
                </p>
              )}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleRemove(i)}
                className="text-xs text-red-400 hover:underline"
              >
                Remover acorde
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
