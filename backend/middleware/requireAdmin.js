const ADMIN_EMAIL = 'alanadcms@gmail.com'

export function requireAdmin(req, res, next) {
  const email = req.user?.email?.toLowerCase()
  if (email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Acesso restrito ao administrador.' })
  }
  next()
}

export { ADMIN_EMAIL }
