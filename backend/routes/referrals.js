import { Router } from 'express'
import { rateLimiters } from '../middleware/security.js'
import { getSupabaseAdmin, requireAuth } from '../lib/supabase.js'
import {
  getPublicReferrer,
  getReferralStats,
  isValidReferralCode,
  sanitizeReferrerDisplayName,
} from '../lib/referrals.js'

export const referralsRouter = Router()

referralsRouter.get('/public/:codigo', rateLimiters.general, async (req, res, next) => {
  try {
    const codigo = String(req.params.codigo || '').trim()

    if (!isValidReferralCode(codigo)) {
      return res.status(400).json({ error: 'Código de indicação inválido.' })
    }

    const supabase = getSupabaseAdmin()
    const referrer = await getPublicReferrer(supabase, codigo)

    if (!referrer) {
      return res.status(404).json({ error: 'Link de indicação inválido.' })
    }

    res.json({
      displayName: sanitizeReferrerDisplayName(referrer.displayName),
      code: referrer.code,
      link: referrer.link,
    })
  } catch (err) {
    next(err)
  }
})

referralsRouter.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin()
    const stats = await getReferralStats(supabase, req.user.id)
    res.json(stats)
  } catch (err) {
    next(err)
  }
})
