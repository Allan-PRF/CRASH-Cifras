/** Domínio público canônico — links compartilháveis sempre usam este host em produção. */
export const CANONICAL_SITE_URL = 'https://crashcifras.com.br'

function isLocalDevOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
}

function normalizeSiteBase(url) {
  return String(url || '').replace(/\/$/, '')
}

function isUsableShareBase(url) {
  if (!url) return false
  if (url.includes('vercel.app')) return false
  if (url === CANONICAL_SITE_URL) return true
  return isLocalDevOrigin(url)
}

/**
 * Base URL para links compartilháveis (/ref, convite de equipe, etc.).
 * Nunca retorna *.vercel.app — independente de onde o usuário abriu o app.
 */
export function getPublicSiteUrl() {
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    const origin = normalizeSiteBase(window.location.origin)
    if (isLocalDevOrigin(origin)) return origin
  }

  const fromEnv = normalizeSiteBase(import.meta.env.VITE_PUBLIC_SITE_URL)
  if (isUsableShareBase(fromEnv)) return fromEnv

  return CANONICAL_SITE_URL
}

export function buildEquipeInviteUrl(codigo) {
  return `${getPublicSiteUrl()}/conta?equipe=${encodeURIComponent(codigo)}`
}
