import { api } from '../lib/api'
import { supabase } from '../lib/supabase'

async function authHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Faça login para continuar')
  }
  return { Authorization: `Bearer ${session.access_token}` }
}

/**
 * Etapa 2 — consulta o motor único de busca/anti-duplicata do acervo.
 * Usuário comum pode buscar sem YouTube; a Curadoria envia também URL+título+artista.
 */
export async function buscarAcervoCatalogo({
  q,
  fonteUrl,
  titulo,
  artista,
  limit = 20,
}) {
  const headers = await authHeaders()
  const params = { limit }
  if (String(q || '').trim()) params.q = String(q).trim()
  if (String(fonteUrl || '').trim()) params.fonteUrl = String(fonteUrl).trim()
  if (String(titulo || '').trim()) params.titulo = String(titulo).trim()
  if (String(artista || '').trim()) params.artista = String(artista).trim()

  const { data } = await api.get('/acervo/buscar', { headers, params })
  return data
}

/**
 * Fluxo 5.2 — informa ao acervo se a cópia salva aceitou ou corrigiu a versão de origem.
 */
export async function enviarFeedbackAcervo({ acervoVersaoId, tomOriginal, bpm, secoes }) {
  if (!acervoVersaoId) return null
  const headers = await authHeaders()
  const { data } = await api.post(
    '/acervo/feedback',
    { acervoVersaoId, tomOriginal, bpm, secoes },
    { headers },
  )
  return data
}

/**
 * Restaura cópia pessoal com a primeira versão origem=motor do acervo (não versao_top).
 * @param {string} musicaId
 */
export async function restaurarCifraMotor(musicaId) {
  const headers = await authHeaders()
  const { data } = await api.post(
    '/acervo/copias/restaurar-motor',
    { musicaId },
    { headers },
  )
  return data
}

/**
 * Lista metadados das versões do acervo vinculado à cópia (vitrine — Etapa A).
 * @param {string} musicaId
 */
export async function listarVersoesAcervo(musicaId) {
  const headers = await authHeaders()
  const { data } = await api.get(`/acervo/copias/${musicaId}/versoes`, { headers })
  return data
}

/**
 * Cifra completa de uma versão do acervo (preview sob demanda).
 * @param {string} acervoVersaoId
 */
export async function buscarVersaoAcervo(acervoVersaoId) {
  const headers = await authHeaders()
  const { data } = await api.get(`/acervo/copias/versao/${acervoVersaoId}`, { headers })
  return data
}

/**
 * Substitui a cópia pessoal por uma versão escolhida do acervo (vitrine — Etapa B).
 * @param {string} musicaId
 * @param {string} acervoVersaoId
 */
export async function restaurarVersaoAcervo(musicaId, acervoVersaoId) {
  const headers = await authHeaders()
  const { data } = await api.post(
    '/acervo/copias/restaurar-versao',
    { musicaId, acervoVersaoId },
    { headers },
  )
  return data
}

/**
 * Etapa B — corrige tom_original na versão motor do acervo (metadado only).
 * @param {string} acervoVersaoId
 * @param {string} tomOriginal
 */
export async function corrigirTomVersaoMotor({ acervoVersaoId, tomOriginal }) {
  const headers = await authHeaders()
  const { data } = await api.post(
    '/acervo/motor/corrigir-tom',
    { acervoVersaoId, tomOriginal },
    { headers },
  )
  return data
}

/** Erro quando a fonte motor já foi corrigida (409). */
export function isFonteJaCorrigidaError(err) {
  return err?.code === 'FONTE_JA_CORRIGIDA'
}

/**
 * Etapa D — reporte de tom errado na fonte.
 */
export async function reportarTomErrado({ acervoVersaoId, musicaId, tomSugerido, comentario }) {
  const headers = await authHeaders()
  const { data } = await api.post(
    '/acervo/motor/report-tom',
    { acervoVersaoId, musicaId, tomSugerido, comentario },
    { headers },
  )
  return data
}

/**
 * Admin — publica cifra importada de arquivo no acervo (origem=curadoria).
 */
export async function publicarCuradoriaAcervo({
  titulo,
  artista,
  tomOriginal,
  bpm,
  cifra,
  arquivoOrigem,
  youtubeUrl,
}) {
  const headers = await authHeaders()
  const { data } = await api.post(
    '/acervo/curadoria',
    { titulo, artista, tomOriginal, bpm, cifra, arquivoOrigem, youtubeUrl },
    { headers },
  )
  return data
}

/**
 * Publica a cópia pessoal no acervo da comunidade (fonte_url = YouTube canônico).
 * Se já houver acervo_versao_id, registra feedback e garante o link YouTube.
 */
export async function publicarCopiaNoAcervo({
  musicaId,
  youtubeUrl,
  tomOriginal,
  bpm,
  secoes,
}) {
  const headers = await authHeaders()
  const { data } = await api.post(
    '/acervo/copias/publicar',
    { musicaId, youtubeUrl, tomOriginal, bpm, secoes },
    { headers },
  )
  return data
}
