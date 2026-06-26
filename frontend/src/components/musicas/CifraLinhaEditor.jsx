import { useMemo } from 'react'
import { normalizeChordLine } from '@crash-cifras/shared/chord-schema'
import { LinhaPosicionada } from '../cifra/LinhaPosicionada.jsx'
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
  canRemove = true,
}) {
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

  return (
    <div className="group rounded-lg border border-[var(--crash-borda)]/60 bg-black/50 p-2">
      <div className="mb-1 flex items-start justify-end gap-2">
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

      {chords.length > 0 && (
        <LinhaPosicionada
          items={chordItems}
          fonteLetra={FONTE_ACORDE}
          charWidthPx={chordCharWidthPx}
          color={tema.cores.cifra}
          fontWeight={tema.teleprompter.cifra.fontWeight}
          minCols={minCols}
        />
      )}

      <textarea
        value={lyricLine}
        onChange={(e) => onLyricChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        spellCheck
        className={`${inputOrangeClassName} mt-0.5 w-full resize-none overflow-x-auto font-mono text-base leading-snug`}
        style={{
          minWidth: minCols > 0 ? minCols * lyricCharWidthPx : undefined,
        }}
        placeholder="Letra desta linha…"
        aria-label="Letra da linha"
      />
    </div>
  )
}
