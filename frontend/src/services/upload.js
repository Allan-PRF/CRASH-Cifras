import { api } from '../lib/api'
import { supabase } from '../lib/supabase'

async function authHeaders() {
  const { data: refreshed } = await supabase.auth.refreshSession()
  const session = refreshed?.session ?? (await supabase.auth.getSession()).data.session
  if (!session?.access_token) {
    throw new Error('Faça login para enviar fotos')
  }
  return { Authorization: `Bearer ${session.access_token}` }
}

export async function uploadFotoMinistroSeguro(file) {
  if (!file) return null
  if (!file.type.startsWith('image/')) {
    throw new Error('Escolha um arquivo de imagem (JPG, PNG ou WebP)')
  }

  const headers = await authHeaders()
  const form = new FormData()
  form.append('file', file)

  const { data } = await api.post('/upload/foto-ministro', form, {
    headers: {
      ...headers,
      'Content-Type': 'multipart/form-data',
    },
  })

  return data.url
}
