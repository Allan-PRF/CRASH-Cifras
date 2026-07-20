import { useState } from 'react'
import {
  adjustChordsAfterLyricEdit,
  emptyChordLine,
  serializeChordLine,
  splitChordLineAt,
} from '../../lib/cifraEdit'
import { linhasContentEqual } from '../../lib/editorHistory'
import { btnSecondaryClassName } from '../ui/inputClasses'
import { CifraLinhaEditor } from './CifraLinhaEditor.jsx'

export function CifraSecaoEditorVisual({
  linhas,
  onChange,
  onEditStart,
  variant = 'card',
}) {
  const isFolha = variant === 'folha'
  const lines = linhas?.lines ?? []
  const [focusLineIndex, setFocusLineIndex] = useState(null)

  function emitLines(nextLines) {
    const next = { lines: nextLines }
    if (linhasContentEqual(linhas, next)) return
    onChange(next)
  }

  function updateLine(index, nextLine) {
    const next = [...lines]
    next[index] = nextLine
    emitLines(next)
  }

  function handleLyricChange(index, newLyric) {
    const current = lines[index]
    const oldLyric = String(current?.lyricLine ?? '')
    const chords = current?.chords ?? []
    const adjusted = adjustChordsAfterLyricEdit(oldLyric, newLyric, chords)
    updateLine(index, serializeChordLine(newLyric, adjusted))
  }

  function handleRemoveLine(index) {
    emitLines(lines.filter((_, i) => i !== index))
  }

  function handleInsertLineAfter(index) {
    const next = [...lines]
    next.splice(index + 1, 0, emptyChordLine())
    emitLines(next)
  }

  /** Linha só de acordes (lyricLine vazia) no topo — “linha laranja”. */
  function handleAddLineAtTop() {
    onEditStart?.()
    emitLines([emptyChordLine(), ...lines])
  }

  function handleAddLine() {
    onEditStart?.()
    emitLines([...lines, emptyChordLine()])
  }

  function handleChordsChange(index, newChords) {
    const current = lines[index]
    const lyric = String(current?.lyricLine ?? '')
    updateLine(index, serializeChordLine(lyric, newChords))
  }

  function handleSplitLine(index, splitIndex) {
    const result = splitChordLineAt(lines[index], splitIndex)
    if (!result.ok) return
    const next = [...lines]
    next[index] = result.line1
    next.splice(index + 1, 0, result.line2)
    emitLines(next)
    setFocusLineIndex(index + 1)
  }

  const addLineButtonClass = isFolha
    ? `${btnSecondaryClassName} !px-2.5 !py-1.5 text-xs`
    : btnSecondaryClassName

  return (
    <div className={isFolha ? 'max-w-full space-y-0.5 overflow-x-auto' : 'space-y-2'}>
      <button type="button" onClick={handleAddLineAtTop} className={addLineButtonClass}>
        + Adicionar linha
      </button>

      {lines.length === 0 ? (
        <p className="py-2 text-sm text-[var(--crash-texto-sec)]">
          Nenhuma linha nesta seção. Use o botão acima ou abaixo para começar.
        </p>
      ) : (
        lines.map((line, index) => (
          <CifraLinhaEditor
            key={`line-${index}`}
            line={line}
            variant={variant}
            onLyricChange={(newLyric) => handleLyricChange(index, newLyric)}
            onRemove={() => handleRemoveLine(index)}
            onInsertLineAfter={() => handleInsertLineAfter(index)}
            onSplitLine={
              isFolha ? (splitIndex) => handleSplitLine(index, splitIndex) : undefined
            }
            focusLyric={focusLineIndex === index}
            onLyricFocused={() => {
              if (focusLineIndex === index) setFocusLineIndex(null)
            }}
            onEditStart={onEditStart}
            editableChords={isFolha}
            onChordsChange={
              isFolha ? (newChords) => handleChordsChange(index, newChords) : undefined
            }
            canRemove
          />
        ))
      )}

      <button type="button" onClick={handleAddLine} className={addLineButtonClass}>
        + Adicionar linha
      </button>
    </div>
  )
}
