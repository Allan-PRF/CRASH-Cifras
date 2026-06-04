import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { validateYoutubeUrlWithEmbed } from '../lib/validateYoutubeUrl.js'
import { requireAuth } from '../lib/supabase.js'

export const youtubeRouter = Router()

youtubeRouter.post(
  '/validate',
  requireAuth,
  body('url').isString().trim().notEmpty(),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'URL inválida.' })
    }

    const result = validateYoutubeUrlWithEmbed(req.body.url)
    if (!result.valid) {
      return res.status(400).json({ error: result.error })
    }

    res.json({ embedUrl: result.embedUrl, videoId: result.videoId })
  },
)
