import {
  buildCifraSnapshot,
  calcularScoreVersao,
  cifrasEssencialmenteIguais,
  hashCifraNorm,
  normalizeAcervoText,
  unpackCifraToSecoes,
} from '@crash-cifras/shared/acervo'
import { getSupabaseAdmin } from './supabase.js'

function admin() {
  return getSupabaseAdmin()
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

  const { data: versao, error: versaoErr } = await db
    .from('acervo_versoes')
    .insert({
      acervo_musica_id: acervoMusicaId,
      cifra,
      tom_original: tomOriginal || cifra.tom_original || null,
      bpm: bpm ?? cifra.bpm ?? null,
      hash_norm: hash,
      origem: 'motor',
      criado_por: criadoPor,
      score: calcularScoreVersao({ aceitacao_count: 0, convergencia_count: 0 }),
    })
    .select()
    .single()

  if (versaoErr) throw versaoErr

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
  const bpmVal = bpm ?? cifra?.bpm ?? null
  const intro = cifra?.intro || null

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
      const rows = secoes.map((sec) => ({
        slug: sec.slug,
        nome: sec.nome,
        ordem_original: sec.ordem_original,
        linhas: sec.linhas,
        musica_id: musicaId,
      }))
      const { error: insErr } = await db.from('secoes_musica').insert(rows)
      if (insErr) throw insErr
    }

    const { error: upErr } = await db
      .from('musicas')
      .update({
        tom_original: tom,
        bpm: bpmVal,
        intro,
        acervo_versao_id: versaoId,
        import_status: 'ready',
      })
      .eq('id', musicaId)

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
