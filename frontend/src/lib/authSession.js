import { supabase } from './supabase'

const EXPIRY_MARGIN_SEC = 60

/** Erro interno: sessão inválida e redirecionamento para login (não exibir ao usuário). */
export class AuthRedirectError extends Error {
  constructor() {
    super('AUTH_REDIRECT')
    this.name = 'AuthRedirectError'
  }
}

export function isJwtExpiredMessage(message) {
  if (!message) return false
  const m = String(message).toLowerCase()
  return (
    m.includes('jwt expired') ||
    m.includes('jwt has expired') ||
    m.includes('invalid jwt') ||
    m.includes('token expired') ||
    m.includes('session expired')
  )
}

export function isJwtExpiredError(error) {
  if (!error) return false
  const code = error.code || error.status || error.statusCode
  if (code === 'PGRST303' || code === 401 || code === '401') return true
  return isJwtExpiredMessage(
    error.message || error.error_description || error.details || error.hint,
  )
}

export function redirectToLogin() {
  const path = window.location.pathname
  if (path === '/login' || path.startsWith('/auth/')) return
  const from = encodeURIComponent(path + window.location.search)
  window.location.replace(`/login?from=${from}`)
}

export async function refreshAuthSession() {
  const { data, error } = await supabase.auth.refreshSession()
  if (error || !data?.session?.access_token) return null
  return data.session
}

/**
 * Sessão válida: usa cache ou renova silenciosamente antes de chamadas autenticadas.
 */
export async function ensureAuthSession() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return null

  const expiresAt = session.expires_at
  const now = Math.floor(Date.now() / 1000)
  if (!expiresAt || expiresAt > now + EXPIRY_MARGIN_SEC) {
    return session
  }

  return refreshAuthSession()
}

/**
 * Tenta renovar o JWT; se falhar, encerra sessão e redireciona ao login.
 * @returns {Promise<import('@supabase/supabase-js').Session | null>}
 */
export async function recoverFromJwtExpired() {
  const session = await refreshAuthSession()
  if (session) return session

  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch {
    // ignore
  }
  redirectToLogin()
  throw new AuthRedirectError()
}

export async function getAuthBearerToken() {
  const session = await ensureAuthSession()
  return session?.access_token ?? null
}

/**
 * Envolve operações Supabase: em erro de JWT expirado, tenta refresh silencioso.
 * @param {() => Promise<{ data: unknown, error: unknown }>} operation
 */
export async function runSupabaseWithAuthRecovery(operation) {
  let result = await operation()
  if (result?.error && isJwtExpiredError(result.error)) {
    const session = await refreshAuthSession()
    if (session) {
      result = await operation()
    } else {
      try {
        await recoverFromJwtExpired()
      } catch (e) {
        if (e instanceof AuthRedirectError) {
          return { data: null, error: null }
        }
        throw e
      }
    }
  }
  return result
}
