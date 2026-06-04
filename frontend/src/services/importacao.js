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

export async function importarYoutube({ youtubeUrl, ministroId, musicaId, preview = false }) {
  const headers = await authHeaders()
  const { data } = await api.post(
    '/importar/youtube',
    {
      youtubeUrl,
      ministroId: ministroId || null,
      musicaId: musicaId || null,
      preview,
    },
    { headers },
  )
  if (preview) return data.preview
  return data.job
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
