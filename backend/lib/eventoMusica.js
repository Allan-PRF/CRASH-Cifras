import { normalizeAcervoText } from '@crash-cifras/shared'
import { validateYoutubeUrl } from '@crash-cifras/shared/validate-youtube-url'
import { buscarAcervoMusica, unpackCifraToSecoes } from './acervo.js'

function extractVideoId(url) {
  if (!url) return null
  const result = validateYoutubeUrl(url)
  return result.valid ? result.videoId : null
}

function musicaTemSecoes(musica) {
  const secoes = musica?.secoes_musica
  return Array.isArray(secoes) && secoes.length > 0
}

function pickBestMusica(candidates, ministroId) {
  const sorted = [...candidates].sort((a, b) => {
    const aPri = ministroId && a.ministro_id === ministroId ? 0 : 1
    const bPri = ministroId && b.ministro_id === ministroId ? 0 : 1
    if (aPri !== bPri) return aPri - bPri
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })
  return sorted[0]
}

async function buscarMusicaProntaNoMinistro(
  supabase,
  userId,
  { fonteUrl, videoId, titulo, artista, ministroId },
) {
  const vid = videoId || extractVideoId(fonteUrl)

  const { data: rows, error } = await supabase
    .from('musicas')
    .select(
      'id, titulo, artista, youtube_url, ministro_id, import_status, updated_at, secoes_musica(id)',
    )
    .eq('user_id', userId)
    .in('import_status', ['ready', 'manual'])

  if (error) throw error

  const comSecoes = (rows || []).filter(musicaTemSecoes)
  if (!comSecoes.length) return null

  if (vid) {
    const porVideo = comSecoes.filter((m) => extractVideoId(m.youtube_url) === vid)
    if (porVideo.length) return pickBestMusica(porVideo, ministroId)
  }

  const tituloNorm = normalizeAcervoText(titulo)
  if (tituloNorm) {
    const artistaNorm = normalizeAcervoText(artista)
    const porTitulo = comSecoes.filter(
      (m) =>
        normalizeAcervoText(m.titulo) === tituloNorm &&
        normalizeAcervoText(m.artista) === artistaNorm,
    )
    if (porTitulo.length) return pickBestMusica(porTitulo, ministroId)
  }

  return null
}

async function buscarAcervoHitPronto({ titulo, artista, fonteUrl }) {
  const existente = await buscarAcervoMusica({ titulo, artista, fonteUrl })
  if (existente?.status !== 'ready' || !existente.versao_top) return null

  const versao = existente.versao_top
  return {
    tipo: 'hit',
    acervoMusica: existente,
    versao,
    secoes: unpackCifraToSecoes(versao.cifra),
    tomOriginal: versao.tom_original || versao.cifra?.tom_original || null,
    bpm: versao.bpm ?? versao.cifra?.bpm ?? null,
    acervoVersaoId: versao.id,
  }
}

/**
 * Verifica se a música pode entrar no evento (só consulta — sem motor).
 * @returns {Promise<
 *   | { liberado: true, origem: 'ministro', musicaId: string, titulo: string }
 *   | { liberado: true, origem: 'acervo', acervoPedido: object }
 *   | { liberado: false }
 * >}
 */
export async function resolverMusicaProntaParaEvento(
  supabase,
  userId,
  { fonteUrl, videoId, titulo, artista, ministroId },
) {
  const ministro = await buscarMusicaProntaNoMinistro(supabase, userId, {
    fonteUrl,
    videoId,
    titulo,
    artista,
    ministroId,
  })

  if (ministro) {
    return {
      liberado: true,
      origem: 'ministro',
      musicaId: ministro.id,
      titulo: ministro.titulo,
    }
  }

  const acervoPedido = await buscarAcervoHitPronto({ titulo, artista, fonteUrl })
  if (acervoPedido) {
    return { liberado: true, origem: 'acervo', acervoPedido }
  }

  return { liberado: false }
}
