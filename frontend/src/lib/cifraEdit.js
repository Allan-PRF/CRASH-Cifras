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

/**
 * Troca símbolo do acorde; `pos` inalterado.
 * @param {{ pos: number, chord: string }[]} chords
 * @param {number} index
 * @param {string} newSymbol
 */
export function updateChordSymbol(chords, index, newSymbol) {
  const symbol = String(newSymbol ?? '').trim()
  return (chords || []).map((c, i) =>
    i === index ? { pos: c.pos, chord: symbol } : { ...c },
  )
}

/**
 * Remove acorde; `pos` dos demais inalterado.
 * @param {{ pos: number, chord: string }[]} chords
 * @param {number} index
 */
export function removeChordAt(chords, index) {
  return (chords || []).filter((_, i) => i !== index)
}

/**
 * Largura da linha em colunas monospace (letra + extensão dos acordes).
 * @param {string} lyricLine
 * @param {{ pos: number, chord: string }[]} chords
 */
export function lineWidthForChords(lyricLine, chords) {
  const fromChords = (chords || []).reduce(
    (max, { pos, chord }) => Math.max(max, pos + (chord?.length || 0)),
    0,
  )
  return Math.max(String(lyricLine ?? '').length, fromChords)
}

/**
 * Limita `pos` aos bounds da linha.
 * @param {number} pos
 * @param {number} chordLen
 * @param {number} lineWidth
 */
export function clampChordPos(pos, chordLen, lineWidth) {
  const len = Math.max(0, Number(chordLen) || 0)
  const width = Math.max(0, Number(lineWidth) || 0)
  const maxPos = Math.max(0, width - len)
  return Math.max(0, Math.min(Math.round(Number(pos) || 0), maxPos))
}

/**
 * Move acorde `index` por `delta` colunas; só altera o `pos` dele.
 * @param {{ pos: number, chord: string }[]} chords
 * @param {number} index
 * @param {number} delta
 * @param {number} lineWidth
 */
export function moveChordPos(chords, index, delta, lineWidth) {
  const list = chords || []
  const current = list[index]
  if (!current) return list.map((c) => ({ ...c }))

  const chordLen = String(current.chord || '').length
  const newPos = clampChordPos(current.pos + delta, chordLen, lineWidth)
  return list.map((c, i) => (i === index ? { pos: newPos, chord: c.chord } : { ...c }))
}

/**
 * Insere acorde novo; não reordena nem empurra os demais.
 * @param {{ pos: number, chord: string }[]} chords
 * @param {number} pos
 * @param {string} symbol
 * @param {number} lineWidth
 */
export function insertChordAt(chords, pos, symbol, lineWidth) {
  const chord = String(symbol ?? '').trim()
  const clamped = clampChordPos(pos, chord.length, lineWidth)
  return [...(chords || []), { pos: clamped, chord }]
}
