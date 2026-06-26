import { rebuildChordLineFromChords } from '@crash-cifras/shared/chord-schema'

/**
 * Recalcula `pos` dos acordes após edição da letra na mesma linha.
 * Usa prefixo/sufixo comum + delta na região editada.
 * @param {string} oldLyric
 * @param {string} newLyric
 * @param {{ pos: number, chord: string }[]} chords
 * @returns {{ pos: number, chord: string }[]}
 */
export function adjustChordsAfterLyricEdit(oldLyric, newLyric, chords) {
  if (!chords?.length) return []
  if (oldLyric === newLyric) return chords.map((c) => ({ ...c }))

  const oldLen = oldLyric.length
  const newLen = newLyric.length

  let prefix = 0
  while (prefix < oldLen && prefix < newLen && oldLyric[prefix] === newLyric[prefix]) {
    prefix++
  }

  let oldSuffix = 0
  let newSuffix = 0
  while (
    oldSuffix < oldLen - prefix &&
    newSuffix < newLen - prefix &&
    oldLyric[oldLen - 1 - oldSuffix] === newLyric[newLen - 1 - newSuffix]
  ) {
    oldSuffix++
    newSuffix++
  }

  const editStart = prefix
  const editEnd = oldLen - oldSuffix
  const delta = newLen - prefix - newSuffix - (oldLen - prefix - oldSuffix)

  return chords.map(({ pos, chord }) => {
    const chordLen = String(chord || '').length
    let newPos = pos

    if (pos + chordLen <= editStart) {
      newPos = pos
    } else if (pos >= editEnd) {
      newPos = pos + delta
    } else {
      newPos = editStart
    }

    const maxPos = Math.max(0, newLen - chordLen)
    newPos = Math.max(0, Math.min(newPos, maxPos))

    return { pos: newPos, chord }
  })
}

/**
 * Serializa linha canônica para persistência em secoes_musica.linhas.
 * @param {string} lyricLine
 * @param {{ pos: number, chord: string }[]} chords
 */
export function serializeChordLine(lyricLine, chords) {
  const safeChords = chords || []
  return {
    lyricLine,
    chords: safeChords,
    chordLine: rebuildChordLineFromChords(safeChords),
    segments: [{ text: lyricLine }],
  }
}

/** Linha vazia (nova linha no editor). */
export function emptyChordLine() {
  return serializeChordLine('', [])
}
