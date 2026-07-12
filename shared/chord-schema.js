/**
 * Formato canônico de cifra alinhada (teleprompter — 3 linhas).
 * Graus NÃO são persistidos; calculados em runtime via Tonal.js.
 *
 * @typedef {{ pos: number, chord: string }} ChordAtPosition
 * @typedef {{ chord?: string, text: string }} ChordSegment
 * @typedef {{ chordLine?: string, lyricLine?: string, chords?: ChordAtPosition[], segments: ChordSegment[] }} ChordLine
 * @typedef {{ lines: ChordLine[] }} SecaoLinhas
 */

export const EMPTY_LINHAS = { lines: [] }

const CHORD_RE =
  /[A-G](?:#|b)?(?:maj|min|m|M|dim|aug|sus|add|°|º|\+)?[0-9]*M?(?:\/[A-G](?:#|b)?)?/g

/** Aceita grafia BR "7M" (= maj7), ex.: C7M, C#7M — M opcional após dígitos. */
const CHORD_SYMBOL_RE =
  /^[A-G](?:#|b)?(?:maj|min|m|M|dim|aug|sus|add|°|º|\+)?[0-9]*M?(?:\/[A-G](?:#|b)?)?$/

/**
 * Valida símbolo de acorde (âncora completa — uma nota/acorde por string).
 * @param {string} symbol
 */
export function isValidChordSymbol(symbol) {
  const s = String(symbol ?? '').trim()
  if (!s) return false
  return CHORD_SYMBOL_RE.test(s)
}

/**
 * Extrai acordes com posição (coluna) na linha de cifras.
 * @param {string} chordLine
 * @returns {ChordAtPosition[]}
 */
export function extractChordsFromLine(chordLine = '') {
  const chords = []
  const re = new RegExp(CHORD_RE.source, 'g')
  let m
  while ((m = re.exec(chordLine)) !== null) {
    chords.push({ pos: m.index, chord: m[0] })
  }
  return chords
}

/** Coluna monoespaçada para acordes GPT distribuídos pela letra. */
export function gptChordPos(lyricLength, index, total) {
  if (total <= 1) return 0
  if (index === 0) return 0
  if (index === total - 1) return Math.floor(lyricLength * 0.85)
  return Math.floor(lyricLength * (index / (total - 1)))
}

/**
 * Distribui acordes GPT ao longo da letra (sem Cifra Club).
 * @param {string} lyricLine
 * @param {string[]} chordSymbols
 * @returns {ChordAtPosition[]}
 */
export function distributeChordsAlongLyric(lyricLine, chordSymbols) {
  const symbols = (chordSymbols || []).filter(Boolean)
  const len = String(lyricLine || '').length
  if (!symbols.length) return []
  return symbols.map((chord, i) => ({
    pos: gptChordPos(len, i, symbols.length),
    chord,
  }))
}

/** Monta linha de cifras a partir de `{ pos, chord }[]`. */
export function rebuildChordLineFromChords(chords) {
  if (!chords?.length) return ''
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
 * Detecta pos compacto do GPT (ex.: 0,5,10,16) — acordes à esquerda, letra longa.
 */
export function isCompactFixedChordPos(chords, lyricLine, chordLine = '') {
  if (!chords?.length || chords.length < 2 || !String(lyricLine || '').trim()) {
    return false
  }
  const fromLine = extractChordsFromLine(chordLine)
  if (fromLine.length !== chords.length) return false
  const matchesExtract = chords.every(
    (c, i) => c.pos === fromLine[i].pos && c.chord === fromLine[i].chord,
  )
  if (!matchesExtract) return false
  const last = chords[chords.length - 1]
  const lastEnd = last.pos + (last.chord?.length || 0)
  return lastEnd < lyricLine.length * 0.5
}

/**
 * Realinha acordes GPT usando a letra (importação ou fallback na renderização).
 */
export function alignChordsToLyricLine({ chordLine = '', lyricLine = '', chords = [] }) {
  const symbols = (chords.length ? chords : extractChordsFromLine(chordLine)).map(
    (c) => c.chord,
  )
  if (!symbols.length || !String(lyricLine || '').trim()) {
    return { chordLine, lyricLine, chords }
  }
  const aligned = distributeChordsAlongLyric(lyricLine, symbols)
  return {
    chordLine: rebuildChordLineFromChords(aligned),
    lyricLine,
    chords: aligned,
  }
}

/**
 * @param {unknown} value
 * @returns {value is SecaoLinhas}
 */
export function isSecaoLinhas(value) {
  if (!value || typeof value !== 'object') return false
  const { lines } = value
  if (!Array.isArray(lines)) return false
  return lines.every(
    (line) =>
      line &&
      typeof line === 'object' &&
      (Array.isArray(line.segments) ||
        typeof line.chordLine === 'string' ||
        typeof line.lyricLine === 'string'),
  )
}

/**
 * Normaliza linha para exibição (cifra / letra / graus na mesma coluna).
 * @param {ChordLine} line
 * @returns {{ chordLine: string, lyricLine: string, chords: ChordAtPosition[], segments: ChordSegment[] }}
 */
export function normalizeChordLine(line) {
  if (!line || typeof line !== 'object') {
    return { chordLine: '', lyricLine: '', chords: [], segments: [{ text: '' }] }
  }

  if (line.chordLine != null || line.lyricLine != null) {
    const chordLine = String(line.chordLine ?? '')
    const lyricLine = String(line.lyricLine ?? '')
    const fromLine = extractChordsFromLine(chordLine)
    const stored = Array.isArray(line.chords) ? line.chords : []
    const chords =
      stored.length > 0
        ? stored
        : fromLine
    return {
      chordLine,
      lyricLine,
      chords,
      segments: line.segments || [{ text: lyricLine }],
    }
  }

  const segments = Array.isArray(line.segments) ? line.segments : [{ text: '' }]
  let lyricLine = ''
  const chordSymbols = []

  for (const seg of segments) {
    if (seg.chord?.trim()) {
      chordSymbols.push(seg.chord.trim())
    }
    lyricLine += seg.text ?? ''
  }

  const emptyTextChords = segments.filter((s) => s.chord?.trim() && !String(s.text ?? '').trim())
  const isLegacyStacked =
    chordSymbols.length > 1 && emptyTextChords.length >= chordSymbols.length - 1

  let chords
  if (isLegacyStacked) {
    const lineWidth = Math.max(lyricLine.length, 40)
    const espacamento = Math.max(1, Math.floor(lineWidth / chordSymbols.length))
    chords = chordSymbols.map((chord, i) => ({ pos: i * espacamento, chord }))
  } else {
    chords = []
    let posCursor = 0
    for (const seg of segments) {
      const startPos = posCursor
      if (seg.chord?.trim()) {
        chords.push({ pos: startPos, chord: seg.chord.trim() })
      }
      posCursor += seg.text?.length ?? 0
    }
  }

  const width = Math.max(
    lyricLine.length,
    ...chords.map((c) => c.pos + c.chord.length),
    0,
  )
  const chordArr = Array(width).fill(' ')
  for (const { pos, chord } of chords) {
    for (let i = 0; i < chord.length && pos + i < width; i++) {
      chordArr[pos + i] = chord[i]
    }
  }
  const chordLine = chordArr.join('').replace(/\s+$/, '')

  return { chordLine, lyricLine, chords, segments }
}

/**
 * Converte texto plano legado em estrutura segmentada (uma linha por row).
 * @param {string} plain
 * @returns {SecaoLinhas}
 */
export function plainTextToLinhas(plain) {
  const rows = (plain || '').split('\n')
  return {
    lines: rows.map((row) => ({
      chordLine: '',
      lyricLine: row,
      chords: [],
      segments: [{ text: row }],
    })),
  }
}

/**
 * Linha com acordes posicionados (coluna `pos` do Cifra Club).
 * @param {string} chordLine
 * @param {string} lyricLine
 * @param {ChordAtPosition[]} [chordsExplicit]
 */
export function parseChordLyricLine(chordLine = '', lyricLine = '', chordsExplicit = null) {
  const c = String(chordLine ?? '')
  const l = String(lyricLine ?? '')
  const chords =
    Array.isArray(chordsExplicit) && chordsExplicit.length > 0
      ? chordsExplicit
      : extractChordsFromLine(c)

  return {
    chordLine: c,
    lyricLine: l,
    chords,
    segments: chords.length
      ? [{ chord: chords[0].chord, text: l }]
      : l
        ? [{ text: l }]
        : c
          ? [{ text: c }]
          : [{ text: '' }],
  }
}

/**
 * Bloco de linhas de cifras + letras (mesma quantidade de linhas).
 * @param {string} chordsText
 * @param {string} lyricsText
 * @param {{ fonteGpt?: boolean }} [opts]
 */
export function parseChordLyricBlock(chordsText = '', lyricsText = '', opts = {}) {
  const cLines = chordsText.split('\n')
  const lLines = lyricsText.split('\n')
  const max = Math.max(cLines.length, lLines.length, 1)
  const lines = []
  for (let i = 0; i < max; i++) {
    let line = parseChordLyricLine(cLines[i] ?? '', lLines[i] ?? '')
    if (opts.fonteGpt && line.chordLine.trim() && line.lyricLine.trim()) {
      const aligned = alignChordsToLyricLine(line)
      line = { ...line, ...aligned }
    }
    if (line.chordLine.trim() || line.lyricLine.trim()) {
      lines.push(line)
    }
  }
  return lines.length ? { lines } : EMPTY_LINHAS
}

/**
 * @param {SecaoLinhas} linhas
 * @returns {string}
 */
export function linhasToPlainText(linhas) {
  if (!isSecaoLinhas(linhas)) return ''
  return linhas.lines
    .map((line) => normalizeChordLine(line).lyricLine)
    .join('\n')
}

/**
 * @param {SecaoLinhas} linhas
 * @returns {{ chords: string, lyrics: string }}
 */
export function linhasToChordLyricText(linhas) {
  if (!isSecaoLinhas(linhas)) return { chords: '', lyrics: '' }
  const chords = []
  const lyrics = []
  for (const raw of linhas.lines) {
    const line = normalizeChordLine(raw)
    chords.push(line.chordLine)
    lyrics.push(line.lyricLine)
  }
  return { chords: chords.join('\n'), lyrics: lyrics.join('\n') }
}

/**
 * Ordem de execução no evento (Diretor de arranjo).
 * @typedef {{ secao_id?: string, slug?: string, repeticoes?: number }} OrdemSecaoItem
 * @typedef {{ ordem: OrdemSecaoItem[] }} OrdemSecoes
 */

export const ORDEM_NORMAL = [{ slug: '*', repeticoes: 1 }]
