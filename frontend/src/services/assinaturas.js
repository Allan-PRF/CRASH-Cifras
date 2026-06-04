import { api } from '../lib/api'
import { supabase } from '../lib/supabase'

async function authHeaders() {
  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
  const session = refreshed?.session ?? (await supabase.auth.getSession()).data.session

  if (refreshError && !session?.access_token) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  if (!session?.access_token) {
    throw new Error('Faça login para gerenciar sua assinatura')
  }

  return { Authorization: `Bearer ${session.access_token}` }
}

export async function fetchAssinaturaAtual() {
  const headers = await authHeaders()
  const { data } = await api.get('/assinaturas/atual', { headers })
  return data
}

export async function criarCheckoutAssinatura(plano) {
  const headers = await authHeaders()
  const { data } = await api.post('/assinaturas/checkout', { plano }, { headers })
  return data
}
