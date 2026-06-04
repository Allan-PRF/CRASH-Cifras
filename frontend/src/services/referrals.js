import { api } from '../lib/api'
import { supabase } from '../lib/supabase'

async function authHeaders() {
  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
  const session = refreshed?.session ?? (await supabase.auth.getSession()).data.session

  if (refreshError && !session?.access_token) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  if (!session?.access_token) {
    throw new Error('Faça login para ver sua indicação')
  }

  return { Authorization: `Bearer ${session.access_token}` }
}

export async function fetchReferralStats() {
  const headers = await authHeaders()
  const { data } = await api.get('/referrals/stats', { headers })
  return data
}

export async function fetchPublicReferrer(codigo) {
  const { data } = await api.get(`/referrals/public/${encodeURIComponent(codigo)}`)
  return data
}
