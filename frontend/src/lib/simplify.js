import { isValidChordSymbol, normalizeChordLine } from '@crash-cifras/shared/chord-schema'

/**
 * Sufixo indica tríade menor? CASE-SENSITIVE: só "m" minúsculo (nunca "M").
 * dim / ° / º / ø / m7b5 → aproximação menor.
 * @param {string} suffix
 */
function isMinorTriadSuffix(suffix) {
  const s = String(suffix || '')
  if (!s) return false

  // Half-diminished / diminished → menor tocável
  if (s.includes('m7b5') || s.includes('ø')) return true
  if (/^(dim|°|º|o)(\b|$)/i.test(s) || s.startsWith('°') || s.startsWith('º')) {
    return true
  }

  // "m" minúsculo, mas não "maj..." (maj começa com m+aj)
  // "M" / "7M" / "M7" NÃO são menor
  if (/^m(?!aj)/.test(s)) return true

  // Jazz: -7 / -maj → '-' no início costuma ser menor
  if (s.startsWith('-')) return true

  return false
}

/**
 * Reduz acorde à tríade básica (maior/menor). Nada é persistido.
 * @param {string} symbol
 * @param {{ keepBass?: boolean }} [options]
 */
export function simplifyChord(symbol, { keepBass = true } = {}) {
  if (symbol == null || symbol === '') return symbol
  const raw = String(symbol).trim()
  if (!raw) return symbol

  let head = raw
  let bass = null
  const slash = raw.indexOf('/')
  if (slash !== -1) {
    head = raw.slice(0, slash)
    bass = raw.slice(slash + 1)
  }

  const match = head.match(/^([A-G](?:#|b)?)(.*)$/)
  if (!match) return symbol

  const [, root, suffix] = match
  const triad = isMinorTriadSuffix(suffix) ? `${root}m` : root

  if (keepBass && bass) return `${triad}/${bass}`
  return triad
}

/**
 * Simplifica linhas estruturadas (chords + segments). pos intacto — sem reflow.
 * @param {import('@crash-cifras/shared/chord-schema').SecaoLinhas} linhas
 * @param {{ keepBass?: boolean }} [options]
 */
export function simplifyLinhas(linhas, options = {}) {
  if (!linhas?.lines) return linhas

  return {
    lines: linhas.lines.map((raw) => {
      const line = normalizeChordLine(raw)
      const chords = (line.chords || []).map((c) => ({
        ...c,
        chord: simplifyChord(c.chord, options),
      }))
      return {
        ...line,
        chords,
        chordLine: line.chordLine,
        segments: (line.segments || []).map((seg) => ({
          ...seg,
          chord: seg.chord ? simplifyChord(seg.chord, options) : seg.chord,
        })),
      }
    }),
  }
}

/**
 * Texto livre (intro): só transpõe/simplifica tokens que são acordes válidos.
 * @param {string|null|undefined} texto
 * @param {{ keepBass?: boolean }} [options]
 */
export function simplifyTextoLivre(texto, options = {}) {
  if (texto == null) return texto
  if (texto === '') return ''

  return String(texto).replace(/(\S+)|(\s+)/g, (token, word, space) => {
    if (space) return space
    if (!isValidChordSymbol(word)) return word
    return simplifyChord(word, options)
  })
}

/**
 * @param {{ mao_esquerda?: string|null, mao_direita?: string|null }|null|undefined} intro
 * @param {{ keepBass?: boolean }} [options]
 */
export function simplifyIntro(intro, options = {}) {
  if (!intro || typeof intro !== 'object') return intro
  return {
    ...intro,
    mao_esquerda: simplifyTextoLivre(intro.mao_esquerda, options),
    mao_direita: simplifyTextoLivre(intro.mao_direita, options),
  }
}
