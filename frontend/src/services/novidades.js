import { api } from '../lib/api'
import { supabase } from '../lib/supabase'

async function authHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Faça login para continuar')
  }
  return { Authorization: `Bearer ${session.access_token}` }
}

export async function fetchNovidadeAtiva() {
  const { data } = await api.get('/novidades/ativa')
  return data.novidade
}

export async function fetchNovidadesAdmin() {
  const headers = await authHeaders()
  const { data } = await api.get('/novidades/admin', { headers })
  return data.novidades
}

export async function criarNovidade(payload) {
  const headers = await authHeaders()
  const { data } = await api.post('/novidades/admin', payload, { headers })
  return data
}

export async function atualizarNovidade(id, payload) {
  const headers = await authHeaders()
  const { data } = await api.patch(`/novidades/admin/${id}`, payload, { headers })
  return data
}
