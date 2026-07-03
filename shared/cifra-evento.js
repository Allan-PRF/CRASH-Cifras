import { EMPTY_LINHAS } from './chord-schema.js'

/** @param {unknown} cifraEvento */
export function cifraEventoTemConteudo(cifraEvento) {
  return Array.isArray(cifraEvento?.secoes) && cifraEvento.secoes.length > 0
}

/**
 * Monta snapshot para playlist_itens.cifra_evento.
 * @param {{ intro?: { mao_esquerda?: string, mao_direita?: string } | null, secoes?: Array<object> }} params
 */
export function buildCifraEventoSnapshot({ intro, secoes }) {
  const introNorm =
    intro && (String(intro.mao_esquerda || '').trim() || String(intro.mao_direita || '').trim())
      ? {
          mao_esquerda: String(intro.mao_esquerda || '').trim(),
          mao_direita: String(intro.mao_direita || '').trim(),
        }
      : null

  return {
    intro: introNorm,
    secoes: (secoes || []).map((sec, index) => ({
      slug: sec.slug,
      nome: sec.nome,
      ordem_original: sec.ordem_original ?? index,
      linhas: sec.linhas || EMPTY_LINHAS,
    })),
    saved_at: new Date().toISOString(),
  }
}

/** @param {unknown} cifraEvento */
export function secoesFromCifraEvento(cifraEvento) {
  if (!cifraEventoTemConteudo(cifraEvento)) return []
  return cifraEvento.secoes.map((sec, index) => ({
    id: null,
    slug: sec.slug,
    nome: sec.nome,
    ordem_original: sec.ordem_original ?? index,
    linhas: sec.linhas || EMPTY_LINHAS,
  }))
}

/**
 * Substitui intro/seções da música pela cópia do evento (teleprompter / cache).
 * @param {object} musica
 * @param {unknown} cifraEvento
 */
export function aplicarCifraEventoNaMusica(musica, cifraEvento) {
  if (!musica || !cifraEventoTemConteudo(cifraEvento)) return musica
  return {
    ...musica,
    intro: cifraEvento.intro ?? musica.intro,
    secoes: secoesFromCifraEvento(cifraEvento),
  }
}
