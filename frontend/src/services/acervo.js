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

/**
 * Fluxo 5.2 — informa ao acervo se a cópia salva aceitou ou corrigiu a versão de origem.
 */
export async function enviarFeedbackAcervo({ acervoVersaoId, tomOriginal, bpm, secoes }) {
  if (!acervoVersaoId) return null
  const headers = await authHeaders()
  const { data } = await api.post(
    '/acervo/feedback',
    { acervoVersaoId, tomOriginal, bpm, secoes },
    { headers },
  )
  return data
}
