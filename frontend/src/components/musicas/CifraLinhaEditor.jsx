import { useMemo } from 'react'
import { normalizeChordLine } from '@crash-cifras/shared/chord-schema'
import { LinhaPosicionada } from '../cifra/LinhaPosicionada.jsx'
import { LinhaAcordesEditor } from './LinhaAcordesEditor.jsx'
import { measureMonoCharWidth } from '../../lib/monoCharWidth'
import { removeChordAt, updateChordSymbol } from '../../lib/cifraEdit'
import { tema } from '../../lib/tema'
import { inputOrangeClassName } from '../ui/inputClasses'

const FONTE_ACORDE = 14
const FONTE_LETRA = 16

export function CifraLinhaEditor({
  line,
  onLyricChange,
  onRemove,
  onInsertLineAfter,
  onEditStart,
  onChordsChange,
  editableChords: editableChordsProp,
  canRemove = true,
  variant = 'card',
}) {
  const isFolha = variant === 'folha'
  const editableChords = editableChordsProp ?? isFolha
  const { lyricLine, chords } = useMemo(() => normalizeChordLine(line), [line])

  const chordCharWidthPx = useMemo(
    () => measureMonoCharWidth(FONTE_ACORDE, tema.teleprompter.cifra.fontWeight),
    [],
  )

  const lyricCharWidthPx = useMemo(
    () => measureMonoCharWidth(FONTE_LETRA, 400),
    [],
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

  function handleFocus() {
    onEditStart?.()
  }

  return (
    <div
      className={
        isFolha
          ? 'group relative max-w-full overflow-x-auto overflow-y-visible'
          : 'group rounded-lg border border-[var(--crash-borda)]/60 bg-black/50 p-2'
      }
    >
      {canRemove && onRemove && (
        <div
          className={
            isFolha
              ? 'mb-0.5 flex justify-end opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100'
              : 'mb-1 flex items-start justify-end gap-2'
          }
        >
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

      {chords.length > 0 &&
        (editableChords ? (
          <LinhaAcordesEditor
            chords={chords}
            fonteLetra={FONTE_ACORDE}
            charWidthPx={chordCharWidthPx}
            color={tema.cores.cifra}
            fontWeight={tema.teleprompter.cifra.fontWeight}
            minCols={minCols}
            onEditStart={onEditStart}
            onChordUpdate={(chordIndex, newSymbol) => {
              onChordsChange?.(
                updateChordSymbol(chords, chordIndex, newSymbol),
              )
            }}
            onChordRemove={(chordIndex) => {
              onChordsChange?.(removeChordAt(chords, chordIndex))
            }}
          />
        ) : (
          <LinhaPosicionada
            items={chordItems}
            fonteLetra={FONTE_ACORDE}
            charWidthPx={chordCharWidthPx}
            color={tema.cores.cifra}
            fontWeight={tema.teleprompter.cifra.fontWeight}
            minCols={minCols}
          />
        ))}

      <textarea
        value={lyricLine}
        onChange={(e) => onLyricChange(e.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        rows={1}
        spellCheck
        className={
          isFolha
            ? 'relative z-0 mt-0.5 w-full resize-none overflow-x-auto border-0 border-b border-white/10 bg-transparent font-mono text-base leading-snug text-white outline-none placeholder:text-[var(--crash-texto-sec)] focus:border-[var(--crash-cifra)]/50'
            : `${inputOrangeClassName} mt-0.5 w-full resize-none overflow-x-auto font-mono text-base leading-snug`
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
