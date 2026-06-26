import {
  adjustChordsAfterLyricEdit,
  emptyChordLine,
  serializeChordLine,
} from '../../lib/cifraEdit'
import { btnSecondaryClassName } from '../ui/inputClasses'
import { CifraLinhaEditor } from './CifraLinhaEditor.jsx'

export function CifraSecaoEditorVisual({ linhas, onChange }) {
  const lines = linhas?.lines ?? []

  function emitLines(nextLines) {
    onChange({ lines: nextLines })
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

  function handleAddLine() {
    emitLines([...lines, emptyChordLine()])
  }

  return (
    <div className="space-y-2">
      {lines.length === 0 ? (
        <p className="text-sm text-[var(--crash-texto-sec)]">
          Nenhuma linha nesta seção. Adicione uma linha para começar.
        </p>
      ) : (
        lines.map((line, index) => (
          <CifraLinhaEditor
            key={`line-${index}`}
            line={line}
            onLyricChange={(newLyric) => handleLyricChange(index, newLyric)}
            onRemove={() => handleRemoveLine(index)}
            onInsertLineAfter={() => handleInsertLineAfter(index)}
            canRemove
          />
        ))
      )}

      <button type="button" onClick={handleAddLine} className={btnSecondaryClassName}>
        + Adicionar linha
      </button>
    </div>
  )
}
