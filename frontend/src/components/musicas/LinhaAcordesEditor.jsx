import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { isValidChordSymbol } from '@crash-cifras/shared/chord-schema'
import { clampChordPos } from '../../lib/cifraEdit'
import { estiloMono } from '../cifra/LinhaPosicionada.jsx'

function chordRangeOverlaps(pos, len, otherPos, otherLen) {
  const end = pos + len
  const otherEnd = otherPos + otherLen
  return pos < otherEnd && otherPos < end
}

function hasOverlapWithOthers(chords, skipIndex, pos, len) {
  return (chords || []).some((c, i) => {
    if (skipIndex != null && i === skipIndex) return false
    return chordRangeOverlaps(pos, len, c.pos, String(c.chord || '').length)
  })
}

export function LinhaAcordesEditor({
  chords,
  lineWidth = 0,
  fonteLetra,
  charWidthPx,
  color,
  fontWeight = 700,
  minCols = 0,
  onChordUpdate,
  onChordRemove,
  onChordMove,
  onChordInsert,
  onEditStart,
}) {
  const [mode, setMode] = useState(null)
  const [editingIndex, setEditingIndex] = useState(null)
  const [insertPos, setInsertPos] = useState(null)
  const [draft, setDraft] = useState('')
  const [erro, setErro] = useState(false)
  const [popoverPos, setPopoverPos] = useState(null)
  const [railHovered, setRailHovered] = useState(false)
  const inputRef = useRef(null)
  const rootRef = useRef(null)
  const popoverRef = useRef(null)
  const chordButtonRefs = useRef({})
  const skipBlurConfirmRef = useRef(false)
  const openedAtRef = useRef(0)

  const effectiveLineWidth = Math.max(lineWidth, minCols, 0)

  const widthCols = Math.max(
    effectiveLineWidth,
    minCols,
    ...chords.map(({ pos, chord }) => pos + (chord?.length || 0)),
    0,
  )

  const closeEditor = useCallback(() => {
    setMode(null)
    setEditingIndex(null)
    setInsertPos(null)
    setDraft('')
    setErro(false)
    setPopoverPos(null)
  }, [])

  const confirmEdit = useCallback(
    (index) => {
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

  const confirmInsert = useCallback(() => {
    const trimmed = draft.trim()
    if (!isValidChordSymbol(trimmed)) {
      setErro(true)
      return
    }

    if (insertPos != null) {
      onChordInsert?.(insertPos, trimmed)
    }
    closeEditor()
  }, [closeEditor, draft, insertPos, onChordInsert])

  const cancelEditor = useCallback(() => {
    skipBlurConfirmRef.current = false
    closeEditor()
  }, [closeEditor])

  const requestConfirm = useCallback(() => {
    if (mode === 'edit' && editingIndex != null) confirmEdit(editingIndex)
    else if (mode === 'insert') confirmInsert()
  }, [confirmEdit, confirmInsert, editingIndex, mode])

  const openEditor = useCallback(
    (index, anchorEl) => {
      onEditStart?.()
      openedAtRef.current = Date.now()
      const rect = anchorEl.getBoundingClientRect()
      setPopoverPos({ top: rect.bottom + 4, left: rect.left })
      setMode('edit')
      setEditingIndex(index)
      setInsertPos(null)
      setDraft(chords[index]?.chord ?? '')
      setErro(false)
    },
    [chords, onEditStart],
  )

  const openInsert = useCallback(
    (pos, clientX, clientY) => {
      onEditStart?.()
      openedAtRef.current = Date.now()
      const clamped = clampChordPos(pos, 0, effectiveLineWidth)
      setPopoverPos({ top: clientY + 4, left: clientX })
      setMode('insert')
      setEditingIndex(null)
      setInsertPos(clamped)
      setDraft('')
      setErro(false)
    },
    [effectiveLineWidth, onEditStart],
  )

  useEffect(() => {
    if (mode === null) return
    const timer = window.setTimeout(() => {
      inputRef.current?.focus()
      if (mode === 'edit') inputRef.current?.select()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [mode, editingIndex, insertPos])

  useEffect(() => {
    if (mode !== 'edit' || editingIndex == null) return
    const btn = chordButtonRefs.current[editingIndex]
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    setPopoverPos({ top: rect.bottom + 4, left: rect.left })
  }, [chords, editingIndex, mode])

  useEffect(() => {
    if (mode === null) return

    function onPointerDown(e) {
      const target = e.target
      if (rootRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      cancelEditor()
    }

    function onScroll() {
      cancelEditor()
    }

    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [cancelEditor, mode])

  function handleBlur() {
    if (Date.now() - openedAtRef.current < 200) return
    if (skipBlurConfirmRef.current) {
      skipBlurConfirmRef.current = false
      return
    }
    cancelEditor()
  }

  function handleRemove(index) {
    skipBlurConfirmRef.current = true
    onChordRemove?.(index)
    closeEditor()
  }

  function handleMove(delta) {
    if (editingIndex == null) return
    skipBlurConfirmRef.current = true
    onChordMove?.(editingIndex, delta)
  }

  function handleRailMouseDown(e) {
    if (e.button !== 0) return
    if (e.target.closest('[data-chord-button]')) return

    e.preventDefault()
    e.stopPropagation()

    const row = rootRef.current
    if (!row) return

    const rect = row.getBoundingClientRect()
    const col = Math.floor((e.clientX - rect.left) / charWidthPx)
    openInsert(col, e.clientX, rect.bottom)
  }

  const editingChord = mode === 'edit' && editingIndex != null ? chords[editingIndex]?.chord : null
  const currentEdit = mode === 'edit' && editingIndex != null ? chords[editingIndex] : null
  const currentPos = currentEdit?.pos ?? insertPos ?? 0
  const currentLen =
    mode === 'edit'
      ? String(currentEdit?.chord || '').length
      : draft.trim().length

  const canMoveLeft = mode === 'edit' && currentPos > 0
  const canMoveRight =
    mode === 'edit' && currentPos + currentLen < effectiveLineWidth

  const showOverlapWarning =
    mode === 'edit' && editingIndex != null
      ? hasOverlapWithOthers(chords, editingIndex, currentPos, currentLen)
      : mode === 'insert' && insertPos != null && currentLen > 0
        ? hasOverlapWithOthers(chords, null, insertPos, currentLen)
        : false

  return (
    <>
      <div
        ref={rootRef}
        data-chord-editor="interactive"
        role="presentation"
        onMouseDown={handleRailMouseDown}
        onMouseEnter={() => setRailHovered(true)}
        onMouseLeave={() => setRailHovered(false)}
        aria-label="Fileira de acordes — clique em área vazia para adicionar acorde"
        className={`relative z-10 m-0 max-w-full cursor-crosshair rounded-sm border transition-colors ${
          railHovered
            ? 'border-dashed border-[var(--crash-cifra)]/30'
            : 'border-transparent'
        }`}
        style={{
          ...estiloMono(fonteLetra, fontWeight),
          minHeight: `${fonteLetra * 1.25}px`,
          minWidth: widthCols > 0 ? widthCols * charWidthPx : charWidthPx,
          color,
        }}
      >
        {chords.map(({ pos, chord }, i) => (
          <div
            key={`${pos}-${chord}-${i}`}
            className="absolute top-0 z-10"
            style={{ left: pos * charWidthPx }}
          >
            <button
              ref={(el) => {
                chordButtonRefs.current[i] = el
              }}
              type="button"
              data-chord-button
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                openEditor(i, e.currentTarget)
              }}
              className="relative z-10 cursor-pointer whitespace-pre border-0 bg-transparent p-0 font-inherit text-inherit underline-offset-2 hover:underline hover:decoration-[var(--crash-cifra)] focus:outline-none focus:ring-1 focus:ring-[var(--crash-cifra)]/50"
              aria-label={`Editar acorde ${chord}`}
              aria-expanded={mode === 'edit' && editingIndex === i}
            >
              {chord}
            </button>
          </div>
        ))}
      </div>

      {mode !== null &&
        popoverPos &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-[200] w-44 rounded-lg border border-[var(--crash-cifra)]/40 bg-black p-2.5 shadow-xl shadow-black/80"
            style={{ top: popoverPos.top, left: popoverPos.left }}
            role="dialog"
            aria-label={
              mode === 'insert'
                ? 'Inserir acorde'
                : `Editar acorde ${editingChord ?? ''}`
            }
          >
            {mode === 'edit' && editingIndex != null && (
              <div className="mb-2 flex items-center justify-between gap-1">
                <button
                  type="button"
                  disabled={!canMoveLeft}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleMove(-1)}
                  className="rounded border border-[var(--crash-cifra)]/40 px-2 py-0.5 font-mono text-xs text-[var(--crash-cifra)] disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Mover acorde uma coluna à esquerda"
                >
                  ◄
                </button>
                <span className="font-mono text-xs text-[var(--crash-texto-sec)]">
                  pos {currentPos}
                </span>
                <button
                  type="button"
                  disabled={!canMoveRight}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleMove(1)}
                  className="rounded border border-[var(--crash-cifra)]/40 px-2 py-0.5 font-mono text-xs text-[var(--crash-cifra)] disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Mover acorde uma coluna à direita"
                >
                  ►
                </button>
              </div>
            )}

            {mode === 'insert' && insertPos != null && (
              <p className="mb-2 font-mono text-xs text-[var(--crash-texto-sec)]">
                pos {insertPos}
              </p>
            )}

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
                  requestConfirm()
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  cancelEditor()
                }
              }}
              onBlur={handleBlur}
              placeholder={mode === 'insert' ? 'Novo acorde…' : undefined}
              className={`mb-2 w-full rounded border bg-black px-2 py-1.5 font-cifra-mono text-sm text-white outline-none ${
                erro
                  ? 'border-red-500'
                  : 'border-[var(--crash-cifra)]/50 focus:border-[var(--crash-cifra)]'
              }`}
              aria-invalid={erro}
              aria-describedby={erro ? 'chord-edit-erro' : undefined}
            />

            {erro && (
              <p id="chord-edit-erro" className="mb-2 text-xs text-red-400">
                Acorde inválido
              </p>
            )}

            {showOverlapWarning && (
              <p className="mb-2 text-xs text-amber-400/90">
                Sobrepõe outro acorde — ajuste com ◄ ►
              </p>
            )}

            {mode === 'edit' && editingIndex != null && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleRemove(editingIndex)}
                className="mb-2 text-xs text-red-400 hover:underline"
              >
                Remover acorde
              </button>
            )}

            <div className="flex items-center justify-end gap-1 border-t border-white/10 pt-2">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={cancelEditor}
                className="flex h-8 w-8 items-center justify-center rounded border border-[var(--crash-borda)] text-sm text-[var(--crash-texto-sec)] transition hover:border-red-400/60 hover:text-red-300"
                aria-label="Cancelar edição do acorde"
              >
                ✕
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={requestConfirm}
                className="flex h-8 w-8 items-center justify-center rounded border border-[var(--crash-cifra)]/60 bg-[var(--crash-cifra)]/15 text-sm font-bold text-[var(--crash-cifra)] transition hover:bg-[var(--crash-cifra)]/25"
                aria-label="Confirmar acorde"
              >
                ✓
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
