/**
 * Snapshot de cifra para JSONB do acervo — sem dependências Node (seguro no browser).
 */

/**
 * Monta snapshot completo da cifra (campo jsonb em acervo_versoes).
 * @param {object} params
 * @param {string|null} params.tomOriginal
 * @param {number|null} params.bpm
 * @param {object|null} params.intro
 * @param {Array<object>} params.secoes — { slug, nome, ordem_original, linhas }
 */
export function buildCifraSnapshot({ tomOriginal, bpm, intro, secoes }) {
  return {
    tom_original: tomOriginal || null,
    bpm: bpm != null ? Math.round(Number(bpm)) : null,
    intro: intro || { lines: [] },
    secoes: (secoes || []).map((sec) => ({
      slug: sec.slug,
      nome: sec.nome,
      ordem_original: sec.ordem_original,
      linhas: sec.linhas || { lines: [] },
    })),
  }
}

/**
 * Desempacota snapshot do acervo em linhas de secoes_musica.
 * @param {object} cifra
 * @returns {Array<{ slug, nome, ordem_original, linhas }>}
 */
export function unpackCifraToSecoes(cifra) {
  if (!cifra?.secoes?.length) return []
  return cifra.secoes.map((sec) => ({
    slug: sec.slug,
    nome: sec.nome,
    ordem_original: sec.ordem_original,
    linhas: sec.linhas || { lines: [] },
  }))
}

/**
 * Monta snapshot a partir das seções pessoais + metadados da música.
 */
export function buildCifraSnapshotFromMusica({ tomOriginal, bpm, secoes }) {
  return buildCifraSnapshot({
    tomOriginal,
    bpm,
    intro: { lines: [] },
    secoes,
  })
}
