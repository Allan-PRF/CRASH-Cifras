import { getSupabaseAdmin } from './supabase.js'
import { registrarFalhaMotor } from './acervo.js'

function admin() {
  return getSupabaseAdmin()
}

const DEFAULT_TIMEOUT_MIN = 20

function timeoutMsFromMinutes(minutes) {
  const m = Number(minutes)
  if (!Number.isFinite(m) || m < 5) return DEFAULT_TIMEOUT_MIN * 60 * 1000
  return m * 60 * 1000
}

/**
 * Marca jobs/acervo presos em processing além do timeout — libera fila e UI.
 * @param {{ timeoutMinutes?: number }} opts
 */
export async function expirarImportJobsTravados({ timeoutMinutes = DEFAULT_TIMEOUT_MIN } = {}) {
  const db = admin()
  const cutoff = new Date(Date.now() - timeoutMsFromMinutes(timeoutMinutes)).toISOString()
  const mensagem = `Timeout: geração excedeu ${timeoutMinutes} minutos sem concluir. Tente importar novamente.`

  const expirados = {
    acervo: [],
    jobs: [],
    musicas: [],
  }

  const { data: staleAcervo, error: aErr } = await db
    .from('acervo_musicas')
    .select('id')
    .eq('status', 'processing')
    .lt('updated_at', cutoff)

  if (aErr) throw aErr

  for (const row of staleAcervo || []) {
    const result = await registrarFalhaMotor({
      acervoMusicaId: row.id,
      erro: mensagem,
    })
    expirados.acervo.push(row.id)
    expirados.jobs.push(...(result.musicaIdsAtualizadas || []))
  }

  const { data: staleJobs, error: jErr } = await db
    .from('import_jobs')
    .select('id, acervo_musica_id, musica_id')
    .eq('status', 'processing')
    .lt('updated_at', cutoff)

  if (jErr) throw jErr

  for (const job of staleJobs || []) {
    if (job.acervo_musica_id) {
      const { data: acervo } = await db
        .from('acervo_musicas')
        .select('status')
        .eq('id', job.acervo_musica_id)
        .maybeSingle()

      if (acervo?.status === 'processing') {
        continue
      }
    }

    await db
      .from('import_jobs')
      .update({
        status: 'failed',
        erro: mensagem,
        etapa: 'Tempo esgotado',
        progresso: 0,
      })
      .eq('id', job.id)
      .eq('status', 'processing')

    expirados.jobs.push(job.id)

    if (job.musica_id) {
      await db
        .from('musicas')
        .update({ import_status: 'failed' })
        .eq('id', job.musica_id)
        .in('import_status', ['pending', 'processing'])
      expirados.musicas.push(job.musica_id)
    }
  }

  if (expirados.acervo.length || expirados.jobs.length) {
    console.warn('[import] jobs travados expirados:', {
      acervo: expirados.acervo.length,
      jobs: expirados.jobs.length,
      musicas: expirados.musicas.length,
      cutoff,
    })
  }

  return expirados
}

/**
 * Cancelamento pelo usuário — não derruba acervo compartilhado se outros aguardam.
 */
export async function cancelarImportJobUsuario({ jobId, userId }) {
  const db = admin()

  const { data: job, error: jErr } = await db
    .from('import_jobs')
    .select('id, user_id, status, acervo_musica_id, musica_id')
    .eq('id', jobId)
    .maybeSingle()

  if (jErr) throw jErr
  if (!job) {
    const err = new Error('Job de importação não encontrado.')
    err.status = 404
    throw err
  }
  if (job.user_id !== userId) {
    const err = new Error('Sem permissão para cancelar esta importação.')
    err.status = 403
    throw err
  }
  if (!['pending', 'processing'].includes(job.status)) {
    const err = new Error('Esta importação já foi concluída ou encerrada.')
    err.status = 400
    throw err
  }

  const mensagem = 'Cancelado pelo usuário'

  let outrosAtivos = 0
  if (job.acervo_musica_id) {
    const { count, error: cErr } = await db
      .from('import_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('acervo_musica_id', job.acervo_musica_id)
      .in('status', ['pending', 'processing'])
      .neq('id', job.id)

    if (cErr) throw cErr
    outrosAtivos = count ?? 0
  }

  await db
    .from('import_jobs')
    .update({
      status: 'failed',
      erro: mensagem,
      etapa: 'Importação cancelada',
      progresso: 0,
    })
    .eq('id', job.id)

  if (job.musica_id) {
    await db
      .from('musicas')
      .update({ import_status: 'failed' })
      .eq('id', job.musica_id)
      .in('import_status', ['pending', 'processing'])
  }

  if (job.acervo_musica_id && outrosAtivos === 0) {
    const { data: acervo } = await db
      .from('acervo_musicas')
      .select('status')
      .eq('id', job.acervo_musica_id)
      .maybeSingle()

    if (acervo?.status === 'processing') {
      await registrarFalhaMotor({
        acervoMusicaId: job.acervo_musica_id,
        erro: mensagem,
        jobId: job.id,
      })
    }
  }

  const { data: atualizado, error: loadErr } = await db
    .from('import_jobs')
    .select('*')
    .eq('id', job.id)
    .single()

  if (loadErr) throw loadErr
  return atualizado
}
