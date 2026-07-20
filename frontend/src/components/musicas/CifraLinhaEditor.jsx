import { useEffect, useMemo, useRef, useState } from 'react'
import { useCifraMonoFontReady } from '../../hooks/useCifraMonoFontReady'
import { normalizeChordLine } from '@crash-cifras/shared/chord-schema'
import { LinhaPosicionada } from '../cifra/LinhaPosicionada.jsx'
import { LinhaAcordesEditor } from './LinhaAcordesEditor.jsx'
import { measureMonoCharWidth } from '../../lib/monoCharWidth'
import { tema } from '../../lib/tema'
import { inputOrangeClassName } from '../ui/inputClasses'

const FONTE_ACORDE = 14
const FONTE_LETRA = 16

export function CifraLinhaEditor({
  line,
  onLyricChange,
  onRemove,
  onInsertLineAfter,
  onSplitLine,
  focusLyric = false,
  onLyricFocused,
  onEditStart,
  onChordsChange,
  editableChords: editableChordsProp,
  canRemove = true,
  variant = 'card',
}) {
  const isFolha = variant === 'folha'
  const editableChords = editableChordsProp ?? isFolha
  const lyricRef = useRef(null)
  const [selection, setSelection] = useState({ start: 0, end: 0 })
  const { lyricLine, chords } = useMemo(() => normalizeChordLine(line), [line])
  const monoFontReady = useCifraMonoFontReady()

  const chordCharWidthPx = useMemo(
    () => measureMonoCharWidth(FONTE_ACORDE, tema.teleprompter.cifra.fontWeight),
    [monoFontReady],
  )

  const lyricCharWidthPx = useMemo(
    () => measureMonoCharWidth(FONTE_LETRA, 400),
    [monoFontReady],
  )

  const chordItems = useMemo(
    () => chords.map(({ pos, chord }) => ({ pos, text: chord })),
    [chords],
  )

  const minCols = useMemo(() => {
    const fromChords = chords.reduce(
      (max, { pos, chord }) => Math.max(max, pos + (chord?.length || 0)),
      0,
    )
    return Math.max(lyricLine.length, fromChords)
  }, [chords, lyricLine])

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onInsertLineAfter?.()
    }
  }

  function syncSelectionFromTextarea() {
    const el = lyricRef.current
    if (!el) return
    setSelection({ start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 })
  }

  function handleFocus() {
    onEditStart?.()
    syncSelectionFromTextarea()
  }

  const canSplitHere =
    Boolean(onSplitLine) &&
    lyricLine.length > 0 &&
    selection.start === selection.end &&
    selection.start < lyricLine.length

  useEffect(() => {
    if (!focusLyric || !lyricRef.current) return
    const el = lyricRef.current
    el.focus()
    el.setSelectionRange(0, 0)
    setSelection({ start: 0, end: 0 })
    onLyricFocused?.()
  }, [focusLyric, onLyricFocused])

  function handleSplitClick() {
    if (!onSplitLine || !canSplitHere) return
    onEditStart?.()
    onSplitLine(selection.start)
  }

  const showLineActions = isFolha && (canRemove || onSplitLine)

  return (
    <div
      className={
        isFolha
          ? 'group relative max-w-full overflow-x-auto overflow-y-visible'
          : 'group rounded-lg border border-[var(--crash-borda)]/60 bg-black/50 p-2'
      }
    >
      {showLineActions && (
        <div className="mb-0.5 flex justify-end gap-3 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          {onSplitLine && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleSplitClick}
              disabled={!canSplitHere}
              className="shrink-0 text-xs text-[var(--crash-texto-sec)] opacity-70 hover:text-[var(--crash-cifra)] hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Dividir linha no cursor"
              title="Dividir linha no cursor (posicione o cursor no meio da letra)"
            >
              ✂ Dividir
            </button>
          )}
          {canRemove && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="shrink-0 text-xs text-red-400 opacity-70 hover:opacity-100 hover:underline"
              aria-label="Remover linha"
            >
              Remover linha
            </button>
          )}
        </div>
      )}
      {canRemove && onRemove && !isFolha && (
        <div className="mb-1 flex items-start justify-end gap-2">
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 text-xs text-red-400 opacity-70 hover:opacity-100 hover:underline"
            aria-label="Remover linha"
          >
            Remover linha
          </button>
        </div>
      )}

      {editableChords ? (
        <LinhaAcordesEditor
          chords={chords}
          lyricLine={lyricLine}
          lineWidth={minCols}
          fonteLetra={FONTE_ACORDE}
          charWidthPx={chordCharWidthPx}
          color={tema.cores.cifra}
          fontWeight={tema.teleprompter.cifra.fontWeight}
          minCols={minCols}
          onEditStart={onEditStart}
          onChordsChange={(nextChords) => onChordsChange?.(nextChords)}
        />
      ) : (
        chords.length > 0 && (
          <LinhaPosicionada
            items={chordItems}
            fonteLetra={FONTE_ACORDE}
            charWidthPx={chordCharWidthPx}
            color={tema.cores.cifra}
            fontWeight={tema.teleprompter.cifra.fontWeight}
            minCols={minCols}
          />
        )
      )}

      <textarea
        ref={lyricRef}
        value={lyricLine}
        onChange={(e) => onLyricChange(e.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onSelect={syncSelectionFromTextarea}
        onKeyUp={syncSelectionFromTextarea}
        onClick={syncSelectionFromTextarea}
        rows={1}
        spellCheck={false}
        className={
          isFolha
            ? 'relative z-0 mt-0.5 w-full resize-none overflow-x-auto border-0 border-b border-white/10 bg-transparent font-cifra-mono text-base leading-snug text-white outline-none placeholder:text-[var(--crash-texto-sec)] focus:border-[var(--crash-cifra)]/50'
            : `${inputOrangeClassName} mt-0.5 w-full resize-none overflow-x-auto font-cifra-mono text-base leading-snug`
        }
        style={{
          minWidth: minCols > 0 ? minCols * lyricCharWidthPx : undefined,
        }}
        placeholder="Letra desta linha…"
        aria-label="Letra da linha"
      />
    </div>
  )
}
