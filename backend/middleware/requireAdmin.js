import { env } from '../config.js'

export function requireAdmin(req, res, next) {
  const email = req.user?.email?.toLowerCase()
  if (email !== env.adminEmail) {
    return res.status(403).json({ error: 'Acesso restrito ao administrador.' })
  }
  next()
}

export { env as adminEnv }
