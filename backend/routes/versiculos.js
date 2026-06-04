import { Router } from 'express'
import { gerarVersiculosComOpenAI } from '../lib/versiculosIa.js'
import { requireAuth } from '../lib/supabase.js'

export const versiculosRouter = Router()

versiculosRouter.post('/gerar', requireAuth, async (req, res, next) => {
  try {
    const { versaoBiblica = 'NVI', titulo, artista, tom, secoes } = req.body || {}
    const resultado = await gerarVersiculosComOpenAI({
      versaoBiblica,
      titulo,
      artista,
      tom,
      secoes,
    })
    res.json(resultado)
  } catch (err) {
    next(err)
  }
})
