import { redirectToLogin } from './authSession'
import { flushMusicaEditDraftNow } from './musicaEditDraft'
import { supabase } from './supabase'

let handling = false
let installed = false

/**
 * Detecta mensagem/código de JWT expirado (API, Supabase, axios).
 * @param {unknown} value
 */
export function messageLooksLikeJwtExpired(value) {
  if (value == null) return false

  if (typeof value === 'object') {
    const obj = /** @type {{ message?: string, code?: string, details?: string, hint?: string, error?: unknown }} */ (
      value
    )
    return (
      messageLooksLikeJwtExpired(obj.message) ||
      messageLooksLikeJwtExpired(obj.details) ||
      messageLooksLikeJwtExpired(obj.hint) ||
      messageLooksLikeJwtExpired(obj.error) ||
      obj.code === 'PGRST303'
    )
  }

  const m = String(value).toLowerCase()
  return (
    m.includes('jwt expired') ||
    m.includes('jwt has expired') ||
    m.includes('invalid jwt') ||
    m.includes('token expired') ||
    m.includes('session expired')
  )
}

/** Mensagens 401 da API que indicam sessão inválida (não erro transitório genérico). */
export function api401IndicatesInvalidSession(error) {
  if (error?.response?.status !== 401) return false

  const serverMsg =
    error.response?.data?.error ||
    error.response?.data?.message ||
    error.message

  if (messageLooksLikeJwtExpired(serverMsg)) return true

  const m = String(serverMsg || '').toLowerCase()
  return (
    m.includes('token de autenticação ausente') ||
    m.includes('token de autenticacao ausente') ||
    m.includes('token inválido') ||
    m.includes('token invalido') ||
    m.includes('faça login') ||
    m.includes('faca login') ||
    m.includes('sessão expirada') ||
    m.includes('sessao expirada')
  )
}

/** Erro de API/Supabase que deve disparar refresh global ou logout. */
export function shouldHandleJwtExpiredGlobally(error) {
  if (api401IndicatesInvalidSession(error)) return true

  const serverMsg =
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    error

  return messageLooksLikeJwtExpired(serverMsg)
}

/**
 * Renova sessão silenciosamente; só redireciona ao login se o refresh falhar.
 * Antes de qualquer saída: flush do rascunho de edição no IndexedDB.
 * @returns {Promise<boolean>} true se a sessão foi renovada
 */
export async function handleJwtExpiredGlobal() {
  if (handling) return false
  handling = true

  try {
    await flushMusicaEditDraftNow()

    const { data, error } = await supabase.auth.refreshSession()

    if (!error && data?.session?.access_token) {
      // Renovação silenciosa — não recarrega a página (preserva a edição em memória).
      return true
    }

    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // ignore
    }

    redirectToLogin()
    return false
  } finally {
    handling = false
  }
}

/** Se o erro for JWT expirado, trata globalmente e retorna true. */
export function tryHandleJwtExpiredError(err) {
  if (!messageLooksLikeJwtExpired(err)) return false
  void handleJwtExpiredGlobal()
  return true
}

async function proactiveTokenRefresh() {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.expires_at) return

  const now = Math.floor(Date.now() / 1000)
  const secsLeft = session.expires_at - now
  if (secsLeft > 0 && secsLeft < 120) {
    await supabase.auth.refreshSession()
  }
}

function attachWindowListeners() {
  window.addEventListener('unhandledrejection', (event) => {
    if (messageLooksLikeJwtExpired(event.reason)) {
      event.preventDefault()
      void handleJwtExpiredGlobal()
    }
  })

  window.addEventListener('error', (event) => {
    if (messageLooksLikeJwtExpired(event.message)) {
      event.preventDefault()
      void handleJwtExpiredGlobal()
    }
  })
}

function attachApiInterceptor() {
  import('./api.js').then(({ api }) => {
    api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (shouldHandleJwtExpiredGlobally(error)) {
          const renewed = await handleJwtExpiredGlobal()
          if (renewed) {
            // Sessão OK — rejeita para o caller poder tratar/retry (sem hang eterno).
            return Promise.reject(error)
          }
          // Redirect em andamento — não propaga erro na UI.
          return new Promise(() => {})
        }

        return Promise.reject(error)
      },
    )
  })
}

/**
 * Tratamento global de JWT expirado (sem alterar AuthContext nem supabase.js).
 */
export function installJwtExpiredGlobalHandler() {
  if (installed) return
  installed = true

  attachWindowListeners()
  attachApiInterceptor()

  setInterval(() => {
    void proactiveTokenRefresh()
  }, 60_000)

  void proactiveTokenRefresh()
}
