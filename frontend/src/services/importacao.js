import { api } from '../lib/api'
import { supabase } from '../lib/supabase'

async function authHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Faça login para importar músicas')
  }

  return { Authorization: `Bearer ${session.access_token}` }
}

/**
 * @returns {Promise<object>} job concluído, preview, ou `{ precisa_nome_manual: true, ... }`
 */
export async function importarYoutube({
  youtubeUrl,
  ministroId,
  musicaId,
  preview = false,
  titulo = null,
  artista = null,
  contexto = 'importacao',
}) {
  const headers = await authHeaders()
  try {
    const { data } = await api.post(
      '/importar/youtube',
      {
        youtubeUrl,
        ministroId: ministroId || null,
        musicaId: musicaId || null,
        preview,
        titulo: titulo?.trim() || null,
        artista: artista?.trim() || null,
        contexto,
      },
      { headers },
    )

    if (data.reutilizada) {
      return {
        reutilizada: true,
        musica_id: data.musica_id,
        titulo: data.titulo,
      }
    }

    if (data.precisa_nome_manual) {
      return {
        precisa_nome_manual: true,
        youtubeUrl: data.youtubeUrl,
        job: data.job,
        message: data.message,
      }
    }

    if (preview) return data.preview
    return data.job
  } catch (error) {
    const msg =
      error.response?.data?.error ||
      error.message ||
      'Não foi possível importar esta música.'
    const err = new Error(msg)
    if (error.response?.data?.job) {
      err.job = error.response.data.job
    }
    throw err
  }
}

export async function buscarYoutube(query) {
  const headers = await authHeaders()
  const { data } = await api.get('/importar/youtube/search', {
    params: { q: query },
    headers,
  })
  return data.results ?? []
}

export async function fetchImportJob(jobId) {
  const headers = await authHeaders()
  const { data } = await api.get(`/importar/jobs/${jobId}`, { headers })
  return data.job
}
