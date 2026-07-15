/**
 * Notação brasileira de acordes (Cifra Club / Almir Chediak) — só exibição.
 * Não altera dados salvos; fundamental, baixo (/) e extensões preservados.
 *
 * maj7 → 7M  |  aug/+ → (#5)  |  dim → °  |  m7b5/ø → m7(b5)
 * CASE-SENSITIVE: M = maior; m = menor (Am7 permanece Am7).
 */

/**
 * @param {string|null|undefined} symbol
 * @returns {string|null|undefined}
 */
export function normalizeChordBR(symbol) {
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
  if (!match) return raw

  const [, root, suffix] = match
  const out = root + normalizeSuffixBR(suffix)
  if (bass != null && bass !== '') {
    return `${out}/${normalizeBassBR(bass)}`
  }
  return out
}

/**
 * @param {string} bass
 */
function normalizeBassBR(bass) {
  const m = String(bass).trim().match(/^([A-G](?:#|b)?)(.*)$/)
  if (!m) return bass
  return m[1] + normalizeSuffixBR(m[2])
}

/**
 * @param {string} suffix
 */
function normalizeSuffixBR(suffix) {
  let s = String(suffix || '')

  // Ordem: maj9 antes de maj7 (evita Gmaj9 → G7M9 residual)
  s = s.replace(/maj9/gi, '7M(9)')
  s = s.replace(/maj7/gi, '7M')
  // MA7 / Ma7 sem o "j"
  s = s.replace(/ma7/gi, '7M')

  // CM7 → sufixo "M7" (M maiúsculo). Nunca tocar "m7" minúsculo (Am7).
  s = s.replace(/^M7\b/, '7M')
  s = s.replace(/([^a-z])M7\b/g, '$17M')

  // Meio-diminuto
  s = s.replace(/m7b5/gi, 'm7(b5)')
  s = s.replace(/ø/g, 'm7(b5)')

  // Tríade diminuta (não dim7)
  s = s.replace(/^dim(?!7)/i, '°')

  // Quinta aumentada — nunca "+" como 7ª maior
  s = s.replace(/aug/gi, '(#5)')
  if (s === '+') s = '(#5)'
  else s = s.replace(/\+$/g, '(#5)')

  return s
}
