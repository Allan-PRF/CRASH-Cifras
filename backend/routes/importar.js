import { Router } from 'express'
import youtubedl from 'youtube-dl-exec'
import { validateYoutubeUrl } from '@crash-cifras/shared/validate-youtube-url'
import { requireAuth } from '../lib/supabase.js'
import { resolverPedidoAcervo } from '../lib/acervo.js'
import { ytdlpOptions } from '../lib/ytdlp.js'

export const importarRouter = Router()

const LOG_IMPORT = '[importar]'
const BPM_PADRAO_IMPORT = 72

export class ImportNeedsInputError extends Error {
  constructor(message, job) {
    super(message)
    this.name = 'ImportNeedsInputError'
    this.job = job
  }
}

export class ImportFriendlyError extends Error {
  constructor(message, job = null) {
    super(message)
    this.name = 'ImportFriendlyError'
    this.job = job
  }
}

function logImport(...args) {
  console.log(LOG_IMPORT, ...args)
}

async function createJob(supabase, { userId, youtubeUrl, acervoMusicaId = null }) {
  const { data, error } = await supabase
    .from('import_jobs')
    .insert({
      user_id: userId,
      youtube_url: youtubeUrl,
      acervo_musica_id: acervoMusicaId,
      status: 'pending',
      etapa: 'Recebido',
      progresso: 5,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function updateJob(supabase, jobId, updates) {
  const { error } = await supabase.from('import_jobs').update(updates).eq('id', jobId)
  if (error) throw error
}

function titleFromYoutubeUrl(url) {
  try {
    const parsed = new URL(url)
    const id = parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop()
    return id ? `Importação ${id}` : 'Música importada'
  } catch {
    return 'Música importada'
  }
}

function isValidYoutubeUrl(url) {
  return validateYoutubeUrl(url).valid
}

function formatDuration(seconds) {
  if (!seconds || Number.isNaN(Number(seconds))) return null
  const total = Number(seconds)
  const minutes = Math.floor(total / 60)
  const secs = Math.floor(total % 60)
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

function metadadosManuaisValidos(titulo, artista) {
  return String(titulo || '').trim().length >= 2 && String(artista || '').trim().length >= 2
}

function buildMetadadosFromManual({ titulo, artista }) {
  const t = String(titulo).trim()
  const a = String(artista).trim()
  return {
    titulo: t,
    artista: a,
    fonteMetadados: 'manual',
  }
}

/**
 * Metadados sem yt-dlp: manual completo, parcial ou placeholder pelo videoId.
 */
function resolverMetadadosImportacao({ youtubeUrl, tituloManual, artistaManual, videoId }) {
  if (metadadosManuaisValidos(tituloManual, artistaManual)) {
    const metadados = buildMetadadosFromManual({
      titulo: tituloManual,
      artista: artistaManual,
    })
    logImport('metadados: nome/artista informados', metadados)
    return metadados
  }

  const tituloParcial = String(tituloManual || '').trim()
  const artistaParcial = String(artistaManual || '').trim()

  if (tituloParcial.length >= 2) {
    const metadados = {
      titulo: tituloParcial,
      artista: artistaParcial,
      fonteMetadados: 'parcial',
    }
    logImport('metadados: título parcial', metadados)
    return metadados
  }

  if (artistaParcial.length >= 2) {
    const metadados = {
      titulo: videoId ? `Importação ${videoId}` : titleFromYoutubeUrl(youtubeUrl),
      artista: artistaParcial,
      fonteMetadados: 'parcial',
    }
    logImport('metadados: artista parcial', metadados)
    return metadados
  }

  const metadados = {
    titulo: videoId ? `Importação ${videoId}` : titleFromYoutubeUrl(youtubeUrl),
    artista: '',
    fonteMetadados: 'placeholder',
  }
  logImport('metadados: placeholder (sem yt-dlp)', metadados)
  return metadados
}

function buildResultadoImportacao({ metadados, youtubeUrl, ministroId, aguardandoMotor = false }) {
  return {
    musica: {
      ministro_id: ministroId || null,
      titulo: metadados.titulo,
      artista: metadados.artista || null,
      youtube_url: youtubeUrl,
      bpm: BPM_PADRAO_IMPORT,
      tom_original: null,
      import_status: aguardandoMotor ? 'processing' : 'pending',
    },
    secoes: [],
  }
}

function normalizeSearchEntry(entry) {
  const rawId = entry.id || entry.url
  let videoId = null
  if (rawId && /^[a-zA-Z0-9_-]{11}$/.test(String(rawId))) {
    videoId = String(rawId)
  } else if (rawId) {
    const parsed = validateYoutubeUrl(
      entry.webpage_url || entry.url || String(rawId),
    )
    if (parsed.valid) videoId = parsed.videoId
  }
  const url =
    entry.webpage_url ||
    entry.url ||
    (videoId ? `https://www.youtube.com/watch?v=${videoId}` : null)
  const thumbnail =
    entry.thumbnail ||
    entry.thumbnails?.at?.(-1)?.url ||
    (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null)

  return {
    id: videoId || url,
    youtubeUrl: url,
    titulo: entry.title || 'Vídeo sem título',
    canal: entry.channel || entry.uploader || entry.creator || 'YouTube',
    duracao: formatDuration(entry.duration),
    thumbnail,
  }
}

/** Busca no YouTube via yt-dlp — usada pela busca por voz/texto no frontend. */
async function buscarYoutube(query) {
  const result = await youtubedl(
    `ytsearch8:${query}`,
    ytdlpOptions({
      dumpSingleJson: true,
      skipDownload: true,
    }),
  )

  const entries = Array.isArray(result.entries) ? result.entries : [result]
  return entries
    .map(normalizeSearchEntry)
    .filter((entry) => entry.youtubeUrl && isValidYoutubeUrl(entry.youtubeUrl))
}

async function executarPipelineYoutube(
  supabase,
  { job, youtubeUrl, ministroId, tituloManual = null, artistaManual = null, useAcervo = true },
) {
  await supabase
    .from('import_jobs')
    .update({ status: 'processing', etapa: 'Validando link do YouTube', progresso: 15 })
    .eq('id', job.id)

  const validation = validateYoutubeUrl(youtubeUrl)
  if (!validation.valid) {
    throw new ImportFriendlyError(validation.error || 'Link do YouTube inválido')
  }

  const canonicalUrl = `https://www.youtube.com/watch?v=${validation.videoId}`

  await updateJob(supabase, job.id, {
    etapa: 'Preparando cadastro da música',
    progresso: 40,
  })

  const metadados = resolverMetadadosImportacao({
    youtubeUrl: canonicalUrl,
    tituloManual,
    artistaManual,
    videoId: validation.videoId,
  })

  let acervoPedido = null
  if (useAcervo) {
    try {
      acervoPedido = await resolverPedidoAcervo({
        titulo: metadados.titulo,
        artista: metadados.artista,
        fonteUrl: canonicalUrl,
      })
      logImport('acervo:', acervoPedido?.tipo, acervoPedido?.acervoMusica?.id)
    } catch (err) {
      logImport('acervo lookup falhou (continua link-only):', err.message)
    }
  }

  if (acervoPedido?.tipo === 'hit') {
    await updateJob(supabase, job.id, {
      etapa: 'Cifra do acervo — pronta',
      progresso: 90,
      acervo_musica_id: acervoPedido.acervoMusica.id,
    })

    return {
      type: 'success',
      data: {
        musica: {
          ministro_id: ministroId || null,
          titulo: metadados.titulo,
          artista: metadados.artista || null,
          youtube_url: canonicalUrl,
          bpm: acervoPedido.bpm || BPM_PADRAO_IMPORT,
          tom_original: acervoPedido.tomOriginal,
          import_status: 'ready',
          acervo_versao_id: acervoPedido.acervoVersaoId,
        },
        secoes: acervoPedido.secoes,
        acervo_musica_id: acervoPedido.acervoMusica.id,
      },
    }
  }

  const acervoMusicaId = acervoPedido?.acervoMusica?.id || null

  if (acervoMusicaId) {
    await updateJob(supabase, job.id, {
      acervo_musica_id: acervoMusicaId,
      etapa:
        acervoPedido?.tipo === 'gerando'
          ? 'Aguardando geração no acervo'
          : 'Fila do motor — gerando cifra',
      progresso: acervoPedido?.tipo === 'gerando' ? 50 : 45,
    })
  } else {
    await updateJob(supabase, job.id, {
      etapa: 'Salvando link do vídeo',
      progresso: 70,
    })
  }

  const data = buildResultadoImportacao({
    metadados,
    youtubeUrl: canonicalUrl,
    ministroId,
    aguardandoMotor: Boolean(acervoMusicaId),
  })
  data.acervo_musica_id = acervoMusicaId

  logImport('importação link-only concluída', {
    videoId: validation.videoId,
    titulo: data.musica.titulo,
    artista: data.musica.artista,
    import_status: data.musica.import_status,
    acervo_musica_id: acervoMusicaId,
  })

  await updateJob(supabase, job.id, {
    etapa: acervoMusicaId
      ? 'Vídeo salvo — motor gerando cifra'
      : 'Pronto para editar cifra',
    progresso: 90,
  })

  return { type: 'success', data }
}

async function importarYoutubeReal(
  supabase,
  { job, userId, youtubeUrl, ministroId, musicaId = null, tituloManual = null, artistaManual = null },
) {
  const pipeline = await executarPipelineYoutube(supabase, {
    job,
    youtubeUrl,
    ministroId,
    tituloManual,
    artistaManual,
  })

  if (pipeline.type === 'failed') {
    const { data: jobRow } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', job.id)
      .maybeSingle()
    throw new ImportFriendlyError(pipeline.message, jobRow)
  }

  const result = pipeline.data
  let musica

  if (musicaId) {
    const { data: existing, error: findErr } = await supabase
      .from('musicas')
      .select('id, ministro_id')
      .eq('id', musicaId)
      .eq('user_id', userId)
      .single()

    if (findErr) throw findErr

    const { data: updated, error: updateErr } = await supabase
      .from('musicas')
      .update({
        titulo: result.musica.titulo,
        artista: result.musica.artista,
        youtube_url: result.musica.youtube_url,
        bpm: result.musica.bpm,
        tom_original: result.musica.tom_original,
        import_status: result.musica.import_status,
        acervo_versao_id: result.musica.acervo_versao_id ?? null,
        ministro_id: ministroId ?? existing.ministro_id ?? result.musica.ministro_id,
      })
      .eq('id', musicaId)
      .select()
      .single()

    if (updateErr) throw updateErr

    const { error: deleteErr } = await supabase
      .from('secoes_musica')
      .delete()
      .eq('musica_id', musicaId)

    if (deleteErr) throw deleteErr

    musica = updated
    logImport('reimportação: música atualizada, musica_id:', musicaId)
  } else {
    const { data: inserted, error: musicaError } = await supabase
      .from('musicas')
      .insert({
        ...result.musica,
        user_id: userId,
      })
      .select()
      .single()

    if (musicaError) throw musicaError
    musica = inserted
  }

  if (result.secoes.length > 0) {
    const secoes = result.secoes.map((secao) => ({
      ...secao,
      musica_id: musica.id,
    }))
    const { error: secoesError } = await supabase.from('secoes_musica').insert(secoes)
    if (secoesError) throw secoesError
  }

  const aguardandoMotor = Boolean(result.acervo_musica_id) && !result.secoes?.length

  const { data: completed, error: jobError } = await supabase
    .from('import_jobs')
    .update({
      musica_id: musica.id,
      acervo_musica_id: result.acervo_musica_id ?? job.acervo_musica_id ?? null,
      status: aguardandoMotor ? 'processing' : 'completed',
      etapa: aguardandoMotor
        ? 'Aguardando motor gerar cifra no acervo…'
        : result.musica.import_status === 'ready' && result.secoes?.length
          ? 'Cifra do acervo aplicada'
          : result.acervo_musica_id
            ? 'Vídeo salvo — motor gerando cifra'
            : 'Vídeo salvo — cadastre a cifra na edição',
      progresso: aguardandoMotor ? 55 : 100,
    })
    .eq('id', job.id)
    .select()
    .single()

  if (jobError) throw jobError

  logImport('importação concluída:', {
    musicaId: musica.id,
    titulo: musica.titulo,
    youtube_url: musica.youtube_url,
    import_status: musica.import_status,
  })

  return completed
}

async function importarYoutubePreview(
  supabase,
  { job, youtubeUrl, ministroId, tituloManual = null, artistaManual = null },
) {
  const pipeline = await executarPipelineYoutube(supabase, {
    job,
    youtubeUrl,
    ministroId,
    tituloManual,
    artistaManual,
  })

  if (pipeline.type === 'failed') {
    const { data: jobRow } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', job.id)
      .maybeSingle()
    throw new ImportFriendlyError(pipeline.message, jobRow)
  }

  const preview = pipeline.data

  const { data: completed, error: jobError } = await supabase
    .from('import_jobs')
    .update({
      status: 'completed',
      etapa: 'Dados prontos para o formulário',
      progresso: 100,
    })
    .eq('id', job.id)
    .select()
    .single()

  if (jobError) throw jobError
  return { job: completed, preview }
}

importarRouter.get('/youtube/search', requireAuth, async (req, res, next) => {
  try {
    const query = String(req.query.q || '').trim()
    if (query.length < 2) {
      return res.status(400).json({ error: 'Digite pelo menos 2 caracteres para buscar' })
    }

    const results = await buscarYoutube(query)
    res.json({ results })
  } catch (err) {
    next(err)
  }
})

importarRouter.post('/youtube', requireAuth, async (req, res, next) => {
  let canonicalUrl = null
  try {
    const { youtubeUrl: rawUrl, ministroId, preview, musicaId, titulo, artista } = req.body ?? {}
    const validation = validateYoutubeUrl(rawUrl)

    if (!validation.valid) {
      return res.status(400).json({ error: validation.error || 'Link inválido' })
    }

    canonicalUrl = `https://www.youtube.com/watch?v=${validation.videoId}`
    const tituloManual = String(titulo || '').trim() || null
    const artistaManual = String(artista || '').trim() || null

    const job = await createJob(req.supabase, {
      userId: req.user.id,
      youtubeUrl: canonicalUrl,
    })

    if (preview) {
      const { job: completed, preview: previewData } = await importarYoutubePreview(
        req.supabase,
        {
          job,
          youtubeUrl: canonicalUrl,
          ministroId: ministroId || null,
          tituloManual,
          artistaManual,
        },
      )
      return res.status(201).json({ job: completed, preview: previewData })
    }

    const completed = await importarYoutubeReal(req.supabase, {
      job,
      userId: req.user.id,
      youtubeUrl: canonicalUrl,
      ministroId,
      musicaId: musicaId || null,
      tituloManual,
      artistaManual,
    })

    res.status(201).json({ job: completed })
  } catch (err) {
    if (err instanceof ImportNeedsInputError) {
      return res.status(200).json({
        precisa_nome_manual: true,
        youtubeUrl: canonicalUrl || req.body?.youtubeUrl,
        job: err.job,
        message: err.message,
      })
    }
    if (err instanceof ImportFriendlyError) {
      return res.status(422).json({
        error: err.message,
        job: err.job,
      })
    }
    next(err)
  }
})

importarRouter.get('/jobs/:id', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from('import_jobs')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single()

    if (error) throw error
    res.json({ job: data })
  } catch (err) {
    next(err)
  }
})

export { executarPipelineYoutube, importarYoutubeReal, createJob }
