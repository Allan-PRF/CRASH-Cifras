import {
  aplicarTomOriginalNaCifra,
  buildCifraSnapshot,
  buildCifraSnapshotFromMusica,
  calcularScoreVersao,
  cifrasEssencialmenteIguais,
  hashCifraNorm,
  hashSecoesNorm,
  normalizeAcervoText,
  precisaConfirmacaoTituloAcervo,
  unpackCifraToSecoes,
} from '@crash-cifras/shared'
import { validateYoutubeUrl } from '@crash-cifras/shared/validate-youtube-url'
import { estaNoCatalogoPublico } from './acervoBusca.js'
import { getSupabaseAdmin } from './supabase.js'

function admin() {
  return getSupabaseAdmin()
}

/**
 * Soft-unpublish: bloqueia reuso silencioso do link.
 * Com reativarDespublicada=true, a publicação anexa versão e republica a mesma entrada.
 */
function assertNaoDespublicadaSemReativar(acervoMusica, { reativarDespublicada = false } = {}) {
  if (!acervoMusica || acervoMusica.publicado !== false) return
  if (reativarDespublicada) return

  const rotulo = rotuloEntradaAcervo(acervoMusica)
  const err = new Error(
    `«${rotulo}» está despublicada no acervo — não aparece na busca, no Explorar nem no atalho por URL. ` +
      `Para publicar a cifra corrigida com o mesmo link: confirme a reativação (anexa a nova versão nesta entrada e a republica). ` +
      `Alternativa: na Curadoria, libere o YouTube desta entrada (metadados) e publique como nova.`,
  )
  err.status = 409
  err.code = 'ACERVO_FONTE_DESPUBLICADA'
  err.requer_reativacao = true
  err.entrada_despublicada = {
    id: acervoMusica.id,
    titulo: acervoMusica.titulo,
    artista: acervoMusica.artista,
    fonte_url: acervoMusica.fonte_url,
    rotulo,
    despublicado_em: acervoMusica.despublicado_em || null,
    despublicado_por: acervoMusica.despublicado_por || null,
  }
  err.saidas = {
    recomendada: 'reativar_com_nova_versao',
    descricao_recomendada:
      'Confirme a reativação: anexa a cifra nova à mesma entrada e ela volta ao catálogo (publicado=true).',
    alternativa:
      'Na Curadoria, remova ou troque o fonte_url da despublicada e publique outra entrada com o link.',
  }
  throw err
}

async function aplicarRepublicacaoNaEntrada(acervoMusicaId, userId) {
  const agora = new Date().toISOString()
  const { error } = await admin()
    .from('acervo_musicas')
    .update({
      publicado: true,
      republicado_por: userId || null,
      republicado_em: agora,
    })
    .eq('id', acervoMusicaId)
  if (error) throw error
}

/** BPM válido no banco: null ou inteiro em (0, 400). Zero vira null. */
function normalizeBpmForDb(...candidates) {
  for (const raw of candidates) {
    if (raw == null || raw === '') continue
    const n = Math.round(Number(raw))
    if (Number.isFinite(n) && n > 0 && n < 400) return n
  }
  return null
}

const FILA_ACERVO_COLS = 'id, titulo, artista, fonte_url, status, created_at'

/**
 * Fila do motor — acervo pending/processing + import_jobs associados.
 * Usa RPC security definer; fallback para query direta se migration ainda não aplicada.
 */
export async function listarFilaMotor() {
  const db = admin()
  let musicas = []
  let source = 'table'

  const { data: rpcData, error: rpcErr } = await db.rpc('motor_fila_acervo')
  if (!rpcErr && Array.isArray(rpcData)) {
    musicas = rpcData
    source = 'rpc'
  } else {
    if (rpcErr?.code !== 'PGRST202') {
      console.warn('[acervo] motor_fila_acervo:', rpcErr?.message || rpcErr)
    }
    const { data, error } = await db
      .from('acervo_musicas')
      .select(FILA_ACERVO_COLS)
      .or('status.eq.pending,status.eq.processing')
      .order('created_at', { ascending: true })
      .limit(50)
    if (error) throw error
    musicas = data || []
  }

  const ids = musicas.map((m) => m.id)
  let jobs = []
  if (ids.length) {
    const { data: jobRows, error: jErr } = await db
      .from('import_jobs')
      .select('id, acervo_musica_id, youtube_url, user_id, status, etapa, progresso')
      .in('acervo_musica_id', ids)
    if (jErr) throw jErr
    jobs = jobRows || []
  }

  const pendentes = musicas.map((m) => ({
    ...m,
    jobs: jobs.filter((j) => j.acervo_musica_id === m.id),
  }))

  return { pendentes, total: pendentes.length, source }
}

/**
 * Busca música no acervo por URL ou título/artista normalizados.
 */
export async function buscarAcervoMusica({ titulo, artista, fonteUrl }) {
  const db = admin()
  const url = String(fonteUrl || '').trim() || null

  async function attachVersaoTop(row) {
    if (!row?.versao_top_id) return { ...row, versao_top: null }
    const { data: versao, error: vErr } = await db
      .from('acervo_versoes')
      .select('*')
      .eq('id', row.versao_top_id)
      .maybeSingle()
    if (vErr) throw vErr
    return { ...row, versao_top: versao }
  }

  if (url) {
    const { data, error } = await db
      .from('acervo_musicas')
      .select('*')
      .eq('fonte_url', url)
      .maybeSingle()
    if (error) throw error
    if (data) return attachVersaoTop(data)
  }

  const tituloNorm = normalizeAcervoText(titulo)
  if (!tituloNorm) return null

  const artistaNorm = normalizeAcervoText(artista)

  const { data, error } = await db
    .from('acervo_musicas')
    .select('*')
    .eq('titulo_norm', tituloNorm)
    .eq('artista_norm', artistaNorm)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return attachVersaoTop(data)
}

