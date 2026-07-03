import { api } from '../lib/api'
import { getAuthBearerToken } from '../lib/authSession'

const EQUIPE_VAZIA = { equipe: null, membros: [], meuTipo: null }

async function authHeaders() {
  const token = await getAuthBearerToken()
  if (!token) {
    throw new Error('Faça login para gerenciar sua equipe')
  }
  return { Authorization: `Bearer ${token}` }
}

/**
 * Equipe do usuário — falha silenciosa (lista de eventos não depende disso).
 */
export async function fetchMinhaEquipe() {
  try {
    const headers = await authHeaders()
    const { data } = await api.get('/equipes/minha', { headers })
    return data ?? EQUIPE_VAZIA
  } catch {
    return EQUIPE_VAZIA
  }
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
