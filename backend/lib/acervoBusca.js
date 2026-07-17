import { normalizeAcervoText, unpackCifraToSecoes } from '@crash-cifras/shared'
import { validateYoutubeUrl } from '@crash-cifras/shared/validate-youtube-url'
import { getSupabaseAdmin } from './supabase.js'

const ACERVO_BUSCA_COLS =
  'id, titulo, artista, titulo_norm, artista_norm, fonte_url, status, versao_top_id, created_at, updated_at'
const ACERVO_CATALOGO_COLS =
  `${ACERVO_BUSCA_COLS}, versoes_comunidade:acervo_versoes!acervo_versoes_acervo_musica_id_fkey(id)`

function dbOrAdmin(db) {
  return db || getSupabaseAdmin()
}

function normalizeLimit(limit) {
  const parsed = Number.parseInt(limit, 10)
  if (!Number.isFinite(parsed)) return 20
  return Math.min(50, Math.max(1, parsed))
}

/**
 * Canonicaliza qualquer URL YouTube aceita pelo app.
 * @param {string} rawUrl
 */
export function canonicalizarYoutubeUrl(rawUrl) {
  const validation = validateYoutubeUrl(String(rawUrl || '').trim())
  if (!validation.valid) {
    const err = new Error(validation.error || 'Link do YouTube inválido.')
    err.status = 400
    throw err
  }
  return `https://www.youtube.com/watch?v=${validation.videoId}`
}

/**
 * Checagem exata e isolada por acervo_musicas.fonte_url.
 * Não filtra por status: pending/failed também devem impedir duplicação.
 */
export async function buscarAcervoPorFonteUrl(fonteUrl, { db = null } = {}) {
  const canonicalUrl = canonicalizarYoutubeUrl(fonteUrl)
  const { data, error } = await dbOrAdmin(db)
    .from('acervo_musicas')
    .select(ACERVO_BUSCA_COLS)
    .eq('fonte_url', canonicalUrl)
    .maybeSingle()

  if (error) throw error
  return { canonicalUrl, musica: data || null }
}

/**
 * Correspondência exata por título+artista normalizados.
 * Retorna lista porque o índice atual não é unique e bases antigas podem conter duplicatas.
 */
export async function buscarAcervoPorTituloArtista(
  { titulo, artista },
  { db = null, limit = 10 } = {},
) {
  const tituloNorm = normalizeAcervoText(titulo)
  const artistaNorm = normalizeAcervoText(artista)
  if (!tituloNorm) return []

  let query = dbOrAdmin(db)
    .from('acervo_musicas')
    .select(ACERVO_BUSCA_COLS)
    .eq('titulo_norm', tituloNorm)
    .eq('artista_norm', artistaNorm)
    .order('status', { ascending: true })
    .limit(normalizeLimit(limit))

  const { data, error } = await query
  if (error) throw error
  return data || []
}

/**
 * Busca pública do catálogo: somente músicas ready, por trecho de título OU artista.
 * O texto é normalizado antes de montar o filtro PostgREST.
 */
export async function buscarAcervoReady({ q, limit = 20 }, { db = null } = {}) {
  const qNorm = normalizeAcervoText(q)
  if (qNorm.length < 2) {
    const err = new Error('Digite ao menos 2 caracteres para buscar no acervo.')
    err.status = 400
    throw err
  }

  const filtro = `titulo_norm.ilike.%${qNorm}%,artista_norm.ilike.%${qNorm}%`
  const { data, error } = await dbOrAdmin(db)
    .from('acervo_musicas')
    .select(ACERVO_CATALOGO_COLS)
    .eq('status', 'ready')
    .eq('versoes_comunidade.origem', 'correcao')
    .or(filtro)
    .order('titulo', { ascending: true })
    .order('artista', { ascending: true })
    .limit(normalizeLimit(limit))

  if (error) throw error
  return {
    query: String(q || '').trim(),
    query_norm: qNorm,
    resultados: (data || []).map(({ versoes_comunidade: versoes, ...musica }) => ({
      ...musica,
      tem_versao_comunidade: Boolean(versoes?.length),
    })),
  }
}

/**
 * Abre o preview da versão principal de um item pesquisável do catálogo.
 * A condição status=ready impede expor cifras ainda em processamento ou com falha.
 */
export async function buscarItemAcervoReady(acervoMusicaId, { db = null } = {}) {
  const database = dbOrAdmin(db)
  const { data: musica, error: musicaError } = await database
    .from('acervo_musicas')
    .select(ACERVO_BUSCA_COLS)
    .eq('id', acervoMusicaId)
    .eq('status', 'ready')
    .maybeSingle()

  if (musicaError) throw musicaError
  if (!musica?.versao_top_id) {
    const err = new Error('Música pronta não encontrada no acervo.')
    err.status = 404
    throw err
  }

  const { data: versao, error: versaoError } = await database
    .from('acervo_versoes')
    .select('id, acervo_musica_id, origem, cifra, tom_original, bpm')
    .eq('id', musica.versao_top_id)
    .eq('acervo_musica_id', musica.id)
    .maybeSingle()

  if (versaoError) throw versaoError
  if (!versao?.cifra) {
    const err = new Error('Versão principal do acervo não encontrada.')
    err.status = 404
    throw err
  }

  return {
    musica,
    versao: {
      id: versao.id,
      origem: versao.origem,
      tom_original: versao.tom_original || versao.cifra?.tom_original || null,
      bpm: versao.bpm || versao.cifra?.bpm || null,
      cifra: versao.cifra,
      secoes: unpackCifraToSecoes(versao.cifra),
    },
  }
}

/**
 * Regra anti-duplicata, pronta para a futura porta de Curadoria:
 * 1) URL exata ganha e pode ser reutilizada;
 * 2) somente título+artista exige decisão explícita do admin;
 * 3) sem match permite criar.
 *
 * Dependências injetáveis mantêm a prioridade testável sem Supabase real.
 */
export async function checarDuplicidadeAcervo(
  { fonteUrl, titulo, artista },
  {
    porFonteUrl = buscarAcervoPorFonteUrl,
    porTituloArtista = buscarAcervoPorTituloArtista,
    db = null,
  } = {},
) {
  let canonicalUrl = null

  if (String(fonteUrl || '').trim()) {
    const porUrl = await porFonteUrl(fonteUrl, { db })
    canonicalUrl = porUrl.canonicalUrl
    if (porUrl.musica) {
      return {
        tipo: 'fonte_url',
        canonical_url: canonicalUrl,
        musica: porUrl.musica,
        candidatos: [],
        requer_confirmacao_admin: false,
        pode_criar: false,
      }
    }
  }

  const candidatos =
    String(titulo || '').trim()
      ? await porTituloArtista({ titulo, artista }, { db })
      : []

  if (candidatos.length) {
    return {
      tipo: 'titulo_artista',
      canonical_url: canonicalUrl,
      musica: null,
      candidatos,
      requer_confirmacao_admin: true,
      pode_criar: false,
    }
  }

  return {
    tipo: null,
    canonical_url: canonicalUrl,
    musica: null,
    candidatos: [],
    requer_confirmacao_admin: false,
    pode_criar: true,
  }
}
