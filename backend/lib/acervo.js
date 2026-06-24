import {
  buildCifraSnapshot,
  calcularScoreVersao,
  cifrasEssencialmenteIguais,
  hashCifraNorm,
  normalizeAcervoText,
  unpackCifraToSecoes,
} from '@crash-cifras/shared'
import { getSupabaseAdmin } from './supabase.js'

function admin() {
  return getSupabaseAdmin()
}

/** Intro do card mãos esquerda/direita (formato musicas.intro). */
function introMaosTemConteudo(intro) {
  if (!intro || typeof intro !== 'object') return false
  return Boolean(
    String(intro.mao_esquerda ?? '').trim() || String(intro.mao_direita ?? '').trim(),
  )
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
  const introMotor = cifra?.intro || null

  const preenchidas = []
  const ignoradas = []

  for (const musicaId of musicaIds) {
    const { data: musica, error: mErr } = await db
      .from('musicas')
      .select('id, ministro_id, import_status, acervo_versao_id, intro')
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
    }

    if (!introMaosTemConteudo(musica.intro) && introMaosTemConteudo(introMotor)) {
      updateMusica.intro = {
        mao_esquerda: String(introMotor.mao_esquerda ?? '').trim(),
        mao_direita: String(introMotor.mao_direita ?? '').trim() || '',
      }
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
 * Resolve pedido (fluxo 5.1) — retorna hit com seções ou miss com acervo criado.
 */
export async function resolverPedidoAcervo({ titulo, artista, fonteUrl }) {
  const existente = await buscarAcervoMusica({ titulo, artista, fonteUrl })

  if (existente?.status === 'ready' && existente.versao_top) {
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

export { buildCifraSnapshot, unpackCifraToSecoes, hashCifraNorm }
