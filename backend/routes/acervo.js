import { Router } from 'express'
import { buildCifraSnapshot } from '@crash-cifras/shared'
import { env } from '../config.js'
import {
  listarFilaMotor,
  marcarAcervoProcessando,
  aplicarMetadadosMotor,
  preencherMusicasAguardandoAcervo,
  registrarFalhaMotor,
  registrarFeedbackSalvamento,
  registrarVersaoMotor,
} from '../lib/acervo.js'
import { requireAuth } from '../lib/supabase.js'

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
    const { pendentes, total, source } = await listarFilaMotor()
    res.json({
      pendentes,
      fila: pendentes,
      total,
      source,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * Worker marca música como em processamento ao iniciar.
 * POST /api/acervo/motor/iniciar
 */
acervoRouter.post('/motor/iniciar', requireMotorSecret, async (req, res, next) => {
  try {
    const { acervo_musica_id } = req.body ?? {}
    if (!acervo_musica_id) {
      return res.status(400).json({ error: 'acervo_musica_id é obrigatório.' })
    }
    await marcarAcervoProcessando(acervo_musica_id)
    res.json({ ok: true, acervo_musica_id, status: 'processing' })
  } catch (err) {
    next(err)
  }
})

/**
 * Worker reporta falha — evita travar em processing.
 * POST /api/acervo/motor/falha
 */
acervoRouter.post('/motor/falha', requireMotorSecret, async (req, res, next) => {
  try {
    const { acervo_musica_id, job_id, erro } = req.body ?? {}
    if (!acervo_musica_id) {
      return res.status(400).json({ error: 'acervo_musica_id é obrigatório.' })
    }
    const result = await registrarFalhaMotor({
      acervoMusicaId: acervo_musica_id,
      erro,
      jobId: job_id || null,
    })
    res.json({ ok: true, ...result })
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
    const { acervo_musica_id, cifra, tom_original, bpm, job_id, titulo, artista } =
      req.body ?? {}

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

    const metadados = await aplicarMetadadosMotor({
      acervoMusicaId: acervo_musica_id,
      titulo,
      artista,
    })

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
      metadados_aplicados: metadados.atualizado,
      titulo: metadados.titulo ?? null,
      artista: metadados.artista ?? null,
      musicas_metadados: metadados.musicas_atualizadas ?? [],
      musicas_preenchidas: preenchimento.preenchidas,
      musicas_ignoradas: preenchimento.ignoradas,
    })
  } catch (err) {
    console.error('[acervo] motor/completar falhou:', {
      acervo_musica_id: req.body?.acervo_musica_id,
      code: err.code,
      message: err.message,
      details: err.details,
      hint: err.hint,
    })
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
