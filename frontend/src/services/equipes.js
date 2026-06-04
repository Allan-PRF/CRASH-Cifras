import { api } from '../lib/api'
import { supabase } from '../lib/supabase'

async function authHeaders() {
  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
  const session = refreshed?.session ?? (await supabase.auth.getSession()).data.session

  if (refreshError && !session?.access_token) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }
  if (!session?.access_token) {
    throw new Error('Faça login para gerenciar sua equipe')
  }
  return { Authorization: `Bearer ${session.access_token}` }
}

export async function fetchMinhaEquipe() {
  const headers = await authHeaders()
  const { data } = await api.get('/equipes/minha', { headers })
  return data
}

export async function criarEquipe(nome, instrumento) {
  const headers = await authHeaders()
  const { data } = await api.post('/equipes/criar', { nome, instrumento }, { headers })
  return data
}

export async function entrarEquipe(codigo, instrumento) {
  const headers = await authHeaders()
  const { data } = await api.post('/equipes/entrar', { codigo, instrumento }, { headers })
  return data
}

export async function sairEquipe() {
  const headers = await authHeaders()
  const { data } = await api.post('/equipes/sair', {}, { headers })
  return data
}

export async function removerMembro(membroId) {
  const headers = await authHeaders()
  const { data } = await api.delete(`/equipes/remover-membro/${membroId}`, { headers })
  return data
}

export async function excluirEquipe() {
  const headers = await authHeaders()
  const { data } = await api.delete('/equipes/excluir', { headers })
  return data
}

export async function previewEquipe(codigo) {
  const { data } = await api.get(`/equipes/preview/${codigo}`)
  return data
}
