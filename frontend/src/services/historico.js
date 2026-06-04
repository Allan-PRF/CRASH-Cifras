import { supabase } from '../lib/supabase'

export async function registrarCultoHistorico({ playlist, musicas, versiculos }) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const snapshot = {
    playlist,
    musicas,
    versiculos,
  }

  const { data, error } = await supabase
    .from('cultos_historico')
    .insert({
      user_id: user.id,
      playlist_id: playlist.id,
      snapshot,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function fetchHistoricoCultos() {
  const { data, error } = await supabase
    .from('cultos_historico')
    .select('*')
    .order('realizado_em', { ascending: false })

  if (error) throw error
  return data
}
