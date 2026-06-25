import { supabase } from '../lib/supabase'
import { uploadFotoMinistroSeguro } from './upload'

const MINISTRO_SELECT = `
  id,
  nome,
  foto_url,
  created_at,
  updated_at,
  musicas:musicas!musicas_ministro_id_fkey(count)
`

/** Upload via API (Sharp: validação, remoção EXIF, WebP). */
export async function uploadFotoMinistro(file) {
  return uploadFotoMinistroSeguro(file)
}

export async function fetchMinistros() {
  const { data, error } = await supabase
    .from('ministros')
    .select(MINISTRO_SELECT)
    .order('nome', { ascending: true })

  if (error) throw error
  return data.map((row) => ({
    ...row,
    musicas_count: row.musicas?.[0]?.count ?? 0,
  }))
}

export async function fetchMinistroById(id) {
  const { data, error } = await supabase
    .from('ministros')
    .select(MINISTRO_SELECT)
    .eq('id', id)
    .single()

  if (error) throw error
  return {
    ...data,
    musicas_count: data.musicas?.[0]?.count ?? 0,
  }
}

export async function createMinistro({ nome, fotoUrl }) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Faça login para cadastrar ministros')

  const { data, error } = await supabase
    .from('ministros')
    .insert({
      user_id: user.id,
      nome: nome.trim(),
      foto_url: fotoUrl?.trim() || null,
    })
    .select(MINISTRO_SELECT)
    .single()

  if (error) throw error
  return { ...data, musicas_count: 0 }
}

export async function updateMinistro(id, { nome, fotoUrl }) {
  const { data, error } = await supabase
    .from('ministros')
    .update({
      nome: nome.trim(),
      foto_url: fotoUrl?.trim() || null,
    })
    .eq('id', id)
    .select(MINISTRO_SELECT)
    .single()

  if (error) throw error
  return {
    ...data,
    musicas_count: data.musicas?.[0]?.count ?? 0,
  }
}

export async function deleteMinistro(id) {
  const { data: musicas, error: listError } = await supabase
    .from('musicas')
    .select('id')
    .eq('ministro_id', id)

  if (listError) throw listError

  if (musicas?.length) {
    const { error: delMusicasError } = await supabase
      .from('musicas')
      .delete()
      .in(
        'id',
        musicas.map((m) => m.id),
      )
    if (delMusicasError) throw delMusicasError
  }

  const { error } = await supabase.from('ministros').delete().eq('id', id)
  if (error) throw error
}
