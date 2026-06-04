import { Router } from 'express'

export const securityRouter = Router()

securityRouter.post('/report-bot', (req, res) => {
  const payload = req.body || {}
  console.warn('[SEGURANÇA] Headless/automação reportado:', {
    ip: req.headers['x-forwarded-for']?.split(',')[0] || req.ip,
    userAgent: payload.userAgent,
    url: payload.url,
    checks: payload.checks,
    timestamp: payload.timestamp,
  })
  res.status(204).end()
})
