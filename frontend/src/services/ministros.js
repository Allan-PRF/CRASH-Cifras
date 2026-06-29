import { supabase } from '../lib/supabase'
import { uploadFotoMinistroSeguro } from './upload'

const MINISTRO_SELECT = `
  id,
  nome,
  foto_url,
  arquivado_em,
  created_at,
  updated_at,
  musicas:musicas!musicas_ministro_id_fkey(count)
`

function mapMinistroRow(row) {
  return {
    ...row,
    musicas_count: row.musicas?.[0]?.count ?? 0,
  }
}

/** Upload via API (Sharp: validação, remoção EXIF, WebP). */
export async function uploadFotoMinistro(file) {
  return uploadFotoMinistroSeguro(file)
}

/** Lista ministros ativos por padrão (arquivado_em IS NULL). */
export async function fetchMinistros({ apenasAtivos = true } = {}) {
  let query = supabase.from('ministros').select(MINISTRO_SELECT).order('nome', { ascending: true })

  if (apenasAtivos) {
    query = query.is('arquivado_em', null)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(mapMinistroRow)
}

/** Ministros arquivados (ocultos da lista principal). */
export async function fetchMinistrosArquivados() {
  const { data, error } = await supabase
    .from('ministros')
    .select(MINISTRO_SELECT)
    .not('arquivado_em', 'is', null)
    .order('nome', { ascending: true })

  if (error) throw error
  return (data ?? []).map(mapMinistroRow)
}

export async function fetchMinistroById(id) {
  const { data, error } = await supabase
    .from('ministros')
    .select(MINISTRO_SELECT)
    .eq('id', id)
    .single()

  if (error) throw error
  return mapMinistroRow(data)
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
  return mapMinistroRow(data)
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
  return mapMinistroRow(data)
}

/** Oculta o ministro da lista principal; músicas e acervo permanecem intactos. */
export async function arquivarMinistro(id) {
  const { data, error } = await supabase
    .from('ministros')
    .update({ arquivado_em: new Date().toISOString() })
    .eq('id', id)
    .select(MINISTRO_SELECT)
    .single()

  if (error) throw error
  return mapMinistroRow(data)
}

/** Restaura ministro arquivado para a lista principal. */
export async function restaurarMinistro(id) {
  const { data, error } = await supabase
    .from('ministros')
    .update({ arquivado_em: null })
    .eq('id', id)
    .select(MINISTRO_SELECT)
    .single()

  if (error) throw error
  return mapMinistroRow(data)
}

/**
 * PERIGO — exclusão hard apagava TODAS as músicas da pasta antes de remover o ministro.
 * Não expor na UI. Mantida só por compatibilidade: redireciona para arquivar (acervo preservado).
 * @deprecated Use arquivarMinistro().
 */
export async function deleteMinistro(id) {
  return arquivarMinistro(id)
}
