import { Chord, Interval, Note } from 'tonal'
import {
  extractChordsFromLine,
  isValidChordSymbol,
  normalizeChordLine,
  rebuildChordLineFromChords,
} from '@crash-cifras/shared/chord-schema'

/** Spellings por chroma (0=C … 11=B); no máximo 1 acidental por nome. */
const CHROMA_SPELLINGS = [
  ['C'],
  ['C#', 'Db'],
  ['D'],
  ['D#', 'Eb'],
  ['E', 'Fb'],
  ['F', 'E#'],
  ['F#', 'Gb'],
  ['G'],
  ['G#', 'Ab'],
  ['A', 'Bbb'],
  ['A#', 'Bb'],
  ['B', 'Cb'],
]

function keyToNoteName(key) {
  if (!key) return ''
  return key.replace(/m$/i, '')
}

function isMinorKey(key) {
  return /m$/i.test(key || '') && !/maj/i.test(key || '')
}

function countAccidentals(noteName) {
  return (String(noteName).match(/#|b/g) || []).length
}

/**
 * Tons com sustenido no nome → preferir #; com bemol → preferir b.
 * Naturais: F e bemol-side preferem b; demais preferem #.
 * @param {string|null|undefined} tonality
 */
export function keyPreferSharps(tonality) {
  if (!tonality) return true
  const root = keyToNoteName(tonality)
  if (root.includes('#')) return true
  if (root.includes('b')) return false
  if (root === 'F') return false
  return true
}

/**
 * Normaliza nome de nota para no máximo 1 acidental, conforme tonalidade de destino.
 * @param {string} rawNote
 * @param {string|null|undefined} [tonality]
 */
export function normalizeNoteName(rawNote, tonality) {
  if (!rawNote?.trim()) return rawNote
  const info = Note.get(rawNote)
  if (info.empty) return rawNote

  const chroma =
    typeof info.chroma === 'number' && !Number.isNaN(info.chroma)
      ? info.chroma
      : Note.chroma(rawNote)

  if (chroma == null || chroma < 0 || chroma > 11) return rawNote

  let candidates = CHROMA_SPELLINGS[chroma].filter((n) => countAccidentals(n) <= 1)
  if (!candidates.length) return rawNote

  candidates = [...candidates].sort(
    (a, b) => countAccidentals(a) - countAccidentals(b),
  )
  const minAcc = countAccidentals(candidates[0])
  candidates = candidates.filter((n) => countAccidentals(n) === minAcc)

  if (candidates.length === 1) return candidates[0]

  const preferSharps = keyPreferSharps(tonality)
  if (preferSharps) {
    return (
      candidates.find((n) => n.includes('#'))
      || candidates.find((n) => !n.includes('b'))
      || candidates[0]
    )
  }
  return (
    candidates.find((n) => n.includes('b'))
    || candidates.find((n) => !n.includes('#'))
    || candidates[0]
  )
}

/**
 * Normaliza símbolo de acorde (inclui slash) após transpose bruto do Tonal.
 * @param {string} symbol
 * @param {string|null|undefined} [tonality]
 */
export function normalizeChordSymbol(symbol, tonality) {
  if (!symbol?.trim()) return symbol

  const slash = symbol.indexOf('/')
  if (slash !== -1) {
    const head = symbol.slice(0, slash)
    const bass = symbol.slice(slash + 1)
    return `${normalizeChordSymbolHead(head, tonality)}/${normalizeNoteName(bass, tonality)}`
  }

  return normalizeChordSymbolHead(symbol, tonality)
}

function normalizeChordSymbolHead(symbol, tonality) {
  const match = symbol.match(/^([A-G](?:#|b)*)(.*)$/i)
  if (!match) return symbol
  const [, root, suffix] = match
  // Sufixo literal preservado (ex.: 7M → 7M, não maj7).
  return normalizeNoteName(root, tonality) + suffix
}

function transposeNoteOrChord(symbol, interval, tonality) {
  const parsed = Chord.get(symbol)
  if (!parsed.empty) {
    return normalizeChordSymbol(Chord.transpose(symbol, interval), tonality)
  }
  const asNote = Note.get(symbol)
  if (!asNote.empty) {
    return normalizeNoteName(Note.transpose(symbol, interval), tonality)
  }
  // Fallback BR: C#7M etc. — Tonal não parseia; transpõe só a raiz, sufixo intacto.
  const match = String(symbol).match(/^([A-G](?:#|b)?)(.*)$/)
  if (match) {
    const [, root, suffix] = match
    const rootNote = Note.get(root)
    if (!rootNote.empty) {
      return normalizeNoteName(Note.transpose(root, interval), tonality) + suffix
    }
  }
  return symbol
}

/** Normaliza rótulo de tom preservando modo (m) e grafia enarmônica coerente. */
export function normalizeTomKey(key) {
  if (!key?.trim()) return key
  const minor = isMinorKey(key)
  const root = keyToNoteName(key)
  const tonality = minor ? `${root}m` : root
  const spelled = normalizeNoteName(root, tonality)
  return minor ? `${spelled}m` : spelled
}

export function semitonesBetween(fromKey, toKey) {
  if (!fromKey || !toKey) return 0
  const from = Note.get(keyToNoteName(fromKey))
  const to = Note.get(keyToNoteName(toKey))
  if (from.empty || to.empty) return 0
  const dist = Interval.distance(from.name, to.name)
  if (!dist) return 0
  let st = Interval.semitones(dist) ?? 0
  if (st > 6) st -= 12
  if (st < -6) st += 12
  return st
}

/**
 * @param {string} symbol
 * @param {number} semitones
 * @param {{ tonality?: string|null }} [options]
 */
export function transposeChord(symbol, semitones, options = {}) {
  if (!symbol?.trim() || !semitones) return symbol
  const { tonality } = options
  const interval = Interval.fromSemitones(semitones)

  const slash = symbol.indexOf('/')
  if (slash !== -1) {
    const head = symbol.slice(0, slash)
    const bass = symbol.slice(slash + 1)
    return `${transposeNoteOrChord(head, interval, tonality)}/${transposeNoteOrChord(bass, interval, tonality)}`
  }

  return transposeNoteOrChord(symbol, interval, tonality)
}

/**
 * Recalcula posições após transpor para evitar sobreposição quando símbolos mudam de tamanho.
 * @param {{ pos: number, chord: string }[]} chords
 * @param {{ minGap?: number }} [options]
 * @returns {{ pos: number, chord: string }[]}
 */
export function reflowChordPositions(chords, { minGap = 1 } = {}) {
  if (!chords?.length) return []
  const sorted = [...chords].sort((a, b) => a.pos - b.pos)
  let prevPos = -1
  let prevEnd = 0

  return sorted.map((entry) => {
    const chordLen = String(entry.chord || '').length
    const minStart = prevPos >= 0 ? prevEnd + minGap : 0
    const pos = Math.max(entry.pos, minStart)
    prevPos = pos
    prevEnd = pos + chordLen
    return { ...entry, pos }
  })
}

/**
 * @param {import('@crash-cifras/shared/chord-schema').SecaoLinhas} linhas
 * @param {number} semitones
 * @param {{ tonDestino?: string|null }} [options]
 */
export function transposeLinhas(linhas, semitones, options = {}) {
  if (!semitones || !linhas?.lines) return linhas
  const tonality = options.tonDestino ?? null
  const chordOpts = tonality ? { tonality } : {}

  return {
    lines: linhas.lines.map((raw) => {
      const line = normalizeChordLine(raw)
      const chords = reflowChordPositions(
        (line.chords.length ? line.chords : extractChordsFromLine(line.chordLine)).map(
          (c) => ({
            pos: c.pos,
            chord: transposeChord(c.chord, semitones, chordOpts),
          }),
        ),
      )
      const chordLine = rebuildChordLineFromChords(chords)
      return {
        chordLine,
        lyricLine: line.lyricLine,
        chords,
        segments: line.segments.map((seg) => ({
          ...seg,
          chord: seg.chord ? transposeChord(seg.chord, semitones, chordOpts) : seg.chord,
        })),
      }
    }),
  }
}

/**
 * Transpõe só tokens que são acordes válidos; preserva espaços/quebras byte a byte.
 * Na dúvida (token inválido), não transpõe.
 * @param {string|null|undefined} texto
 * @param {number} semitones
 * @param {{ tonDestino?: string|null }} [options]
 */
export function transposeTextoLivre(texto, semitones, options = {}) {
  if (texto == null) return texto
  if (texto === '') return ''
  if (!semitones) return String(texto)

  const tonality = options.tonDestino ?? null
  const chordOpts = tonality ? { tonality } : {}

  return String(texto).replace(/(\S+)|(\s+)/g, (token, word, space) => {
    if (space) return space
    if (!isValidChordSymbol(word)) return word
    return transposeChord(word, semitones, chordOpts)
  })
}

/**
 * Transpõe campos de intro (mãos) token a token.
 * @param {{ mao_esquerda?: string|null, mao_direita?: string|null }|null|undefined} intro
 * @param {number} semitones
 * @param {{ tonDestino?: string|null }} [options]
 */
export function transposeIntro(intro, semitones, options = {}) {
  if (!intro || typeof intro !== 'object') return intro
  return {
    ...intro,
    mao_esquerda: transposeTextoLivre(intro.mao_esquerda, semitones, options),
    mao_direita: transposeTextoLivre(intro.mao_direita, semitones, options),
  }
}

/**
 * Tom para cálculo de graus Nashville (original transposto ou tom exibido da música).
 */
export function tomParaGrausMusica(musica, semitoneOffset, tomDestinoExplicito = null) {
  if (!musica) return null
  const offset = semitoneOffset ?? musica.semitone_offset ?? 0
  return (
    getTomExibido(musica.tom_original, offset, tomDestinoExplicito) ||
    musica.tom_exibido ||
    null
  )
}

/**
 * @param {string|null|undefined} tomOriginal
 * @param {number} [semitoneOffset]
 * @param {string|null|undefined} [tomDestinoExplicito] — tom clicado; prevalece sobre offset
 */
export function getTomExibido(tomOriginal, semitoneOffset = 0, tomDestinoExplicito = null) {
  if (tomDestinoExplicito) return normalizeTomKey(tomDestinoExplicito)
  if (!tomOriginal) return null
  if (!semitoneOffset) return tomOriginal
  const interval = Interval.fromSemitones(semitoneOffset)
  const raw = Note.transpose(keyToNoteName(tomOriginal), interval)
  if (!raw) return tomOriginal
  const minor = isMinorKey(tomOriginal)
  const spelled = normalizeNoteName(raw, minor ? `${raw}m` : raw)
  return minor ? `${spelled}m` : spelled
}

/** Desloca o tom ±N semitons preservando maior/menor. */
export function transposeKey(key, semitones) {
  if (!key?.trim() || !semitones) return key
  const minor = isMinorKey(key)
  const interval = Interval.fromSemitones(semitones)
  const raw = Note.transpose(keyToNoteName(key), interval)
  if (!raw) return key
  const spelled = normalizeNoteName(raw, minor ? `${raw}m` : raw)
  return minor ? `${spelled}m` : spelled
}
