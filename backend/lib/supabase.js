import { createClient } from '@supabase/supabase-js'
import { env } from '../config.js'

function isServiceKeyConfigured() {
  const key = env.supabaseServiceKey
  return Boolean(key && !key.includes('COLE_') && key.length > 40)
}

export function getSupabaseAdmin() {
  if (!env.supabaseUrl || !isServiceKeyConfigured()) {
    throw new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_KEY (service role) no backend')
  }

  return createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/** Cliente com JWT do usuário — respeita RLS (checkout sem service role). */
export function createSupabaseForUser(accessToken) {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error('Configure SUPABASE_URL e SUPABASE_ANON_KEY (ou VITE_SUPABASE_ANON_KEY) no .env')
  }

  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
    if (!token) {
      return res.status(401).json({ error: 'Token de autenticação ausente' })
    }

    const supabaseUser = createSupabaseForUser(token)
    const { data, error } = await supabaseUser.auth.getUser()
    if (error || !data.user) {
      return res.status(401).json({
        error: 'Token inválido. Faça login novamente.',
      })
    }

    req.user = data.user
    req.supabase = supabaseUser
    if (isServiceKeyConfigured()) {
      req.supabaseAdmin = getSupabaseAdmin()
    }
    next()
  } catch (err) {
    next(err)
  }
}
