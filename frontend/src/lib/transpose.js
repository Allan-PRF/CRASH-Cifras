import { Chord, Interval, Note } from 'tonal'
import { extractChordsFromLine, normalizeChordLine } from '@crash-cifras/shared/chord-schema'

function keyToNoteName(key) {
  if (!key) return ''
  return key.replace(/m$/i, '')
}

function isMinorKey(key) {
  return /m$/i.test(key || '') && !/maj/i.test(key || '')
}

export function semitonesBetween(fromKey, toKey) {
  if (!fromKey || !toKey) return 0
  const from = Note.get(keyToNoteName(fromKey))
  const to = Note.get(keyToNoteName(toKey))
  if (from.empty || to.empty) return 0
  const dist = Interval.distance(from.name, to.name)
  if (!dist) return 0
  return Interval.semitones(dist) ?? 0
}

export function transposeChord(symbol, semitones) {
  if (!symbol?.trim() || !semitones) return symbol
  const interval = Interval.fromSemitones(semitones)
  const parsed = Chord.get(symbol)
  if (!parsed.empty) {
    return Chord.transpose(symbol, interval)
  }
  const asNote = Note.get(symbol)
  if (!asNote.empty) {
    return Note.transpose(symbol, interval)
  }
  return symbol
}

function rebuildChordLine(chords) {
  if (!chords.length) return ''
  const width = Math.max(...chords.map((c) => c.pos + c.chord.length))
  const chars = Array(width).fill(' ')
  for (const { pos, chord } of chords) {
    for (let i = 0; i < chord.length && pos + i < width; i++) {
      chars[pos + i] = chord[i]
    }
  }
  return chars.join('').replace(/\s+$/, '')
}

/**
 * @param {import('@crash-cifras/shared/chord-schema').SecaoLinhas} linhas
 * @param {number} semitones
 */
export function transposeLinhas(linhas, semitones) {
  if (!semitones || !linhas?.lines) return linhas
  return {
    lines: linhas.lines.map((raw) => {
      const line = normalizeChordLine(raw)
      const chords = (line.chords.length ? line.chords : extractChordsFromLine(line.chordLine))
        .map((c) => ({
          pos: c.pos,
          chord: transposeChord(c.chord, semitones),
        }))
      const chordLine = rebuildChordLine(chords)
      return {
        chordLine,
        lyricLine: line.lyricLine,
        chords,
        segments: line.segments.map((seg) => ({
          ...seg,
          chord: seg.chord ? transposeChord(seg.chord, semitones) : seg.chord,
        })),
      }
    }),
  }
}

/**
 * Tom para cálculo de graus Nashville (original transposto ou tom exibido da música).
 */
export function tomParaGrausMusica(musica, semitoneOffset) {
  if (!musica) return null
  const offset = semitoneOffset ?? musica.semitone_offset ?? 0
  return (
    getTomExibido(musica.tom_original, offset) ||
    musica.tom_exibido ||
    null
  )
}

export function getTomExibido(tomOriginal, semitoneOffset = 0) {
  if (!tomOriginal) return null
  if (!semitoneOffset) return tomOriginal
  const interval = Interval.fromSemitones(semitoneOffset)
  const next = Note.transpose(keyToNoteName(tomOriginal), interval)
  if (!next) return tomOriginal
  return isMinorKey(tomOriginal) ? `${next}m` : next
}

/** Desloca o tom ±N semitons preservando maior/menor. */
export function transposeKey(key, semitones) {
  if (!key?.trim() || !semitones) return key
  const minor = isMinorKey(key)
  const interval = Interval.fromSemitones(semitones)
  const next = Note.transpose(keyToNoteName(key), interval)
  if (!next) return key
  return minor ? `${next}m` : next
}
