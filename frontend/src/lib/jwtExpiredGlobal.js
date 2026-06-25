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
      obj.code === 'PGRST303' ||
      obj.code === 401 ||
      obj.code === '401'
    )
  }

  const m = String(value).toLowerCase()
  return (
    m.includes('jwt expired') ||
    m.includes('jwt has expired') ||
    m.includes('invalid jwt') ||
    m.includes('token expired')
  )
}

/**
 * Renova sessão silenciosamente; recarrega ou envia ao login.
 */
export async function handleJwtExpiredGlobal() {
  if (handling) return
  handling = true

  try {
    const { data, error } = await supabase.auth.refreshSession()

    if (!error && data?.session?.access_token) {
      window.location.reload()
      return
    }

    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // ignore
    }

    const path = window.location.pathname
    if (path !== '/login' && !path.startsWith('/auth/')) {
      window.location.replace('/login')
    }
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
        const serverMsg =
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message

        if (
          error.response?.status === 401 ||
          messageLooksLikeJwtExpired(serverMsg)
        ) {
          await handleJwtExpiredGlobal()
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
