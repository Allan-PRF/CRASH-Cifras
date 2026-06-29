import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  const [popoverPos, setPopoverPos] = useState(null)
  const inputRef = useRef(null)
  const rootRef = useRef(null)
  const popoverRef = useRef(null)
  const skipBlurConfirmRef = useRef(false)
  const openedAtRef = useRef(0)

  const widthCols = Math.max(
    minCols,
    ...chords.map(({ pos, chord }) => pos + (chord?.length || 0)),
    0,
  )

  const closeEditor = useCallback(() => {
    setEditingIndex(null)
    setDraft('')
    setErro(false)
    setPopoverPos(null)
  }, [])

  const confirmEdit = useCallback(
    (index) => {
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
    },
    [chords, closeEditor, draft, onChordUpdate],
  )

  const openEditor = useCallback(
    (index, anchorEl) => {
      onEditStart?.()
      openedAtRef.current = Date.now()
      const rect = anchorEl.getBoundingClientRect()
      setPopoverPos({ top: rect.bottom + 4, left: rect.left })
      setEditingIndex(index)
      setDraft(chords[index]?.chord ?? '')
      setErro(false)
    },
    [chords, onEditStart],
  )

  useEffect(() => {
    if (editingIndex === null) return
    const timer = window.setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [editingIndex])

  useEffect(() => {
    if (editingIndex === null) return

    function onPointerDown(e) {
      const target = e.target
      if (rootRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      confirmEdit(editingIndex)
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [confirmEdit, editingIndex])

  function handleBlur(index) {
    if (Date.now() - openedAtRef.current < 200) return
    confirmEdit(index)
  }

  function handleRemove(index) {
    skipBlurConfirmRef.current = true
    onChordRemove?.(index)
    closeEditor()
  }

  if (!chords.length) return null

  const editingChord = editingIndex != null ? chords[editingIndex]?.chord : null

  return (
    <>
      <div
        ref={rootRef}
        data-chord-editor="interactive"
        className="relative z-10 m-0 max-w-full"
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
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                openEditor(i, e.currentTarget)
              }}
              className="cursor-pointer whitespace-pre border-0 bg-transparent p-0 font-inherit text-inherit underline-offset-2 hover:underline hover:decoration-[var(--crash-cifra)] focus:outline-none focus:ring-1 focus:ring-[var(--crash-cifra)]/50"
              aria-label={`Editar acorde ${chord}`}
              aria-expanded={editingIndex === i}
            >
              {chord}
            </button>
          </div>
        ))}
      </div>

      {editingIndex !== null &&
        popoverPos &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-[200] w-44 rounded-lg border border-[var(--crash-cifra)]/40 bg-black p-2.5 shadow-xl shadow-black/80"
            style={{ top: popoverPos.top, left: popoverPos.left }}
            role="dialog"
            aria-label={`Editar acorde ${editingChord ?? ''}`}
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
                  confirmEdit(editingIndex)
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  closeEditor()
                }
              }}
              onBlur={() => handleBlur(editingIndex)}
              className={`mb-2 w-full rounded border bg-black px-2 py-1.5 font-mono text-sm text-white outline-none ${
                erro
                  ? 'border-red-500'
                  : 'border-[var(--crash-cifra)]/50 focus:border-[var(--crash-cifra)]'
              }`}
              aria-invalid={erro}
              aria-describedby={erro ? `chord-edit-erro-${editingIndex}` : undefined}
            />
            {erro && (
              <p id={`chord-edit-erro-${editingIndex}`} className="mb-2 text-xs text-red-400">
                Acorde inválido
              </p>
            )}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleRemove(editingIndex)}
              className="text-xs text-red-400 hover:underline"
            >
              Remover acorde
            </button>
          </div>,
          document.body,
        )}
    </>
  )
}
