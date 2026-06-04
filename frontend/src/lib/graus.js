import { Chord, Key, Note } from 'tonal'
import { extractChordsFromLine, normalizeChordLine } from '@crash-cifras/shared/chord-schema'

const TONICAS_MAIOR = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const ACORDE_ENTRE_COLCHETES_RE =
  /\[(?:[A-G][#b]?(?:m|maj|min|M|dim|aug|sus|add|°|º|\+)?[0-9]*(?:\/[A-G][#b]?)?)\]/gi

function tonicBase(tom) {
  if (!tom) return ''
  const n = Note.get(tom)
  if (!n.empty) return n.pc || tom.replace(/m$/, '')
  return tom.replace(/m$/, '').replace(/maj$/i, '')
}

function isTomMenor(tom) {
  if (!tom) return false
  return /m$/.test(tom) && !/maj/i.test(tom)
}

function chordTonic(chordName) {
  const c = Chord.get(chordName)
  if (c.empty) return null
  return c.tonic
}

/**
 * Simplifica símbolo para cálculo de grau (não altera cifra exibida).
 * 1. Remove baixo (Eb9/G → Eb9)
 * 2. Remove extensões numéricas (Bbm9 → Bbm, Eb9 → Eb)
 * @param {string} chord
 */
export function simplificarAcorde(chord) {
  let s = String(chord || '').trim()
  if (!s) return ''

  s = s.replace(/\/.*$/, '').trim()
  s = s.replace(/[0-9]+.*$/, '').trim()

  const m = s.match(/^([a-g])([#b]?)(.*)$/i)
  if (m) {
    s = `${m[1].toUpperCase()}${m[2] || ''}${m[3] || ''}`
  }

  return s
}

function stripSlashBass(symbol) {
  return String(symbol || '').trim().replace(/\/.*$/, '').trim()
}

/**
 * Candidatos para Tonal / escala (simplificado primeiro).
 * @param {string} symbol
 * @returns {string[]}
 */
export function chordVariantsForGrau(symbol) {
  const raw = String(symbol || '').trim()
  if (!raw) return []

  const simple = simplificarAcorde(raw)
  const out = new Set([simple])

  if (/sus/i.test(simple)) {
    const root = simple.match(/^([A-G][#b]?)/i)?.[1]
    if (root) out.add(root)
  }

  for (const candidate of [...out]) {
    const tonal = Chord.get(candidate)
    if (!tonal.empty) {
      if (tonal.name) out.add(tonal.name)
      if (tonal.tonic) {
        const t = tonal.tonic
        const q = String(tonal.quality || '')
        if (q.includes('diminished')) out.add(`${t}dim`)
        else if (q.includes('augmented')) out.add(`${t}aug`)
        else if (q.includes('minor') || q === 'm') out.add(`${t}m`)
        else out.add(t)
      }
    }
  }

  return [...out].filter(Boolean)
}

function pitchClassFromSymbol(symbol) {
  const t = chordTonic(symbol)
  if (t) {
    const pc = Note.pitchClass(t)
    if (pc) return pc
  }
  const m = String(symbol || '').match(/^([A-G][#b]?)/i)
  if (m) {
    const n = Note.get(m[1])
    if (!n.empty && n.pc) return n.pc
  }
  return null
}

/** Classe de altura para grau (acorde simplificado + fallbacks Tonal). */
function pitchClassForGrau(chordName) {
  const simple = simplificarAcorde(chordName)
  if (simple) {
    const pc = pitchClassFromSymbol(simple)
    if (pc) return pc
  }

  for (const variant of chordVariantsForGrau(chordName)) {
    const pc = pitchClassFromSymbol(variant)
    if (pc) return pc
  }
  return null
}

function chordQualityFromSymbol(symbol) {
  const origHead = stripSlashBass(symbol)
  const head = simplificarAcorde(symbol)
  let parsed = Chord.get(head)
  if (parsed.empty) {
    for (const variant of chordVariantsForGrau(symbol)) {
      parsed = Chord.get(variant)
      if (!parsed.empty) break
    }
  }

  if (!parsed.empty) {
    return {
      diminished: parsed.quality === 'diminished',
      augmented: parsed.quality === 'augmented',
      has7: Boolean(parsed.intervals?.includes('7')) || /7/.test(origHead),
    }
  }

  return {
    diminished: /dim|°|º/i.test(origHead),
    augmented: /aug|\+/i.test(origHead) && !/sus/i.test(origHead),
    has7: /7/.test(origHead),
  }
}

function indiceAcordeNaEscala(acorde, tomDaMusica) {
  const alvo = pitchClassForGrau(acorde)
  if (!alvo || !tomDaMusica) return -1

  const menores = isTomMenor(tomDaMusica)
  const base = tonicBase(tomDaMusica)
  const keyData = menores ? Key.minorKey(base) : Key.majorKey(base)
  const chords = keyData.chords || []

  return chords.findIndex((c) => {
    const pc = pitchClassFromSymbol(c)
    if (!pc) return false
    const alvoNote = Note.get(alvo)
    const pcNote = Note.get(pc)
    if (!alvoNote.empty && !pcNote.empty) {
      return Note.midi(alvoNote.name + '4') === Note.midi(pcNote.name + '4')
    }
    return pc === alvo
  })
}

/**
 * Infere o tom a partir dos acordes escritos na linha (ex.: C G Am F → C).
 */
export function inferTomFromChords(chordNames) {
  const names = (chordNames || []).filter((n) => n?.trim())
  if (!names.length) return null

  let best = { tom: null, score: 0 }

  for (const base of TONICAS_MAIOR) {
    for (const minor of [false, true]) {
      const tom = minor ? `${base}m` : base
      let score = 0
      for (const name of names) {
        if (indiceAcordeNaEscala(name, tom) >= 0) score += 1
      }
      if (score > best.score) best = { tom, score }
    }
  }

  return best.tom
}

/**
 * Tom para graus: usa o configurado se combinar com os acordes; senão infere da linha.
 */
export function resolveTomParaGraus(tomConfigurado, chordNames) {
  const names = (chordNames || []).filter((n) => n?.trim())
  if (!names.length) return tomConfigurado || null

  const inferred = inferTomFromChords(names)
  if (!tomConfigurado) return inferred
  if (!inferred) return tomConfigurado

  const scoreTom = names.filter((n) => indiceAcordeNaEscala(n, tomConfigurado) >= 0).length
  const scoreInf = names.filter((n) => indiceAcordeNaEscala(n, inferred) >= 0).length

  return scoreInf > scoreTom ? inferred : tomConfigurado
}

/**
 * Nashville / graus harmônicos (Tonal.js — não vem do scraping).
 */
export function calcularGrau(acorde, tomDaMusica) {
  if (!acorde?.trim() || !tomDaMusica) return ''

  const idx = indiceAcordeNaEscala(acorde, tomDaMusica)
  if (idx === -1) return ''

  const menores = isTomMenor(tomDaMusica)
  const base = tonicBase(tomDaMusica)
  const keyData = menores ? Key.minorKey(base) : Key.majorKey(base)
  const grades = keyData.grades || []

  let grau = grades[idx] || ''
  if (menores) {
    const minorMap = {
      I: 'i',
      II: 'ii',
      III: 'III',
      IV: 'iv',
      V: 'v',
      VI: 'VI',
      VII: 'VII',
      bIII: 'III',
      bVI: 'VI',
      bVII: 'VII',
    }
    const baseGrau = grau.replace(/[°+7]/g, '')
    const suffix = grau.slice(baseGrau.length)
    if (minorMap[baseGrau]) grau = minorMap[baseGrau] + suffix
  }

  const quality = chordQualityFromSymbol(acorde)
  if (quality.diminished && !grau.includes('°')) {
    grau += '°'
  }
  if (quality.augmented && !grau.includes('+')) {
    grau += '+'
  }
  if (quality.has7 && !grau.includes('7')) {
    grau += '7'
  }

  return grau
}

/**
 * Linha de graus alinhada na mesma coluna dos acordes.
 */
export function buildGrauLine(chordLine, chords, tomDaMusica) {
  const line = String(chordLine ?? '')
  const list =
    line.trim().length > 0 ? extractChordsFromLine(line) : chords?.length ? chords : []
  if (list.length === 0) return ''

  const tom = resolveTomParaGraus(
    tomDaMusica,
    list.map((c) => c.chord),
  )
  if (!tom) return ''

  const width = Math.max(
    line.length,
    ...list.map((c) => c.pos + (c.chord?.length || 0)),
    0,
  )
  const chars = Array(width).fill(' ')

  for (const { pos, chord } of list) {
    const grau = calcularGrau(chord, tom)
    if (!grau) continue
    for (let i = 0; i < grau.length && pos + i < width; i++) {
      chars[pos + i] = grau[i]
    }
  }

  return chars.join('').padEnd(line.length, ' ')
}

/**
 * Remove [C][G]… e colchetes soltos da letra (resíduo do CC).
 */
export function limparLetraDeColchetesAcorde(text) {
  return String(text || '')
    .replace(ACORDE_ENTRE_COLCHETES_RE, '')
    .replace(/\[\s*\]/g, '')
    .replace(/\[/g, '')
    .replace(/\]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trimEnd()
}

/**
 * Graus Nashville a partir de acordes + pos (sem re-parse da linha).
 * @param {{ pos: number, chord: string }[]} chords
 * @param {string} tomOriginal
 * @returns {{ pos: number, grau: string }[]}
 */
export function buildGrauLineFromChords(chords, tomOriginal) {
  if (!chords?.length) return []

  const tomConfig =
    typeof tomOriginal === 'string' && tomOriginal.trim()
      ? tomOriginal.trim()
      : null

  const tom = resolveTomParaGraus(
    tomConfig,
    chords.map((c) => c.chord),
  )
  if (!tom) return []

  return chords
    .map(({ pos, chord }) => ({
      pos,
      grau: calcularGrau(chord, tom),
    }))
    .filter((item) => item.grau)
}

/**
 * Graus Nashville nas mesmas colunas `pos` dos acordes (sem recalcular alinhamento).
 * @param {import('@crash-cifras/shared/chord-schema').ChordLine} rawLine
 * @param {string} tomOriginal
 * @returns {{ pos: number, grau: string }[]}
 */
export function buildGrausAtPositions(rawLine, tomOriginal) {
  const { chords } = normalizeChordLine(rawLine)
  return buildGrauLineFromChords(chords, tomOriginal)
}

/**
 * @param {import('@crash-cifras/shared/chord-schema').ChordLine} rawLine
 * @param {string} tomOriginal
 */
export function buildGrauLineFromChordLine(rawLine, tomOriginal) {
  const { chordLine, chords } = normalizeChordLine(rawLine)
  return buildGrauLine(chordLine, chords, tomOriginal)
}
