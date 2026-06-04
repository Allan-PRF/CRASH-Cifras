import { supabase } from '../lib/supabase'

const TIMBRE_SELECT = `
  id,
  musica_id,
  analise_bruta,
  guia,
  gerado_em
`

export async function fetchTimbreByMusica(musicaId) {
  const { data, error } = await supabase
    .from('timbres_musica')
    .select(TIMBRE_SELECT)
    .eq('musica_id', musicaId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertTimbreMusica({ musicaId, guia, analiseBruta = null }) {
  const { data, error } = await supabase
    .from('timbres_musica')
    .upsert(
      {
        musica_id: musicaId,
        guia,
        analise_bruta: analiseBruta,
        gerado_em: new Date().toISOString(),
      },
      { onConflict: 'musica_id' },
    )
    .select(TIMBRE_SELECT)
    .single()

  if (error) throw error
  return data
}