export async function criarAcervoMusicaPendente({ titulo, artista, fonteUrl }) {
  const db = admin()
  const tituloNorm = normalizeAcervoText(titulo)
  const artistaNorm = normalizeAcervoText(artista)

  const { data, error } = await db
    .from('acervo_musicas')
    .insert({
      titulo: String(titulo || '').trim(),
      artista: String(artista || '').trim() || null,
      titulo_norm: tituloNorm,
      artista_norm: artistaNorm,
      fonte_url: fonteUrl || null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function marcarAcervoProcessando(acervoMusicaId) {
  const { error } = await admin()
    .from('acervo_musicas')
    .update({ status: 'processing' })
    .eq('id', acervoMusicaId)
    .in('status', ['pending', 'failed'])
  if (error) throw error
}

/**
 * Motor Python chama ao concluir geração — cria versão e promove a campeã.
 */
export async function registrarVersaoMotor({
  acervoMusicaId,
  cifra,
  tomOriginal,
  bpm,
  criadoPor = null,
}) {
  const db = admin()
  const hash = hashCifraNorm(cifra)
  const bpmVal = normalizeBpmForDb(bpm, cifra?.bpm)

  const { data: versao, error: versaoErr } = await db
    .from('acervo_versoes')
    .insert({
      acervo_musica_id: acervoMusicaId,
      cifra,
      tom_original: tomOriginal || cifra.tom_original || null,
      bpm: bpmVal,
      hash_norm: hash,
      origem: 'motor',
      criado_por: criadoPor,
      score: calcularScoreVersao({ aceitacao_count: 0, convergencia_count: 0 }),
    })
    .select()
    .single()

  if (versaoErr) {
    console.error('[acervo] registrarVersaoMotor insert falhou:', {
      acervoMusicaId,
      code: versaoErr.code,
      message: versaoErr.message,
      details: versaoErr.details,
      hint: versaoErr.hint,
      bpmEnviado: bpm,
      bpmCifra: cifra?.bpm,
      bpmNormalizado: bpmVal,
    })
    throw versaoErr
  }

  await db.from('acervo_musicas').update({ status: 'ready' }).eq('id', acervoMusicaId)

  await recalcularVersaoTop(acervoMusicaId)

  const { data: musica, error: musicaErr } = await db
    .from('acervo_musicas')
    .select('*')
    .eq('id', acervoMusicaId)
    .single()

  if (musicaErr) throw musicaErr

  return { versao, acervoMusica: musica }
}

function canonicalYoutubeUrlFromRaw(raw) {
  const validation = validateYoutubeUrl(String(raw || '').trim())
  if (!validation.valid) {
    const err = new Error(validation.error || 'Link do YouTube inválido.')
    err.status = 400
    throw err
  }
  return `https://www.youtube.com/watch?v=${validation.videoId}`
}

async function buscarAcervoPorFonteUrl(fonteUrl) {
  const db = admin()
  const { data, error } = await db
    .from('acervo_musicas')
    .select('*')
    .eq('fonte_url', fonteUrl)
    .maybeSingle()
  if (error) throw error
  return data
}

function rotuloEntradaAcervo(musica) {
  const titulo = String(musica?.titulo || '').trim() || '(sem título)'
  const artista = String(musica?.artista || '').trim()
  return artista ? `${titulo} — ${artista}` : titulo
}

/**
 * Guarda: URL aponta para entrada cujo título/artista divergem da cópia.
 * Sem confirmarMesmoLink → 409 ACERVO_TITULO_DIVERGENTE (nada gravado).
 */
function assertTituloCompativelComEntradaUrl({
  tituloCopia,
  artistaCopia,
  acervoMusica,
  confirmarMesmoLink = false,
}) {
  if (!acervoMusica) return
  if (confirmarMesmoLink) return
  if (
    !precisaConfirmacaoTituloAcervo({
      tituloCopia,
      artistaCopia,
      tituloAcervo: acervoMusica.titulo,
      artistaAcervo: acervoMusica.artista,
    })
  ) {
    return
  }

  const rotuloEntrada = rotuloEntradaAcervo(acervoMusica)
  const rotuloCopia = rotuloEntradaAcervo({
    titulo: tituloCopia,
    artista: artistaCopia,
  })
  const err = new Error(
    `O link aponta para «${rotuloEntrada}», mas sua música chama «${rotuloCopia}». Confirme se é a mesma música ou corrija o link.`,
  )
  err.status = 409
  err.code = 'ACERVO_TITULO_DIVERGENTE'
  err.requer_confirmacao = true
  err.entrada_encontrada = {
    id: acervoMusica.id,
    titulo: acervoMusica.titulo,
    artista: acervoMusica.artista,
    fonte_url: acervoMusica.fonte_url,
    rotulo: rotuloEntrada,
  }
  err.copia = {
    titulo: tituloCopia || null,
    artista: artistaCopia || null,
    rotulo: rotuloCopia,
  }
  throw err
}

/**
 * Admin publica cifra importada de arquivo no acervo global (origem=curadoria).
 * Com youtubeUrl, fonte_url vira o link canônico — habilita atalho no import YouTube.
 */
export async function registrarVersaoCuradoria({
  titulo,
  artista,
  cifra,
  tomOriginal,
  bpm,
  criadoPor,
  arquivoOrigem = null,
  youtubeUrl = null,
  confirmarMesmoLink = false,
  reativarDespublicada = false,
}) {
  const db = admin()
  const tituloTrim = String(titulo || '').trim()
  if (tituloTrim.length < 2) {
    const err = new Error('Título é obrigatório para curadoria.')
    err.status = 400
    throw err
  }

  const rawYoutube = String(youtubeUrl || '').trim()
  const canonicalUrl = rawYoutube ? canonicalYoutubeUrlFromRaw(rawYoutube) : null
  const fonteUrl =
    canonicalUrl ||
    (arquivoOrigem ? `curadoria://arquivo/${encodeURIComponent(arquivoOrigem)}` : null)

  let acervoMusica = canonicalUrl ? await buscarAcervoPorFonteUrl(canonicalUrl) : null
  if (acervoMusica) {
    assertNaoDespublicadaSemReativar(acervoMusica, { reativarDespublicada })
    assertTituloCompativelComEntradaUrl({
      tituloCopia: tituloTrim,
      artistaCopia: artista,
      acervoMusica,
      confirmarMesmoLink,
    })
  }
  if (!acervoMusica) {
    acervoMusica = await criarAcervoMusicaPendente({
      titulo: tituloTrim,
      artista,
      fonteUrl,
    })
  } else if (canonicalUrl && acervoMusica.fonte_url !== canonicalUrl) {
    await garantirFonteUrlYoutube(acervoMusica.id, canonicalUrl)
  }

  const hash = hashCifraNorm(cifra)
  const bpmVal = normalizeBpmForDb(bpm, cifra?.bpm)

  const { data: existente, error: findErr } = await db
    .from('acervo_versoes')
    .select('*')
    .eq('acervo_musica_id', acervoMusica.id)
    .eq('hash_norm', hash)
    .maybeSingle()
  if (findErr) throw findErr

  let versao
  if (existente) {
    versao = existente
  } else {
    const { data: nova, error: versaoErr } = await db
      .from('acervo_versoes')
      .insert({
        acervo_musica_id: acervoMusica.id,
        cifra,
        tom_original: tomOriginal || cifra?.tom_original || null,
        bpm: bpmVal,
        hash_norm: hash,
        origem: 'curadoria',
        criado_por: criadoPor || null,
        score: calcularScoreVersao({ aceitacao_count: 0, convergencia_count: 0 }),
      })
      .select()
      .single()

    if (versaoErr) throw versaoErr
    versao = nova
  }

  await db.from('acervo_musicas').update({ status: 'ready' }).eq('id', acervoMusica.id)
  await recalcularVersaoTop(acervoMusica.id)

  const estavaDespublicada = acervoMusica.publicado === false
  if (estavaDespublicada && reativarDespublicada) {
    await aplicarRepublicacaoNaEntrada(acervoMusica.id, criadoPor)
    acervoMusica = { ...acervoMusica, publicado: true }
  }

  return {
    versao,
    acervoMusica,
    fonte_url: canonicalUrl || acervoMusica.fonte_url || fonteUrl,
    youtube_url: canonicalUrl,
    reativada: Boolean(estavaDespublicada && reativarDespublicada),
  }
}

/** Define fonte_url = YouTube quando estiver vazio ou for curadoria://arquivo/... */
async function garantirFonteUrlYoutube(acervoMusicaId, canonicalUrl) {
  const db = admin()
  const { data: row, error } = await db
    .from('acervo_musicas')
    .select('id, fonte_url')
    .eq('id', acervoMusicaId)
    .maybeSingle()
  if (error) throw error
  if (!row) return { updated: false }
  if (row.fonte_url === canonicalUrl) return { updated: false }

  const { data: conflict, error: cErr } = await db
    .from('acervo_musicas')
    .select('id')
    .eq('fonte_url', canonicalUrl)
    .neq('id', acervoMusicaId)
    .maybeSingle()
  if (cErr) throw cErr
  if (conflict) return { updated: false, conflictId: conflict.id }

  const atual = String(row.fonte_url || '')
  if (!atual || atual.startsWith('curadoria://')) {
    const { error: upErr } = await db
      .from('acervo_musicas')
      .update({ fonte_url: canonicalUrl })
      .eq('id', acervoMusicaId)
    if (upErr) throw upErr
    return { updated: true }
  }

  return { updated: false }
}

/**
 * Usuário autenticado publica a cifra da cópia pessoal no acervo da comunidade.
 * O YouTube canônico vira fonte_url — habilita o atalho no 2º import pelo mesmo link.
 * Guarda: se o URL já é de outra música (título/artista divergente), exige
 * confirmarMesmoLink — senão 409 ACERVO_TITULO_DIVERGENTE sem gravar.
 */
export async function publicarCopiaPessoalNoAcervo({
  musicaId,
  userId,
  youtubeUrl = null,
  cifra = null,
  confirmarMesmoLink = false,
  reativarDespublicada = false,
}) {
  const db = admin()

  const { data: musica, error } = await db
    .from('musicas')
    .select(
      'id, user_id, titulo, artista, youtube_url, acervo_versao_id, tom_original, bpm, intro, import_status',
    )
    .eq('id', musicaId)
    .maybeSingle()

  if (error) throw error
  if (!musica) {
    const err = new Error('Música não encontrada.')
    err.status = 404
    throw err
  }
  if (musica.user_id !== userId) {
    const err = new Error('Sem permissão para acessar esta música.')
    err.status = 403
    throw err
  }

  const rawYoutube = youtubeUrl || musica.youtube_url
  if (!String(rawYoutube || '').trim()) {
    const err = new Error(
      'Informe o link do YouTube para publicar no acervo da comunidade.',
    )
    err.status = 400
    throw err
  }

  const canonicalUrl = canonicalYoutubeUrlFromRaw(rawYoutube)

  // Guarda ANTES de qualquer escrita: despublicada e título divergente.
  const acervoPorUrl = await buscarAcervoPorFonteUrl(canonicalUrl)
  if (acervoPorUrl) {
    assertNaoDespublicadaSemReativar(acervoPorUrl, { reativarDespublicada })
    assertTituloCompativelComEntradaUrl({
      tituloCopia: musica.titulo,
      artistaCopia: musica.artista,
      acervoMusica: acervoPorUrl,
      confirmarMesmoLink,
    })
  }

  if (musica.youtube_url !== canonicalUrl) {
    const { error: ytErr } = await db
      .from('musicas')
      .update({ youtube_url: canonicalUrl })
      .eq('id', musicaId)
    if (ytErr) throw ytErr
  }

  let cifraSalva = cifra
  if (!cifraSalva?.secoes) {
    const { data: secoesRows, error: sErr } = await db
      .from('secoes_musica')
      .select('slug, nome, ordem_original, linhas')
      .eq('musica_id', musicaId)
      .order('ordem_original', { ascending: true })
    if (sErr) throw sErr
    cifraSalva = buildCifraSnapshot({
      tomOriginal: musica.tom_original,
      bpm: musica.bpm,
      intro: musica.intro || { lines: [] },
      secoes: secoesRows || [],
    })
  }

  if (musica.acervo_versao_id) {
    const { data: origem, error: oErr } = await db
      .from('acervo_versoes')
      .select('id, acervo_musica_id')
      .eq('id', musica.acervo_versao_id)
      .maybeSingle()
    if (oErr) throw oErr

    if (origem?.acervo_musica_id) {
      await garantirFonteUrlYoutube(origem.acervo_musica_id, canonicalUrl)
      const feedback = await registrarFeedbackSalvamento({
        acervoVersaoId: musica.acervo_versao_id,
        cifraSalva,
        userId,
      })
      return {
        tipo: feedback?.tipo || 'feedback',
        acervo_versao_id: feedback?.versaoId || musica.acervo_versao_id,
        acervo_musica_id: origem.acervo_musica_id,
        fonte_url: canonicalUrl,
        youtube_url: canonicalUrl,
      }
    }
  }

  let acervoMusica = acervoPorUrl
  if (!acervoMusica) {
    acervoMusica = await criarAcervoMusicaPendente({
      titulo: musica.titulo,
      artista: musica.artista,
      fonteUrl: canonicalUrl,
    })
  }

  const hash = hashCifraNorm(cifraSalva)
  const bpmVal = normalizeBpmForDb(cifraSalva?.bpm, musica.bpm)

  const { data: existente, error: findErr } = await db
    .from('acervo_versoes')
    .select('*')
    .eq('acervo_musica_id', acervoMusica.id)
    .eq('hash_norm', hash)
    .maybeSingle()
  if (findErr) throw findErr

  let versao
  let tipo
  if (existente) {
    await db
      .from('acervo_versoes')
      .update({ convergencia_count: (existente.convergencia_count || 0) + 1 })
      .eq('id', existente.id)
    versao = existente
    tipo = 'convergencia'
  } else {
    const origemVersao = acervoMusica.versao_top_id ? 'correcao' : 'curadoria'
    const { data: nova, error: insertErr } = await db
      .from('acervo_versoes')
      .insert({
        acervo_musica_id: acervoMusica.id,
        cifra: cifraSalva,
        tom_original: cifraSalva.tom_original || musica.tom_original || null,
        bpm: bpmVal,
        hash_norm: hash,
        origem: origemVersao,
        criado_por: userId,
        convergencia_count: 1,
        score: calcularScoreVersao({ aceitacao_count: 0, convergencia_count: 1 }),
      })
      .select()
      .single()
    if (insertErr) throw insertErr
    versao = nova
    tipo = 'publicacao'
  }

  await db.from('acervo_musicas').update({ status: 'ready' }).eq('id', acervoMusica.id)
  await recalcularVersaoTop(acervoMusica.id)
  await garantirFonteUrlYoutube(acervoMusica.id, canonicalUrl)

  const estavaDespublicada = acervoMusica.publicado === false
  if (estavaDespublicada && reativarDespublicada) {
    await aplicarRepublicacaoNaEntrada(acervoMusica.id, userId)
  }

  const importStatus =
    musica.import_status === 'pending' || musica.import_status === 'processing'
      ? 'ready'
      : musica.import_status

  const { error: linkErr } = await db
    .from('musicas')
    .update({
      acervo_versao_id: versao.id,
      youtube_url: canonicalUrl,
      import_status: importStatus,
    })
    .eq('id', musicaId)
  if (linkErr) throw linkErr

  return {
    tipo,
    acervo_versao_id: versao.id,
    acervo_musica_id: acervoMusica.id,
    fonte_url: canonicalUrl,
    youtube_url: canonicalUrl,
    reativada: Boolean(estavaDespublicada && reativarDespublicada),
  }
}

/**
 * Motor envia título/artista extraídos no PC — corrige placeholder no acervo e nas cópias pessoais.
 * Se titulo vier vazio/ausente, não altera nada.
 */
export async function aplicarMetadadosMotor({ acervoMusicaId, titulo, artista }) {
  const tituloTrim = String(titulo ?? '').trim()
  if (tituloTrim.length < 2) {
    return { atualizado: false, motivo: 'titulo_ausente' }
  }

  const artistaVal =
    artista == null || String(artista).trim() === '' ? null : String(artista).trim()

  const db = admin()
  const payload = {
    titulo: tituloTrim,
    artista: artistaVal,
    titulo_norm: normalizeAcervoText(tituloTrim),
    artista_norm: normalizeAcervoText(artistaVal),
  }

  const { error: acervoErr } = await db
    .from('acervo_musicas')
    .update(payload)
    .eq('id', acervoMusicaId)

  if (acervoErr) throw acervoErr

  const { data: jobs, error: jErr } = await db
    .from('import_jobs')
    .select('musica_id')
    .eq('acervo_musica_id', acervoMusicaId)
    .not('musica_id', 'is', null)

  if (jErr) throw jErr

  const musicaIds = [...new Set((jobs || []).map((j) => j.musica_id).filter(Boolean))]

  if (musicaIds.length) {
    const { error: musErr } = await db
      .from('musicas')
      .update({ titulo: tituloTrim, artista: artistaVal })
      .in('id', musicaIds)

    if (musErr) throw musErr
  }

  return {
    atualizado: true,
    titulo: tituloTrim,
    artista: artistaVal,
    musicas_atualizadas: musicaIds,
  }
}

/**
 * Preenche todas as cópias pessoais que aguardam esta entrada do acervo (fluxo passo 4).
 * Busca via import_jobs.acervo_musica_id → musicas com import_status pending/processing.
 */
export async function preencherMusicasAguardandoAcervo({
  acervoMusicaId,
  versaoId,
  cifra,
  tomOriginal,
  bpm,
}) {
  const db = admin()

  const { data: jobs, error: jErr } = await db
    .from('import_jobs')
    .select('id, musica_id')
    .eq('acervo_musica_id', acervoMusicaId)
    .not('musica_id', 'is', null)

  if (jErr) throw jErr

  const musicaIds = [...new Set((jobs || []).map((j) => j.musica_id).filter(Boolean))]
  const secoes = unpackCifraToSecoes(cifra)
  const tom = tomOriginal || cifra?.tom_original || null
  const bpmVal = normalizeBpmForDb(bpm, cifra?.bpm)

  const preenchidas = []
  const ignoradas = []

  for (const musicaId of musicaIds) {
    const { data: musica, error: mErr } = await db
      .from('musicas')
      .select('id, ministro_id, import_status, acervo_versao_id')
      .eq('id', musicaId)
      .maybeSingle()

    if (mErr || !musica) {
      ignoradas.push({ musicaId, reason: mErr?.message || 'not_found' })
      continue
    }

    if (!['pending', 'processing'].includes(musica.import_status)) {
      ignoradas.push({ musicaId, reason: 'not_waiting' })
      continue
    }

    if (musica.acervo_versao_id) {
      ignoradas.push({ musicaId, reason: 'already_has_versao' })
      continue
    }

    const { error: delErr } = await db.from('secoes_musica').delete().eq('musica_id', musicaId)
    if (delErr) throw delErr

    if (secoes.length) {
      const rows = secoes.map((sec, index) => ({
        slug: String(sec.slug || 'verso').slice(0, 30),
        nome: String(sec.nome || `Seção ${index + 1}`).slice(0, 50),
        ordem_original: Number(sec.ordem_original) || index,
        linhas: sec.linhas,
        musica_id: musicaId,
      }))
      const { error: insErr } = await db.from('secoes_musica').insert(rows)
      if (insErr) {
        console.error('[acervo] preencherMusicas insert secoes falhou:', {
          musicaId,
          code: insErr.code,
          message: insErr.message,
          details: insErr.details,
        })
        throw insErr
      }
    }

    const updateMusica = {
      tom_original: tom,
      bpm: bpmVal,
      acervo_versao_id: versaoId,
      import_status: 'ready',
      intro: null,
    }

    const { error: upErr } = await db.from('musicas').update(updateMusica).eq('id', musicaId)

    if (upErr) throw upErr

    if (musica.ministro_id && tom) {
      await db.from('musica_ministro').upsert(
        {
          musica_id: musicaId,
          ministro_id: musica.ministro_id,
          tom_atual: tom,
          semitone_offset: 0,
        },
        { onConflict: 'musica_id,ministro_id' },
      )
    }

    preenchidas.push(musicaId)
  }

  const { error: jobsErr } = await db
    .from('import_jobs')
    .update({
      status: 'completed',
      etapa: 'Cifra do acervo aplicada',
      progresso: 100,
    })
    .eq('acervo_musica_id', acervoMusicaId)
    .in('status', ['pending', 'processing'])

  if (jobsErr) throw jobsErr

  return {
    preenchidas,
    ignoradas,
    jobsAguardando: jobs?.length ?? 0,
  }
}

/** Falha no motor — libera fila e marca cópias pessoais aguardando. */
export async function registrarFalhaMotor({ acervoMusicaId, erro, jobId = null }) {
  const db = admin()
  const mensagem = String(erro || 'Falha no motor').slice(0, 500)

  await db
    .from('acervo_musicas')
    .update({ status: 'failed' })
    .eq('id', acervoMusicaId)

  await db
    .from('import_jobs')
    .update({
      status: 'failed',
      erro: mensagem,
      etapa: 'Falha na geração da cifra',
      progresso: 0,
    })
    .eq('acervo_musica_id', acervoMusicaId)
    .in('status', ['pending', 'processing'])

  const { data: jobs } = await db
    .from('import_jobs')
    .select('musica_id')
    .eq('acervo_musica_id', acervoMusicaId)
    .not('musica_id', 'is', null)

  const musicaIds = [...new Set((jobs || []).map((j) => j.musica_id).filter(Boolean))]
  if (musicaIds.length) {
    await db
      .from('musicas')
      .update({ import_status: 'failed' })
      .in('id', musicaIds)
      .in('import_status', ['pending', 'processing'])
  }

  return { acervoMusicaId, musicaIdsAtualizadas: musicaIds }
}

export async function recalcularVersaoTop(acervoMusicaId) {
  const db = admin()

  const { data: versoes, error } = await db
    .from('acervo_versoes')
    .select('*')
    .eq('acervo_musica_id', acervoMusicaId)

  if (error) throw error
  if (!versoes?.length) return null

  for (const v of versoes) {
    const score = calcularScoreVersao(v)
    if (Number(v.score) !== score) {
      await db.from('acervo_versoes').update({ score }).eq('id', v.id)
      v.score = score
    }
  }

  const top = [...versoes].sort(
    (a, b) => Number(b.score) - Number(a.score) || new Date(b.created_at) - new Date(a.created_at),
  )[0]

  await db
    .from('acervo_musicas')
    .update({ versao_top_id: top.id })
    .eq('id', acervoMusicaId)

  return top
}

/**
 * Fluxo 5.2 — usuário salvou cópia pessoal; alimenta ranking do acervo.
 */
export async function registrarFeedbackSalvamento({
  acervoVersaoId,
  cifraSalva,
  userId,
}) {
  if (!acervoVersaoId) return null

  const db = admin()

  const { data: origem, error: origemErr } = await db
    .from('acervo_versoes')
    .select('*')
    .eq('id', acervoVersaoId)
    .single()

  if (origemErr) throw origemErr

  if (cifrasEssencialmenteIguais(origem.cifra, cifraSalva)) {
    await db
      .from('acervo_versoes')
      .update({ aceitacao_count: (origem.aceitacao_count || 0) + 1 })
      .eq('id', acervoVersaoId)
    await recalcularVersaoTop(origem.acervo_musica_id)
    return { tipo: 'aceitacao', versaoId: acervoVersaoId }
  }

  const hash = hashCifraNorm(cifraSalva)

  const { data: existente, error: findErr } = await db
    .from('acervo_versoes')
    .select('*')
    .eq('acervo_musica_id', origem.acervo_musica_id)
    .eq('hash_norm', hash)
    .maybeSingle()

  if (findErr) throw findErr

  if (existente) {
    await db
      .from('acervo_versoes')
      .update({ convergencia_count: (existente.convergencia_count || 0) + 1 })
      .eq('id', existente.id)
    await recalcularVersaoTop(origem.acervo_musica_id)
    return { tipo: 'convergencia', versaoId: existente.id }
  }

  const score = calcularScoreVersao({ aceitacao_count: 0, convergencia_count: 1 })

  const { data: nova, error: insertErr } = await db
    .from('acervo_versoes')
    .insert({
      acervo_musica_id: origem.acervo_musica_id,
      cifra: cifraSalva,
      tom_original: cifraSalva.tom_original || null,
      bpm: cifraSalva.bpm ?? null,
      hash_norm: hash,
      origem: 'correcao',
      criado_por: userId,
      convergencia_count: 1,
      score,
    })
    .select()
    .single()

  if (insertErr) throw insertErr

  await recalcularVersaoTop(origem.acervo_musica_id)
  return { tipo: 'nova_correcao', versaoId: nova.id }
}

/**
 * Usuário possui cópia pessoal ligada à versão do acervo (musicas.acervo_versao_id).
 */
export async function usuarioPossuiCopiaLigadaAVersao({ userId, acervoVersaoId }) {
  if (!userId || !acervoVersaoId) return false

  const { data, error } = await admin()
    .from('musicas')
    .select('id')
    .eq('user_id', userId)
    .eq('acervo_versao_id', acervoVersaoId)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

/**
 * Etapa B — corrige tom_original na fonte (versão origem=motor).
 * Atualiza coluna tom_original, cifra.tom_original, hash_norm e auditoria.
 * cifra.secoes permanece intacta.
 */
export async function corrigirTomVersaoMotor({
  acervoVersaoId,
  tomOriginal,
  userId,
  permitirReCorrecao = false,
}) {
  if (!acervoVersaoId) {
    const err = new Error('acervoVersaoId é obrigatório.')
    err.status = 400
    throw err
  }
  if (!tomOriginal) {
    const err = new Error('tomOriginal é obrigatório.')
    err.status = 400
    throw err
  }

  const db = admin()

  const { data: versao, error: loadErr } = await db
    .from('acervo_versoes')
    .select('*')
    .eq('id', acervoVersaoId)
    .eq('origem', 'motor')
    .maybeSingle()

  if (loadErr) throw loadErr
  if (!versao) {
    const err = new Error('Versão motor não encontrada ou não é origem=motor.')
    err.status = 404
    throw err
  }

  if (!permitirReCorrecao && versao.tom_original_corrigido_em) {
    const err = new Error(
      'O tom desta música já foi corrigido na fonte. Envie um reporte se ainda estiver errado.',
    )
    err.status = 409
    err.code = 'FONTE_JA_CORRIGIDA'
    throw err
  }

  const cifraAntes = versao.cifra
  const hashSecoesAntes = hashSecoesNorm(cifraAntes)
  const hashNormAntes = versao.hash_norm || hashCifraNorm(cifraAntes)
  const tomAntes = versao.tom_original || cifraAntes?.tom_original || null

  const cifraDepois = aplicarTomOriginalNaCifra(cifraAntes, tomOriginal)
  const hashSecoesDepois = hashSecoesNorm(cifraDepois)
  const hashNormDepois = hashCifraNorm(cifraDepois)

  const prova = {
    hash_secoes_antes: hashSecoesAntes,
    hash_secoes_depois: hashSecoesDepois,
    secoes_inalteradas: hashSecoesAntes === hashSecoesDepois,
    tom_original_antes: tomAntes,
    tom_original_depois: tomOriginal,
    hash_norm_antes: hashNormAntes,
    hash_norm_depois: hashNormDepois,
    campos_cifra_alterados: ['tom_original'],
  }

  if (tomAntes === tomOriginal) {
    return {
      alterado: false,
      acervoVersaoId,
      prova,
    }
  }

  const corrigidoEm = new Date().toISOString()

  const { data: atualizada, error: updateErr } = await db
    .from('acervo_versoes')
    .update({
      tom_original: tomOriginal,
      cifra: cifraDepois,
      hash_norm: hashNormDepois,
      tom_original_corrigido_por: userId,
      tom_original_corrigido_em: corrigidoEm,
    })
    .eq('id', acervoVersaoId)
    .eq('origem', 'motor')
    .select()
    .single()

  if (updateErr) throw updateErr
  if (!atualizada) {
    const err = new Error('Versão motor não encontrada ou não é origem=motor.')
    err.status = 404
    throw err
  }

  return {
    alterado: true,
    acervoVersaoId: atualizada.id,
    tom_original: atualizada.tom_original,
    tom_original_corrigido_por: atualizada.tom_original_corrigido_por,
    tom_original_corrigido_em: atualizada.tom_original_corrigido_em,
    prova,
  }
}

/**
 * Resolve pedido (fluxo 5.1) — retorna hit com seções ou miss com acervo criado.
 */
export async function resolverPedidoAcervo({ titulo, artista, fonteUrl }) {
  const existente = await buscarAcervoMusica({ titulo, artista, fonteUrl })

  if (existente && existente.publicado === false) {
    assertNaoDespublicadaSemReativar(existente, { reativarDespublicada: false })
  }

  if (estaNoCatalogoPublico(existente) && existente.versao_top) {
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

  if (existente?.status === 'processing' || existente?.status === 'pending') {
    return { tipo: 'gerando', acervoMusica: existente }
  }

  if (existente?.status === 'failed') {
    await admin()
      .from('acervo_musicas')
      .update({ status: 'pending' })
      .eq('id', existente.id)
    return { tipo: 'gerando', acervoMusica: { ...existente, status: 'pending' } }
  }

  const criada = await criarAcervoMusicaPendente({ titulo, artista, fonteUrl })
  return { tipo: 'miss', acervoMusica: criada }
}

/**
 * Primeira versão gerada pelo motor (origem sagrada — não versao_top).
 * @param {string} acervoMusicaId
 */
export async function buscarVersaoMotorOriginal(acervoMusicaId) {
  const { data, error } = await admin()
    .from('acervo_versoes')
    .select('*')
    .eq('acervo_musica_id', acervoMusicaId)
    .eq('origem', 'motor')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Versão “fonte” para restaurar na edição:
 * 1) motor (se existir)
 * 2) primeira curadoria
 * 3) versao_top
 */
export async function buscarVersaoFonteOriginal(acervoMusicaId) {
  const motor = await buscarVersaoMotorOriginal(acervoMusicaId)
  if (motor?.cifra) return motor

  const { data: curadoria, error: cErr } = await admin()
    .from('acervo_versoes')
    .select('*')
    .eq('acervo_musica_id', acervoMusicaId)
    .eq('origem', 'curadoria')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (cErr) throw cErr
  if (curadoria?.cifra) return curadoria

  const { data: acervo, error: aErr } = await admin()
    .from('acervo_musicas')
    .select('versao_top_id')
    .eq('id', acervoMusicaId)
    .maybeSingle()
  if (aErr) throw aErr
  if (!acervo?.versao_top_id) return null

  const { data: top, error: tErr } = await admin()
    .from('acervo_versoes')
    .select('*')
    .eq('id', acervo.versao_top_id)
    .maybeSingle()
  if (tErr) throw tErr
  return top?.cifra ? top : null
}

async function resolverAcervoMusicaIdDaCopia(musica) {
  if (musica.acervo_versao_id) {
    const { data: versao, error } = await admin()
      .from('acervo_versoes')
      .select('acervo_musica_id')
      .eq('id', musica.acervo_versao_id)
      .maybeSingle()
    if (error) throw error
    if (versao?.acervo_musica_id) return versao.acervo_musica_id
  }

  const fonteUrl = String(musica.youtube_url || '').trim()
  if (fonteUrl) {
    const acervo = await buscarAcervoMusica({
      titulo: musica.titulo,
      artista: musica.artista,
      fonteUrl,
    })
    return acervo?.id ?? null
  }

  return null
}

function formatAutorVersao(versao, profilesById) {
  if (versao.origem === 'motor') {
    return { id: null, display_name: 'Motor CRASH' }
  }
  if (versao.origem === 'curadoria') {
    const profile = versao.criado_por ? profilesById[versao.criado_por] : null
    const name = String(profile?.display_name || '').trim()
    return {
      id: versao.criado_por || null,
      display_name: name || 'Curadoria',
    }
  }
  if (!versao.criado_por) {
    return { id: null, display_name: 'Anônimo' }
  }
  const profile = profilesById[versao.criado_por]
  const name = String(profile?.display_name || '').trim()
  return {
    id: versao.criado_por,
    display_name: name || 'Anônimo',
  }
}

async function carregarCopiaDoUsuario(musicaId, userId) {
  const { data: musica, error } = await admin()
    .from('musicas')
    .select('id, user_id, titulo, artista, youtube_url, acervo_versao_id, import_status')
    .eq('id', musicaId)
    .maybeSingle()

  if (error) throw error
  if (!musica) {
    const err = new Error('Música não encontrada.')
    err.status = 404
    throw err
  }
  if (musica.user_id !== userId) {
    const err = new Error('Sem permissão para acessar esta música.')
    err.status = 403
    throw err
  }
  return musica
}

async function usuarioTemAcessoAcervoMusica(userId, acervoMusicaId) {
  const { data: musicas, error } = await admin()
    .from('musicas')
    .select('id, user_id, titulo, artista, youtube_url, acervo_versao_id')
    .eq('user_id', userId)

  if (error) throw error

  for (const musica of musicas || []) {
    const id = await resolverAcervoMusicaIdDaCopia(musica)
    if (id === acervoMusicaId) return true
  }
  return false
}

const VERSAO_LISTAGEM_COLS =
  'id, acervo_musica_id, origem, tom_original, bpm, score, aceitacao_count, convergencia_count, criado_por, created_at'

/**
 * Lista metadados de todas as versões do acervo vinculado à cópia pessoal.
 * @param {{ musicaId: string, userId: string }}
 */
export async function listarVersoesAcervoCopia({ musicaId, userId }) {
  const musica = await carregarCopiaDoUsuario(musicaId, userId)
  const acervoMusicaId = await resolverAcervoMusicaIdDaCopia(musica)

  if (!acervoMusicaId) {
    const err = new Error('Esta música não está vinculada ao acervo.')
    err.status = 400
    throw err
  }

  const db = admin()

  const { data: acervoMusica, error: aErr } = await db
    .from('acervo_musicas')
    .select('id, titulo, artista, versao_top_id, status')
    .eq('id', acervoMusicaId)
    .maybeSingle()

  if (aErr) throw aErr
  if (!acervoMusica) {
    const err = new Error('Entrada do acervo não encontrada.')
    err.status = 404
    throw err
  }

  const versaoMotor = await buscarVersaoMotorOriginal(acervoMusicaId)
  const motorOriginalId = versaoMotor?.id ?? null
  const versaoTopId = acervoMusica.versao_top_id ?? null
  const suaVersaoAtualId = musica.acervo_versao_id ?? null

  const { data: versoes, error: vErr } = await db
    .from('acervo_versoes')
    .select(VERSAO_LISTAGEM_COLS)
    .eq('acervo_musica_id', acervoMusicaId)
    .order('score', { ascending: false })
    .order('created_at', { ascending: false })

  if (vErr) throw vErr

  const criadorIds = [
    ...new Set((versoes || []).map((v) => v.criado_por).filter(Boolean)),
  ]
  const profilesById = {}

  if (criadorIds.length) {
    const { data: profiles, error: pErr } = await db
      .from('profiles')
      .select('id, display_name')
      .in('id', criadorIds)
    if (pErr) throw pErr
    for (const profile of profiles || []) {
      profilesById[profile.id] = profile
    }
  }

  const items = (versoes || []).map((v) => ({
    id: v.id,
    origem: v.origem,
    tom_original: v.tom_original,
    bpm: v.bpm,
    score: Number(v.score),
    aceitacao_count: v.aceitacao_count ?? 0,
    convergencia_count: v.convergencia_count ?? 0,
    criado_por: v.criado_por,
    created_at: v.created_at,
    is_top: v.id === versaoTopId,
    is_motor_original: v.id === motorOriginalId,
    is_sua_versao_atual: v.id === suaVersaoAtualId,
    autor: formatAutorVersao(v, profilesById),
  }))

  return {
    acervo_musica_id: acervoMusicaId,
    acervo: {
      id: acervoMusica.id,
      titulo: acervoMusica.titulo,
      artista: acervoMusica.artista,
      status: acervoMusica.status,
      versao_top_id: versaoTopId,
    },
    versao_top_id: versaoTopId,
    versao_motor_original_id: motorOriginalId,
    sua_versao_atual_id: suaVersaoAtualId,
    versoes: items,
    total: items.length,
  }
}

/**
 * Cifra completa de uma versão do acervo (preview da vitrine).
 * @param {{ acervoVersaoId: string, userId: string }}
 */
export async function buscarVersaoAcervoDetalhe({ acervoVersaoId, userId }) {
  const db = admin()

  const { data: versao, error: vErr } = await db
    .from('acervo_versoes')
    .select('*')
    .eq('id', acervoVersaoId)
    .maybeSingle()

  if (vErr) throw vErr
  if (!versao) {
    const err = new Error('Versão do acervo não encontrada.')
    err.status = 404
    throw err
  }

  const permitido = await usuarioTemAcessoAcervoMusica(userId, versao.acervo_musica_id)
  if (!permitido) {
    const err = new Error('Sem permissão para visualizar esta versão.')
    err.status = 403
    throw err
  }

  const { data: acervoMusica, error: aErr } = await db
    .from('acervo_musicas')
    .select('id, titulo, artista, versao_top_id, status')
    .eq('id', versao.acervo_musica_id)
    .maybeSingle()

  if (aErr) throw aErr

  const versaoMotor = await buscarVersaoMotorOriginal(versao.acervo_musica_id)
  const profilesById = {}

  if (versao.criado_por) {
    const { data: profile, error: pErr } = await db
      .from('profiles')
      .select('id, display_name')
      .eq('id', versao.criado_por)
      .maybeSingle()
    if (pErr) throw pErr
    if (profile) profilesById[profile.id] = profile
  }

  return {
    id: versao.id,
    acervo_musica_id: versao.acervo_musica_id,
    origem: versao.origem,
    tom_original: versao.tom_original,
    bpm: versao.bpm,
    score: Number(versao.score),
    aceitacao_count: versao.aceitacao_count ?? 0,
    convergencia_count: versao.convergencia_count ?? 0,
    criado_por: versao.criado_por,
    created_at: versao.created_at,
    is_top: versao.id === acervoMusica?.versao_top_id,
    is_motor_original: versao.id === versaoMotor?.id,
    autor: formatAutorVersao(versao, profilesById),
    cifra: versao.cifra,
    secoes: unpackCifraToSecoes(versao.cifra),
    acervo: acervoMusica
      ? {
          id: acervoMusica.id,
          titulo: acervoMusica.titulo,
          artista: acervoMusica.artista,
          status: acervoMusica.status,
          versao_top_id: acervoMusica.versao_top_id,
        }
      : null,
  }
}

/**
 * Substitui seções e metadados da cópia pessoal a partir de uma versão do acervo (SELECT no acervo).
 * @param {{ musicaId: string, musica: object, versao: object, acervoMusicaId: string }}
 */
async function aplicarVersaoAcervoNaCopiaPessoal({ musicaId, musica, versao, acervoMusicaId }) {
  const db = admin()

  if (!versao?.cifra) {
    const err = new Error('Versão do acervo sem cifra.')
    err.status = 404
    throw err
  }

  const cifra = versao.cifra
  const secoes = unpackCifraToSecoes(cifra)
  const tom = versao.tom_original || cifra.tom_original || null
  const bpmVal = normalizeBpmForDb(versao.bpm, cifra.bpm)
  const intro = null

  const { error: delErr } = await db.from('secoes_musica').delete().eq('musica_id', musicaId)
  if (delErr) throw delErr

  if (secoes.length) {
    const rows = secoes.map((sec, index) => ({
      slug: String(sec.slug || 'verso').slice(0, 30),
      nome: String(sec.nome || `Seção ${index + 1}`).slice(0, 50),
      ordem_original: Number.isFinite(Number(sec.ordem_original))
        ? Number(sec.ordem_original)
        : index,
      linhas: sec.linhas || { lines: [] },
      musica_id: musicaId,
    }))
    const { error: insErr } = await db.from('secoes_musica').insert(rows)
    if (insErr) throw insErr
  }

  const updateMusica = {
    tom_original: tom,
    bpm: bpmVal,
    intro,
    acervo_versao_id: versao.id,
    import_status: musica.import_status === 'pending' ? 'ready' : musica.import_status,
  }

  const { error: upErr } = await db.from('musicas').update(updateMusica).eq('id', musicaId)
  if (upErr) throw upErr

  const { data: secoesSalvas, error: sErr } = await db
    .from('secoes_musica')
    .select('*')
    .eq('musica_id', musicaId)
    .order('ordem_original', { ascending: true })

  if (sErr) throw sErr

  return {
    tom_original: tom,
    bpm: bpmVal,
    intro,
    acervo_versao_id: versao.id,
    acervo_musica_id: acervoMusicaId,
    secoes: secoesSalvas ?? [],
  }
}

/**
 * Substitui a cópia pessoal por uma versão escolhida do mesmo acervo (read-only no acervo).
 * @param {{ musicaId: string, acervoVersaoId: string, userId: string }}
 */
export async function restaurarCopiaPessoalDaVersao({ musicaId, acervoVersaoId, userId }) {
  const musica = await carregarCopiaDoUsuario(musicaId, userId)

  const acervoMusicaId = await resolverAcervoMusicaIdDaCopia(musica)
  if (!acervoMusicaId) {
    const err = new Error('Esta música não está vinculada ao acervo.')
    err.status = 400
    throw err
  }

  const { data: versao, error: vErr } = await admin()
    .from('acervo_versoes')
    .select('*')
    .eq('id', acervoVersaoId)
    .maybeSingle()

  if (vErr) throw vErr
  if (!versao) {
    const err = new Error('Versão do acervo não encontrada.')
    err.status = 404
    throw err
  }
  if (versao.acervo_musica_id !== acervoMusicaId) {
    const err = new Error('Esta versão não pertence ao acervo desta música.')
    err.status = 400
    throw err
  }

  return aplicarVersaoAcervoNaCopiaPessoal({
    musicaId,
    musica,
    versao,
    acervoMusicaId,
  })
}

/**
 * Substitui a cópia pessoal pela cifra fonte do acervo:
 * motor (se houver) ou curadoria publicada na Conta.
 * @param {{ musicaId: string, userId: string }}
 */
export async function restaurarCopiaPessoalDoMotor({ musicaId, userId }) {
  const musica = await carregarCopiaDoUsuario(musicaId, userId)

  const acervoMusicaId = await resolverAcervoMusicaIdDaCopia(musica)
  if (!acervoMusicaId) {
    const err = new Error('Esta música não está vinculada ao acervo.')
    err.status = 400
    throw err
  }

  const versaoFonte = await buscarVersaoFonteOriginal(acervoMusicaId)
  if (!versaoFonte?.cifra) {
    const err = new Error(
      'Nenhuma cifra fonte no acervo para esta música. Publique pela Curadoria (Conta) com o mesmo link do YouTube, ou aguarde o motor.',
    )
    err.status = 404
    throw err
  }

  const result = await aplicarVersaoAcervoNaCopiaPessoal({
    musicaId,
    musica,
    versao: versaoFonte,
    acervoMusicaId,
  })

  return {
    ...result,
    versao_motor_id: versaoFonte.origem === 'motor' ? versaoFonte.id : null,
    versao_fonte_id: versaoFonte.id,
    origem_fonte: versaoFonte.origem,
  }
}

/**
 * Cópias pessoais ligadas a qualquer versão desta entrada do acervo.
 * @param {string} acervoMusicaId
 * @returns {Promise<Array<{ id: string, youtube_url: string|null, titulo: string|null }>>}
 */
async function listarCopiasLigadasAcervoMusica(acervoMusicaId) {
  const db = admin()
  const { data: versoes, error: vErr } = await db
    .from('acervo_versoes')
    .select('id')
    .eq('acervo_musica_id', acervoMusicaId)
  if (vErr) throw vErr
  const versaoIds = (versoes || []).map((v) => v.id)
  if (!versaoIds.length) return []

  const { data: musicas, error: mErr } = await db
    .from('musicas')
    .select('id, youtube_url, titulo')
    .in('acervo_versao_id', versaoIds)
  if (mErr) throw mErr
  return musicas || []
}

async function snapshotProvaVersoes(acervoMusicaId) {
  const db = admin()
  const { data: versoes, error } = await db
    .from('acervo_versoes')
    .select('id, hash_norm, cifra')
    .eq('acervo_musica_id', acervoMusicaId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (versoes || []).map((v) => ({
    id: v.id,
    hash_norm: v.hash_norm || hashCifraNorm(v.cifra),
    hash_secoes: hashSecoesNorm(v.cifra),
  }))
}

async function snapshotProvaCopias(musicaIds) {
  if (!musicaIds.length) return []
  const db = admin()
  const { data: musicas, error: mErr } = await db
    .from('musicas')
    .select('id, tom_original, bpm')
    .in('id', musicaIds)
  if (mErr) throw mErr

  const { data: secoes, error: sErr } = await db
    .from('secoes_musica')
    .select('musica_id, slug, nome, ordem_original, linhas')
    .in('musica_id', musicaIds)
    .order('ordem_original', { ascending: true })
  if (sErr) throw sErr

  const secoesPorMusica = new Map()
  for (const sec of secoes || []) {
    const list = secoesPorMusica.get(sec.musica_id) || []
    list.push({
      slug: sec.slug,
      nome: sec.nome,
      ordem_original: sec.ordem_original,
      linhas: sec.linhas || { lines: [] },
    })
    secoesPorMusica.set(sec.musica_id, list)
  }

  return (musicas || []).map((m) => {
    const cifra = buildCifraSnapshotFromMusica({
      tomOriginal: m.tom_original,
      bpm: m.bpm,
      secoes: secoesPorMusica.get(m.id) || [],
    })
    return {
      id: m.id,
      hash_secoes: hashSecoesNorm(cifra),
      hash_norm: hashCifraNorm(cifra),
    }
  })
}

/**
 * Preview admin: quantas cópias seriam afetadas ao corrigir fonte_url, e conflito do URL novo.
 */
export async function impactoMetadadosAcervoMusica({
  acervoMusicaId,
  fonteUrlNova = null,
}) {
  if (!acervoMusicaId) {
    const err = new Error('acervoMusicaId é obrigatório.')
    err.status = 400
    throw err
  }

  const db = admin()
  const { data: musica, error } = await db
    .from('acervo_musicas')
    .select(
      'id, titulo, artista, fonte_url, titulo_norm, artista_norm, status, metadados_corrigido_em',
    )
    .eq('id', acervoMusicaId)
    .maybeSingle()
  if (error) throw error
  if (!musica) {
    const err = new Error('Entrada do acervo não encontrada.')
    err.status = 404
    throw err
  }

  const copias = await listarCopiasLigadasAcervoMusica(acervoMusicaId)
  const fonteAtual = musica.fonte_url || null
  const elegiveis = copias.filter(
    (c) => fonteAtual && c.youtube_url && c.youtube_url === fonteAtual,
  )

  let fonteUrlNovaCanonical = null
  let conflito = null
  const rawNova = String(fonteUrlNova || '').trim()
  if (rawNova) {
    fonteUrlNovaCanonical = canonicalYoutubeUrlFromRaw(rawNova)
    if (fonteUrlNovaCanonical !== fonteAtual) {
      const outra = await buscarAcervoPorFonteUrl(fonteUrlNovaCanonical)
      if (outra && outra.id !== acervoMusicaId) {
        conflito = {
          id: outra.id,
          titulo: outra.titulo,
          artista: outra.artista,
          fonte_url: outra.fonte_url,
          rotulo: rotuloEntradaAcervo(outra),
        }
      }
    }
  }

  return {
    musica: {
      id: musica.id,
      titulo: musica.titulo,
      artista: musica.artista,
      fonte_url: musica.fonte_url,
      titulo_norm: musica.titulo_norm,
      artista_norm: musica.artista_norm,
      status: musica.status,
    },
    copias_ligadas: copias.length,
    elegiveis_propagacao: elegiveis.length,
    elegiveis_ids: elegiveis.map((c) => c.id),
    fonte_url_nova: fonteUrlNovaCanonical,
    conflito,
  }
}

/**
 * Admin — corrige metadados da entrada (fonte_url / titulo / artista).
 * Nunca escreve em acervo_versoes.cifra nem em secoes_musica.
 * Propagação opcional: só musicas.youtube_url quando igual ao fonte_url antigo.
 */
export async function corrigirMetadadosAcervoMusica({
  acervoMusicaId,
  fonteUrl,
  titulo,
  artista,
  propagarYoutube = true,
  userId,
}) {
  if (!acervoMusicaId) {
    const err = new Error('acervoMusicaId é obrigatório.')
    err.status = 400
    throw err
  }
  if (!userId) {
    const err = new Error('userId é obrigatório.')
    err.status = 400
    throw err
  }

  const temFonte = fonteUrl !== undefined
  const temTitulo = titulo !== undefined
  const temArtista = artista !== undefined
  if (!temFonte && !temTitulo && !temArtista) {
    const err = new Error('Informe fonte_url, titulo e/ou artista para corrigir.')
    err.status = 400
    throw err
  }

  const db = admin()
  const { data: row, error: loadErr } = await db
    .from('acervo_musicas')
    .select(
      'id, titulo, artista, titulo_norm, artista_norm, fonte_url, status',
    )
    .eq('id', acervoMusicaId)
    .maybeSingle()
  if (loadErr) throw loadErr
  if (!row) {
    const err = new Error('Entrada do acervo não encontrada.')
    err.status = 404
    throw err
  }

  const update = {}
  const antes = {}

  if (temFonte) {
    const canonical = canonicalYoutubeUrlFromRaw(fonteUrl)
    if (canonical !== row.fonte_url) {
      const outra = await buscarAcervoPorFonteUrl(canonical)
      if (outra && outra.id !== acervoMusicaId) {
        const err = new Error(
          `Este link do YouTube já está em uso por «${rotuloEntradaAcervo(outra)}».`,
        )
        err.status = 409
        err.code = 'FONTE_URL_EM_USO'
        err.conflito = {
          id: outra.id,
          titulo: outra.titulo,
          artista: outra.artista,
          fonte_url: outra.fonte_url,
          rotulo: rotuloEntradaAcervo(outra),
        }
        throw err
      }
      antes.fonte_url = row.fonte_url
      update.fonte_url = canonical
    }
  }

  if (temTitulo) {
    const tituloTrim = String(titulo ?? '').trim()
    if (tituloTrim.length < 1) {
      const err = new Error('titulo não pode ser vazio.')
      err.status = 400
      throw err
    }
    if (tituloTrim !== row.titulo) {
      antes.titulo = row.titulo
      antes.titulo_norm = row.titulo_norm
      update.titulo = tituloTrim
      update.titulo_norm = normalizeAcervoText(tituloTrim)
    }
  }

  if (temArtista) {
    const artistaVal =
      artista == null || String(artista).trim() === ''
        ? null
        : String(artista).trim()
    if (artistaVal !== row.artista) {
      antes.artista = row.artista
      antes.artista_norm = row.artista_norm
      update.artista = artistaVal
      update.artista_norm = normalizeAcervoText(artistaVal)
    }
  }

  const copias = await listarCopiasLigadasAcervoMusica(acervoMusicaId)
  const copiaIds = copias.map((c) => c.id)
  const provaVersoesAntes = await snapshotProvaVersoes(acervoMusicaId)
  const provaCopiasAntes = await snapshotProvaCopias(copiaIds)

  if (!Object.keys(update).length) {
    return {
      alterado: false,
      musica: row,
      antes: {},
      propagacao_youtube: {
        solicitada: false,
        copias_ligadas: copias.length,
        elegiveis: 0,
        atualizadas: 0,
        ids: [],
      },
      prova: montarProvaMetadados({
        versoesAntes: provaVersoesAntes,
        versoesDepois: provaVersoesAntes,
        copiasAntes: provaCopiasAntes,
        copiasDepois: provaCopiasAntes,
        camposAlterados: [],
      }),
    }
  }

  const corrigidoEm = new Date().toISOString()
  const payload = {
    ...update,
    metadados_corrigido_por: userId,
    metadados_corrigido_em: corrigidoEm,
    metadados_corrigido_antes: antes,
  }

  const { data: atualizada, error: upErr } = await db
    .from('acervo_musicas')
    .update(payload)
    .eq('id', acervoMusicaId)
    .select(
      'id, titulo, artista, titulo_norm, artista_norm, fonte_url, status, metadados_corrigido_por, metadados_corrigido_em, metadados_corrigido_antes',
    )
    .single()
  if (upErr) throw upErr

  const fonteAntiga = antes.fonte_url
  const fonteNova = update.fonte_url
  const querPropagar = Boolean(fonteNova) && propagarYoutube !== false
  const elegiveis = querPropagar
    ? copias.filter(
        (c) => fonteAntiga && c.youtube_url && c.youtube_url === fonteAntiga,
      )
    : []
  const elegiveisIds = elegiveis.map((c) => c.id)

  if (elegiveisIds.length) {
    const { error: ytErr } = await db
      .from('musicas')
      .update({ youtube_url: fonteNova })
      .in('id', elegiveisIds)
    if (ytErr) throw ytErr
  }

  const provaVersoesDepois = await snapshotProvaVersoes(acervoMusicaId)
  const provaCopiasDepois = await snapshotProvaCopias(copiaIds)
  const prova = montarProvaMetadados({
    versoesAntes: provaVersoesAntes,
    versoesDepois: provaVersoesDepois,
    copiasAntes: provaCopiasAntes,
    copiasDepois: provaCopiasDepois,
    camposAlterados: Object.keys(update),
  })

  if (!prova.cifra_intacta) {
    const err = new Error(
      'Prova falhou: hashes de cifra/seções mudaram após correção de metadados.',
    )
    err.status = 500
    err.prova = prova
    throw err
  }

  return {
    alterado: true,
    musica: atualizada,
    antes,
    propagacao_youtube: {
      solicitada: querPropagar,
      copias_ligadas: copias.length,
      elegiveis: elegiveisIds.length,
      atualizadas: elegiveisIds.length,
      ids: elegiveisIds,
    },
    prova,
  }
}

/**
 * Admin — soft-unpublish: some do catálogo (busca/Explorar/atalho).
 * Não apaga versões, não toca cifras, não altera cópias pessoais.
 */
export async function despublicarAcervoMusica({ acervoMusicaId, userId }) {
  if (!acervoMusicaId) {
    const err = new Error('acervoMusicaId é obrigatório.')
    err.status = 400
    throw err
  }
  if (!userId) {
    const err = new Error('userId é obrigatório.')
    err.status = 400
    throw err
  }

  const db = admin()
  const { data: row, error } = await db
    .from('acervo_musicas')
    .select(
      'id, titulo, artista, fonte_url, status, publicado, despublicado_por, despublicado_em, republicado_por, republicado_em',
    )
    .eq('id', acervoMusicaId)
    .maybeSingle()
  if (error) throw error
  if (!row) {
    const err = new Error('Entrada do acervo não encontrada.')
    err.status = 404
    throw err
  }

  if (row.publicado === false) {
    return {
      alterado: false,
      musica: row,
      mensagem: 'Entrada já estava despublicada.',
    }
  }

  const agora = new Date().toISOString()
  const { data: atualizada, error: upErr } = await db
    .from('acervo_musicas')
    .update({
      publicado: false,
      despublicado_por: userId,
      despublicado_em: agora,
    })
    .eq('id', acervoMusicaId)
    .select(
      'id, titulo, artista, fonte_url, status, publicado, despublicado_por, despublicado_em, republicado_por, republicado_em',
    )
    .single()
  if (upErr) throw upErr

  return {
    alterado: true,
    musica: atualizada,
    efeito:
      'Sumiu da busca, do Explorar e do atalho por URL. Cópias nas pastas dos ministros continuam intactas.',
  }
}

/**
 * Admin — devolve a entrada ao catálogo (publicado=true). Cifra intacta.
 */
export async function republicarAcervoMusica({ acervoMusicaId, userId }) {
  if (!acervoMusicaId) {
    const err = new Error('acervoMusicaId é obrigatório.')
    err.status = 400
    throw err
  }
  if (!userId) {
    const err = new Error('userId é obrigatório.')
    err.status = 400
    throw err
  }

  const db = admin()
  const { data: row, error } = await db
    .from('acervo_musicas')
    .select(
      'id, titulo, artista, fonte_url, status, publicado, despublicado_por, despublicado_em, republicado_por, republicado_em',
    )
    .eq('id', acervoMusicaId)
    .maybeSingle()
  if (error) throw error
  if (!row) {
    const err = new Error('Entrada do acervo não encontrada.')
    err.status = 404
    throw err
  }

  if (row.publicado !== false) {
    return {
      alterado: false,
      musica: row,
      mensagem: 'Entrada já estava publicada no catálogo.',
    }
  }

  const agora = new Date().toISOString()
  const { data: atualizada, error: upErr } = await db
    .from('acervo_musicas')
    .update({
      publicado: true,
      republicado_por: userId,
      republicado_em: agora,
    })
    .eq('id', acervoMusicaId)
    .select(
      'id, titulo, artista, fonte_url, status, publicado, despublicado_por, despublicado_em, republicado_por, republicado_em',
    )
    .single()
  if (upErr) throw upErr

  return {
    alterado: true,
    musica: atualizada,
    efeito: 'Voltou à busca, ao Explorar e ao atalho por URL.',
  }
}

function montarProvaMetadados({
  versoesAntes,
  versoesDepois,
  copiasAntes,
  copiasDepois,
  camposAlterados,
}) {
  const porIdDepois = new Map(versoesDepois.map((v) => [v.id, v]))
  const versoes = versoesAntes.map((antes) => {
    const depois = porIdDepois.get(antes.id) || antes
    return {
      id: antes.id,
      hash_norm_antes: antes.hash_norm,
      hash_norm_depois: depois.hash_norm,
      hash_secoes_antes: antes.hash_secoes,
      hash_secoes_depois: depois.hash_secoes,
      inalterada:
        antes.hash_norm === depois.hash_norm &&
        antes.hash_secoes === depois.hash_secoes,
    }
  })

  const copiasPorId = new Map(copiasDepois.map((c) => [c.id, c]))
  const copias = copiasAntes.map((antes) => {
    const depois = copiasPorId.get(antes.id) || antes
    return {
      id: antes.id,
      hash_secoes_antes: antes.hash_secoes,
      hash_secoes_depois: depois.hash_secoes,
      hash_norm_antes: antes.hash_norm,
      hash_norm_depois: depois.hash_norm,
      inalterada:
        antes.hash_secoes === depois.hash_secoes &&
        antes.hash_norm === depois.hash_norm,
    }
  })

  const cifraIntacta =
    versoes.every((v) => v.inalterada) && copias.every((c) => c.inalterada)

  return {
    cifra_intacta: cifraIntacta,
    versoes,
    copias,
    campos_acervo_alterados: camposAlterados,
    escreveu_em_acervo_versoes_cifra: false,
    escreveu_em_secoes: false,
  }
}

export { buildCifraSnapshot, unpackCifraToSecoes, hashCifraNorm }
