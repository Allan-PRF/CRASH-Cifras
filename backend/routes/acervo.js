import { Router } from 'express'
import { buildCifraSnapshot } from '@crash-cifras/shared/acervo'
import { env } from '../config.js'
import {
  preencherMusicasAguardandoAcervo,
  registrarFeedbackSalvamento,
  registrarVersaoMotor,
} from '../lib/acervo.js'
import { getSupabaseAdmin, requireAuth } from '../lib/supabase.js'

export const acervoRouter = Router()

function requireMotorSecret(req, res, next) {
  const secret = env.acervoMotorSecret
  if (!secret) {
    return res.status(503).json({ error: 'Motor do acervo não configurado (ACERVO_MOTOR_SECRET).' })
  }
  const header = req.headers['x-acervo-motor-secret']
  if (header !== secret) {
    return res.status(401).json({ error: 'Segredo do motor inválido.' })
  }
  next()
}

/**
 * Fila para o motor Python — acervo pending/processing + jobs associados.
 * GET /api/acervo/motor/fila
 */
acervoRouter.get('/motor/fila', requireMotorSecret, async (req, res, next) => {
  try {
    const db = getSupabaseAdmin()
    const { data: musicas, error: mErr } = await db
      .from('acervo_musicas')
      .select('id, titulo, artista, fonte_url, status, created_at')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: true })
      .limit(50)

    if (mErr) throw mErr

    const ids = (musicas || []).map((m) => m.id)
    let jobs = []
    if (ids.length) {
      const { data: jobRows, error: jErr } = await db
        .from('import_jobs')
        .select('id, acervo_musica_id, youtube_url, user_id, status, etapa, progresso')
        .in('acervo_musica_id', ids)
      if (jErr) throw jErr
      jobs = jobRows || []
    }

    res.json({
      pendentes: (musicas || []).map((m) => ({
        ...m,
        jobs: jobs.filter((j) => j.acervo_musica_id === m.id),
      })),
    })
  } catch (err) {
    next(err)
  }
})

/**
 * Callback do motor Python ao concluir geração.
 * POST /api/acervo/motor/completar
 */
acervoRouter.post('/motor/completar', requireMotorSecret, async (req, res, next) => {
  try {
    const { acervo_musica_id, cifra, tom_original, bpm, job_id } = req.body ?? {}

    if (!acervo_musica_id || !cifra?.secoes) {
      return res.status(400).json({ error: 'acervo_musica_id e cifra.secoes são obrigatórios.' })
    }

    const { versao, acervoMusica } = await registrarVersaoMotor({
      acervoMusicaId: acervo_musica_id,
      cifra,
      tomOriginal: tom_original,
      bpm,
    })

    const versaoTopId = acervoMusica.versao_top_id || versao.id

    const preenchimento = await preencherMusicasAguardandoAcervo({
      acervoMusicaId: acervo_musica_id,
      versaoId: versaoTopId,
      cifra,
      tomOriginal: tom_original,
      bpm,
    })

    res.json({
      ok: true,
      acervo_musica_id: acervoMusica.id,
      versao_id: versao.id,
      versao_top_id: versaoTopId,
      musicas_preenchidas: preenchimento.preenchidas,
      musicas_ignoradas: preenchimento.ignoradas,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * Fluxo 5.2 — feedback ao salvar cópia pessoal (aceitação / convergência).
 * POST /api/acervo/feedback
 */
acervoRouter.post('/feedback', requireAuth, async (req, res, next) => {
  try {
    const { acervoVersaoId, tomOriginal, bpm, secoes } = req.body ?? {}

    if (!acervoVersaoId) {
      return res.status(400).json({ error: 'acervoVersaoId é obrigatório.' })
    }

    const cifraSalva = buildCifraSnapshot({
      tomOriginal,
      bpm,
      intro: { lines: [] },
      secoes: secoes || [],
    })

    const result = await registrarFeedbackSalvamento({
      acervoVersaoId,
      cifraSalva,
      userId: req.user.id,
    })

    res.json({ ok: true, result })
  } catch (err) {
    next(err)
  }
})
