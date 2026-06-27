import { supabase } from '../lib/supabase'

/** Playlist apagada ou inexistente — evita erro técnico do .single() vazio. */
export class PlaylistNotFoundError extends Error {
  constructor(playlistId) {
    super('Este evento não existe mais.')
    this.name = 'PlaylistNotFoundError'
    this.playlistId = playlistId
  }
}

export function isPlaylistNotFoundError(err) {
  return err?.name === 'PlaylistNotFoundError'
}

/** IDs de playlists que ainda existem no servidor (para podar cache offline). */
export async function fetchExistingPlaylistIds(ids) {
  if (!ids?.length) return new Set()
  const { data, error } = await supabase.from('playlists').select('id').in('id', ids)
  if (error) throw error
  return new Set((data ?? []).map((row) => row.id))
}

const PLAYLIST_SELECT = `
  id,
  user_id,
  equipe_id,
  nome,
  data_culto,
  status,
  preparado_em,
  created_at,
  updated_at
`

const ITEM_SELECT = `
  id,
  playlist_id,
  musica_id,
  ordem,
  instrucao_texto,
  ordem_secoes,
  tipo,
  medley_proxima_id,
  musicas (
    id,
    titulo,
    artista,
    bpm,
    tom_original,
    ministro_id,
    ministro:ministros!musicas_ministro_id_fkey (
      id,
      nome
    )
  )
`

export async function fetchPlaylists() {
  const { data, error } = await supabase
    .from('playlists')
    .select(PLAYLIST_SELECT)
    .not('data_culto', 'is', null)
    .order('data_culto', { ascending: false })

  if (error) throw error
  return data
}

export async function deletePlaylist(id) {
  const { error } = await supabase.from('playlists').delete().eq('id', id)
  if (error) throw error
}

/** Playlists em rascunho ou preparado que contêm a música. */
export async function fetchPlaylistsAtivasComMusica(musicaId) {
  const { data, error } = await supabase
    .from('playlist_itens')
    .select(
      `
      playlist:playlists (
        id,
        nome,
        status
      )
    `,
    )
    .eq('musica_id', musicaId)

  if (error) throw error

  const ativas = new Set(['rascunho', 'preparado'])
  const byId = new Map()
  for (const row of data ?? []) {
    const playlist = row.playlist
    if (playlist?.id && ativas.has(playlist.status)) {
      byId.set(playlist.id, playlist)
    }
  }
  return [...byId.values()]
}

/** Remove playlists de teste criadas sem data do evento. */
export async function deletePlaylistsSemData() {
  const { data, error } = await supabase
    .from('playlists')
    .select('id')
    .is('data_culto', null)

  if (error) throw error
  if (!data?.length) return 0

  const { error: deleteError } = await supabase
    .from('playlists')
    .delete()
    .in(
      'id',
      data.map((row) => row.id),
    )

  if (deleteError) throw deleteError
  return data.length
}

export async function createPlaylist({ nome, dataCulto, equipeId }) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Faça login para criar playlists')

  const row = {
    user_id: user.id,
    nome: nome.trim(),
    data_culto: dataCulto || null,
    status: 'rascunho',
  }
  if (equipeId) row.equipe_id = equipeId

  const { data, error } = await supabase
    .from('playlists')
    .insert(row)
    .select(PLAYLIST_SELECT)
    .single()

  if (error) throw error
  return data
}

export async function fetchPlaylistCompleta(id) {
  const { data: playlist, error } = await supabase
    .from('playlists')
    .select(PLAYLIST_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!playlist) throw new PlaylistNotFoundError(id)

  const { data: itens, error: itemError } = await supabase
    .from('playlist_itens')
    .select(ITEM_SELECT)
    .eq('playlist_id', id)
    .order('ordem', { ascending: true })

  if (itemError) throw itemError

  return { ...playlist, itens: itens ?? [] }
}

export async function addMusicaToPlaylist(playlistId, musicaId) {
  const { data: existing, error: listError } = await supabase
    .from('playlist_itens')
    .select('ordem')
    .eq('playlist_id', playlistId)
    .order('ordem', { ascending: false })
    .limit(1)

  if (listError) throw listError

  const nextOrder = (existing?.[0]?.ordem ?? 0) + 1
  const { data, error } = await supabase
    .from('playlist_itens')
    .insert({
      playlist_id: playlistId,
      musica_id: musicaId,
      ordem: nextOrder,
      instrucao_texto: 'Normal — início ao fim',
      tipo: 'normal',
    })
    .select(ITEM_SELECT)
    .single()

  if (error) throw error
  return data
}

export async function updatePlaylistItem(id, updates) {
  const { data, error } = await supabase
    .from('playlist_itens')
    .update(updates)
    .eq('id', id)
    .select(ITEM_SELECT)
    .single()

  if (error) throw error
  return data
}

export async function removePlaylistItem(id) {
  const { error } = await supabase.from('playlist_itens').delete().eq('id', id)
  if (error) throw error
}

export async function reorderPlaylistItems(playlistId, itemIds) {
  for (let index = 0; index < itemIds.length; index++) {
    const { error } = await supabase
      .from('playlist_itens')
      .update({ ordem: index + 1000 })
      .eq('playlist_id', playlistId)
      .eq('id', itemIds[index])
    if (error) throw error
  }

  for (let index = 0; index < itemIds.length; index++) {
    const { error } = await supabase
      .from('playlist_itens')
      .update({ ordem: index + 1 })
      .eq('playlist_id', playlistId)
      .eq('id', itemIds[index])
    if (error) throw error
  }
}

export async function marcarPlaylistPreparada(id) {
  const { data, error } = await supabase
    .from('playlists')
    .update({ status: 'preparado', preparado_em: new Date().toISOString() })
    .eq('id', id)
    .select(PLAYLIST_SELECT)
    .single()

  if (error) throw error
  return data
}

/** Volta o evento para rascunho para editar músicas e ordem. */
export async function reabrirPlaylistRascunho(id) {
  const { data, error } = await supabase
    .from('playlists')
    .update({ status: 'rascunho', preparado_em: null })
    .eq('id', id)
    .select(PLAYLIST_SELECT)
    .single()

  if (error) throw error
  return data
}

export async function prepararPlaylistComTimestamp(id) {
  return marcarPlaylistPreparada(id)
}
