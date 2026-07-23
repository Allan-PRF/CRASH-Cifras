import { normalizeAcervoText } from './acervo.js'

/** Sufixos/ruído de título YouTube — só para COMPARAÇÃO, nunca no valor salvo. */
const TITLE_NOISE_RE =
  /\b(ao vivo|video oficial|clipe oficial|oficial|live|lyrics?|letra|lyric video|audio oficial|versao|versão)\b/gi

/**
 * Normaliza título/artista para comparação fuzzy.
 * Remove (…), […], sufixo após |, e tokens de ruído; depois normalizeAcervoText.
 * @param {string} value
 */
export function stripTitleNoise(value) {
  let t = String(value || '')
  t = t.replace(/\([^)]*\)/g, ' ')
  t = t.replace(/\[[^\]]*\]/g, ' ')
  t = t.replace(/\|.*$/, ' ')
  t = t.replace(TITLE_NOISE_RE, ' ')
  return normalizeAcervoText(t)
}

function tokens(value) {
  return stripTitleNoise(value)
    .split(' ')
    .filter((w) => w.length >= 2)
}

/**
 * Similaridade Jaccard 0–1 entre tokens normalizados.
 * @param {string} a
 * @param {string} b
 */
export function jaccardTokens(a, b) {
  const A = new Set(tokens(a))
  const B = new Set(tokens(b))
  if (!A.size && !B.size) return 1
  if (!A.size || !B.size) return 0
  let inter = 0
  for (const x of A) {
    if (B.has(x)) inter++
  }
  return inter / new Set([...A, ...B]).size
}

/**
 * Títulos parecem a mesma música (strip + contain + Jaccard ≥ 0.45).
 * @param {string} a
 * @param {string} b
 */
export function titulosParecemMesmaMusica(a, b) {
  const na = stripTitleNoise(a)
  const nb = stripTitleNoise(b)
  if (!na || !nb) return !na && !nb
  if (na === nb) return true
  if (na.includes(nb) || nb.includes(na)) return true
  return jaccardTokens(a, b) >= 0.45
}

/**
 * Artistas compatíveis. Vazio de um lado = não bloqueia.
 * @param {string} a
 * @param {string} b
 */
export function artistasParecemMesmo(a, b) {
  const na = stripTitleNoise(a)
  const nb = stripTitleNoise(b)
  if (!na || !nb) return true
  if (na === nb) return true
  if (na.includes(nb) || nb.includes(na)) return true
  return jaccardTokens(a, b) >= 0.45
}

/**
 * Cópia e entrada do acervo (pelo YouTube) referem a mesma canção?
 * Dispara divergência se títulos forem de músicas diferentes OU
 * se títulos baterem mas artistas forem claramente outros.
 *
 * @param {{ tituloCopia?: string, artistaCopia?: string, tituloAcervo?: string, artistaAcervo?: string }} p
 */
export function isSameAcervoSong({
  tituloCopia,
  artistaCopia,
  tituloAcervo,
  artistaAcervo,
}) {
  if (!titulosParecemMesmaMusica(tituloCopia, tituloAcervo)) return false
  if (!artistasParecemMesmo(artistaCopia, artistaAcervo)) return false
  return true
}

/**
 * Precisa confirmar antes de publicar nesta entrada encontrada pelo URL?
 */
export function precisaConfirmacaoTituloAcervo({
  tituloCopia,
  artistaCopia,
  tituloAcervo,
  artistaAcervo,
}) {
  return !isSameAcervoSong({
    tituloCopia,
    artistaCopia,
    tituloAcervo,
    artistaAcervo,
  })
}
