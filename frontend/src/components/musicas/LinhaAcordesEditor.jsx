import { useCallback, useEffect, useRef, useState } from 'react'
import { rebuildChordLineFromChords } from '@crash-cifras/shared/chord-schema'
import { normalizeChordBR } from '@crash-cifras/shared/notacao-br'
import {
  validateEditableChordLine,
} from '../../lib/cifraEdit'
import { chordsContentEqual } from '../../lib/editorHistory'
import { estiloMono } from '../cifra/LinhaPosicionada.jsx'

/** Padding/borda idênticos no input e na régua — alinhamento coluna a coluna. */
const SHARED_TEXT_BOX =
  'box-border m-0 block w-full border-0 bg-transparent p-0 outline-none'

export function LinhaAcordesEditor({
  chords,
  lyricLine = '',
  lineWidth = 0,
  fonteLetra,
  charWidthPx,
  color,
  fontWeight = 700,
  minCols = 0,
  onChordsChange,
  onEditStart,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [invalidTokens, setInvalidTokens] = useState([])
  const [railHovered, setRailHovered] = useState(false)
  const inputRef = useRef(null)
  const scrollRef = useRef(null)
  const rootRef = useRef(null)
  const panelRef = useRef(null)
  const openedAtRef = useRef(0)

  const effectiveLineWidth = Math.max(lineWidth, minCols, 0)

  const widthCols = Math.max(
    effectiveLineWidth,
    minCols,
    ...chords.map(({ pos, chord }) => {
      const label = normalizeChordBR(chord) || ''
      return pos + label.length
    }),
    String(lyricLine || '').length,
    String(draft || '').length,
    0,
  )

  const monoStyle = {
    ...estiloMono(fonteLetra, fontWeight),
    color,
    minWidth: widthCols > 0 ? widthCols * charWidthPx : charWidthPx,
  }

  const closeEditor = useCallback(() => {
    setEditing(false)
    setDraft('')
    setInvalidTokens([])
  }, [])

  const cancelEditor = useCallback(() => {
    closeEditor()
  }, [closeEditor])

  const openEditor = useCallback(() => {
    onEditStart?.()
    openedAtRef.current = Date.now()
    setDraft(rebuildChordLineFromChords(chords || []))
    setInvalidTokens([])
    setEditing(true)
  }, [chords, onEditStart])

  const requestConfirm = useCallback(() => {
    const result = validateEditableChordLine(draft)
    if (!result.ok) {
      setInvalidTokens(result.invalidTokens)
      return
    }
    if (!chordsContentEqual(chords, result.chords)) {
      onChordsChange?.(result.chords)
    }
    closeEditor()
  }, [chords, closeEditor, draft, onChordsChange])

  useEffect(() => {
    if (!editing) return
    const timer = window.setTimeout(() => {
      const el = inputRef.current
      if (!el) return
      el.focus()
      el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [editing])

  useEffect(() => {
    if (!editing) return

    function onPointerDown(e) {
      const target = e.target
      if (rootRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      cancelEditor()
    }

    function onScroll(e) {
      // Ignora scroll gerado pelo scrollIntoView ao abrir.
      if (Date.now() - openedAtRef.current < 400) return
      // Scroll horizontal do próprio input/régua não cancela.
      if (scrollRef.current?.contains(e.target)) return
      if (panelRef.current?.contains(e.target)) return
      cancelEditor()
    }

    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [cancelEditor, editing])

  if (editing) {
    return (
      <div ref={rootRef} className="relative z-10">
        <div
          ref={panelRef}
          className="rounded-lg border border-[var(--crash-cifra)]/40 bg-black/95 p-2 shadow-xl shadow-black/60"
          role="dialog"
          aria-label="Editar linha de acordes"
        >
          {/* Scroll único: input e régua se movem juntos */}
          <div
            ref={scrollRef}
            className="overflow-x-auto overflow-y-hidden"
          >
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                setInvalidTokens([])
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
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              inputMode="text"
              className={`${SHARED_TEXT_BOX} font-cifra-mono leading-snug ${
                invalidTokens.length ? 'text-red-300' : ''
              }`}
              style={monoStyle}
              aria-invalid={invalidTokens.length > 0}
              aria-describedby={
                invalidTokens.length ? 'chord-line-edit-erro' : undefined
              }
              placeholder="Acordes… (espaços = posição)"
            />
            <div
              aria-hidden
              className={`${SHARED_TEXT_BOX} pointer-events-none mt-0.5 select-none whitespace-pre font-cifra-mono leading-snug text-[var(--crash-texto-sec)]/80`}
              style={{
                ...monoStyle,
                color: undefined,
              }}
            >
              {lyricLine || '\u00a0'}
            </div>
          </div>

          {invalidTokens.length > 0 && (
            <p id="chord-line-edit-erro" className="mt-2 text-xs text-red-400" role="alert">
              Acorde inválido: {invalidTokens.join(', ')}
            </p>
          )}

          <div className="mt-2 flex items-center justify-end gap-1 border-t border-white/10 pt-2">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={cancelEditor}
              className="flex h-9 w-9 items-center justify-center rounded border border-[var(--crash-borda)] text-base text-[var(--crash-texto-sec)] transition hover:border-red-400/60 hover:text-red-300"
              aria-label="Cancelar edição da linha de acordes"
            >
              ✕
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={requestConfirm}
              className="flex h-9 w-9 items-center justify-center rounded border border-[var(--crash-cifra)]/60 bg-[var(--crash-cifra)]/15 text-lg font-bold text-[var(--crash-cifra)] transition hover:bg-[var(--crash-cifra)]/25"
              aria-label="Confirmar linha de acordes"
            >
              ✓
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      data-chord-editor="interactive"
      role="button"
      tabIndex={0}
      onClick={openEditor}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          openEditor()
        }
      }}
      onMouseEnter={() => setRailHovered(true)}
      onMouseLeave={() => setRailHovered(false)}
      aria-label="Linha de acordes — toque para editar"
      className={`relative z-10 m-0 max-w-full cursor-text rounded-sm border transition-colors ${
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
      {chords.length === 0 ? (
        <span className="pointer-events-none text-xs text-[var(--crash-texto-sec)]/50">
          Toque para adicionar acordes
        </span>
      ) : (
        chords.map(({ pos, chord }, i) => (
          <div
            key={`${pos}-${chord}-${i}`}
            className="pointer-events-none absolute top-0 z-10 whitespace-pre"
            style={{ left: pos * charWidthPx }}
          >
            {normalizeChordBR(chord)}
          </div>
        ))
      )}
    </div>
  )
}

/** Exportado para testes — mesma tokenização do confirm. */
export { validateEditableChordLine }
