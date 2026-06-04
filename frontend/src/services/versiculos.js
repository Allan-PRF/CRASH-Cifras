import { api } from '../lib/api'
import { supabase } from '../lib/supabase'

async function authHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Faça login para gerar versículos')
  }

  return { Authorization: `Bearer ${session.access_token}` }
}

/** Gera versículos via IA no backend (prompt com regras da Bíblia Sagrada). */
export async function gerarVersiculosIA({
  versaoBiblica = 'NVI',
  titulo,
  artista,
  tom,
  secoes,
}) {
  const headers = await authHeaders()
  const { data } = await api.post(
    '/versiculos/gerar',
    { versaoBiblica, titulo, artista, tom, secoes },
    { headers },
  )
  return data
}

const VERSICULO_SELECT = `
  id,
  playlist_id,
  musica_id,
  versao_biblica,
  tema_identificado,
  versiculos,
  quantidade_versiculos,
  momentos_ativos,
  editado_pelo_usuario,
  gerado_em
`

function normalizeVersiculosRow(row) {
  if (!row) return null
  let versiculos = row.versiculos
  if (typeof versiculos === 'string') {
    try {
      versiculos = JSON.parse(versiculos)
    } catch {
      versiculos = []
    }
  }
  let momentos_ativos = row.momentos_ativos
  if (typeof momentos_ativos === 'string') {
    try {
      momentos_ativos = JSON.parse(momentos_ativos)
    } catch {
      momentos_ativos = null
    }
  }
  return { ...row, versiculos: versiculos ?? [], momentos_ativos }
}

export async function upsertVersiculosPlaylist({
  playlistId,
  musicaId,
  versaoBiblica,
  tema,
  versiculos,
  quantidadeVersiculos = 1,
  momentosAtivos,
}) {
  const { data, error } = await supabase
    .from('versiculos_playlist')
    .upsert(
      {
        playlist_id: playlistId,
        musica_id: musicaId,
        versao_biblica: versaoBiblica,
        tema_identificado: tema,
        versiculos,
        quantidade_versiculos: quantidadeVersiculos,
        momentos_ativos: momentosAtivos ?? null,
        editado_pelo_usuario: false,
        gerado_em: new Date().toISOString(),
      },
      { onConflict: 'playlist_id,musica_id' },
    )
    .select(VERSICULO_SELECT)
    .single()

  if (error) throw error
  const row = normalizeVersiculosRow(data)
  console.log('[versiculos] salvos:', row?.versiculos?.length ?? 0, 'versículos', {
    playlistId,
    musicaId,
    quantidade: row?.quantidade_versiculos,
    momentos_ativos: row?.momentos_ativos,
    ids: row?.versiculos?.map((v) => ({
      momento: v.momento,
      secao_id: v.secao_id,
      ref: v.referencia,
    })),
  })
  return row
}

export async function fetchVersiculosByPlaylist(playlistId) {
  const { data, error } = await supabase
    .from('versiculos_playlist')
    .select(VERSICULO_SELECT)
    .eq('playlist_id', playlistId)
    .order('gerado_em', { ascending: false })

  if (error) throw error
  return data
}

export async function fetchVersiculosForMusica(musicaId, playlistId) {
  console.log('[versiculos] buscando para musica:', musicaId, 'playlist:', playlistId || '(nenhuma)')

  let query = supabase
    .from('versiculos_playlist')
    .select(VERSICULO_SELECT)
    .eq('musica_id', musicaId)

  if (playlistId) query = query.eq('playlist_id', playlistId)

  const { data, error } = await query
    .order('gerado_em', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[versiculos] erro ao buscar:', error.message, error)
    throw error
  }

  const row = normalizeVersiculosRow(data)
  console.log('[versiculos] resultado busca:', row ? {
    id: row.id,
    qtd: row.versiculos?.length,
    quantidade_versiculos: row.quantidade_versiculos,
    momentos_ativos: row.momentos_ativos,
  } : 'nenhum registro')
  return row
}

export async function updateVersiculosRecord(id, updates) {
  const { data, error } = await supabase
    .from('versiculos_playlist')
    .update({ ...updates, editado_pelo_usuario: true })
    .eq('id', id)
    .select(VERSICULO_SELECT)
    .single()

  if (error) throw error
  return data
}
