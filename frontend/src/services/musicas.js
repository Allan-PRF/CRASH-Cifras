import { EMPTY_LINHAS } from '@crash-cifras/shared/chord-schema'
import { supabase } from '../lib/supabase'
import {
  introComConteudo,
  logCompartilharCopia,
  normalizarIntroParaCopia,
  secoesParaCopia,
} from '../lib/copiarMusicaHelpers'
import {
  getTomExibido,
  semitonesBetween,
  transposeLinhas,
} from '../lib/transpose'

const MUSICA_SELECT = `
  id,
  user_id,
  ministro_id,
  titulo,
  artista,
  youtube_url,
  bpm,
  tom_original,
  semitone_offset,
  capo,
  intro,
  versiculo_prefs,
  import_status,
  acervo_versao_id,
  created_at,
  updated_at,
  ministro:ministros!musicas_ministro_id_fkey (
    id,
    nome
  )
`

const MUSICA_SEARCH_SELECT = `
  id,
  titulo,
  artista,
  tom_original,
  bpm,
  ministro_id,
  ministro:ministros!musicas_ministro_id_fkey (
    id,
    nome
  )
`

const MUSICA_PLAYLIST_SELECT = `
  id,
  user_id,
  ministro_id,
  titulo,
  artista,
  youtube_url,
  bpm,
  tom_original,
  semitone_offset,
  capo,
  import_status,
  acervo_versao_id,
  created_at,
  updated_at,
  ministro:ministros!musicas_ministro_id_fkey (
    id,
    nome
  )
`

function normalizeSearchTerm(term) {
  return term?.trim().replace(/[%,()]/g, ' ')
}

export async function fetchMusicasByMinistro(ministroId) {
  const { data, error } = await supabase
    .from('musicas')
    .select(MUSICA_SELECT)
    .eq('ministro_id', ministroId)
    .order('titulo', { ascending: true })

  if (error) throw error
  return data
}

export async function fetchMinhasMusicas() {
  const { data, error } = await supabase
    .from('musicas')
    .select(MUSICA_SELECT)
    .order('titulo', { ascending: true })

  if (error) throw error
  return data
}

export async function fetchMusicasParaPlaylist() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data, error } = await supabase
    .from('musicas')
    .select(MUSICA_PLAYLIST_SELECT)
    .eq('user_id', user.id)
    .order('titulo', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function searchMusicas(term) {
  const query = normalizeSearchTerm(term)
  if (!query) return []

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('musicas')
    .select(MUSICA_SEARCH_SELECT)
    .eq('user_id', user.id)
    .or(`titulo.ilike.%${query}%,artista.ilike.%${query}%`)
    .order('titulo', { ascending: true })
    .limit(20)

  if (error) throw error
  return data ?? []
}

export async function copiarMusica(musicaId, { ministroIdDestino, tomDestino }) {
  const original = await fetchMusicaCompleta(musicaId)

  const intro = normalizarIntroParaCopia(original.intro)
  const omitirSecaoIntro = introComConteudo(intro)

  let tomOriginal = original.tom_original
  let secoes = secoesParaCopia(original.secoes, { omitirSecaoIntro })

  if (tomDestino && original.tom_original && tomDestino !== original.tom_original) {
    const semitones = semitonesBetween(original.tom_original, tomDestino)
    if (semitones) {
      tomOriginal = tomDestino
      secoes = secoes.map((sec) => ({
        ...sec,
        linhas: transposeLinhas(sec.linhas, semitones),
      }))
    }
  }

  logCompartilharCopia({
    titulo: original.titulo,
    ministroIdDestino,
    secoes,
    intro,
    tomOriginal,
    bpm: original.bpm,
    artista: original.artista,
  })

  return createMusica({
    ministroId: ministroIdDestino,
    titulo: original.titulo,
    artista: original.artista,
    tomOriginal,
    bpm: original.bpm,
    intro,
    youtubeUrl: original.youtube_url,
    secoesIniciais: secoes.length ? secoes : undefined,
    acervoVersaoId: original.acervo_versao_id || null,
  })
}

export async function fetchMusicaCompleta(musicaId) {
  const { data: musica, error: mErr } = await supabase
    .from('musicas')
    .select(MUSICA_SELECT)
    .eq('id', musicaId)
    .single()

  if (mErr) throw mErr

  const { data: secoes, error: sErr } = await supabase
    .from('secoes_musica')
    .select('*')
    .eq('musica_id', musicaId)
    .order('ordem_original', { ascending: true })

  if (sErr) throw sErr

  let ministroTom = null
  if (musica.ministro_id) {
    const { data: mm } = await supabase
      .from('musica_ministro')
      .select('tom_atual, semitone_offset')
      .eq('musica_id', musicaId)
      .eq('ministro_id', musica.ministro_id)
      .maybeSingle()
    ministroTom = mm
  }

  const offset =
    ministroTom?.semitone_offset ?? musica.semitone_offset ?? 0
  const tomBase = musica.tom_original
  const tomExibido = ministroTom?.tom_atual || getTomExibido(tomBase, offset)

  return {
    ...musica,
    secoes: secoes ?? [],
    tom_exibido: tomExibido,
    semitone_offset: offset,
  }
}

export async function createMusica({
  ministroId,
  titulo,
  artista,
  tomOriginal,
  bpm,
  intro,
  youtubeUrl,
  secoesIniciais,
  acervoVersaoId,
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Faça login para salvar músicas')

  const { data: musica, error } = await supabase
    .from('musicas')
    .insert({
      user_id: user.id,
      ministro_id: ministroId || null,
      titulo: titulo.trim(),
      artista: artista?.trim() || null,
      tom_original: tomOriginal || null,
      bpm: bpm ? Number(bpm) : null,
      youtube_url: youtubeUrl?.trim() || null,
      intro: intro || null,
      import_status: youtubeUrl ? 'ready' : 'manual',
      acervo_versao_id: acervoVersaoId || null,
    })
    .select(MUSICA_SELECT)
    .single()

  if (error) throw error

  if (ministroId && tomOriginal) {
    await supabase.from('musica_ministro').upsert({
      musica_id: musica.id,
      ministro_id: ministroId,
      tom_atual: tomOriginal,
      semitone_offset: 0,
    })
  }

  const secoes = secoesIniciais?.length
    ? secoesIniciais
    : [
        {
          slug: 'verso',
          nome: 'Verso 1',
          ordem_original: 0,
          linhas: EMPTY_LINHAS,
        },
      ]

  for (const sec of secoes) {
    await upsertSecao(musica.id, sec)
  }

  return fetchMusicaCompleta(musica.id)
}

/** Atualiza só o BPM oficial da música (teleprompter portrait). */
export async function updateMusicaBpm(musicaId, bpm) {
  const value =
    bpm != null && Number(bpm) >= 1 ? Math.round(Number(bpm)) : null
  const { data, error } = await supabase
    .from('musicas')
    .update({ bpm: value })
    .eq('id', musicaId)
    .select('id, bpm')
    .single()

  if (error) throw error
  return data
}

export async function updateMusica(id, fields) {
  const update = {
    titulo: fields.titulo?.trim(),
    artista: fields.artista?.trim() || null,
    tom_original: fields.tomOriginal,
    bpm: fields.bpm != null && fields.bpm !== '' ? Number(fields.bpm) : null,
    capo: fields.capo ?? undefined,
  }
  if (fields.intro !== undefined) update.intro = fields.intro
  if (fields.versiculoPrefs !== undefined) update.versiculo_prefs = fields.versiculoPrefs
  if (fields.importStatus !== undefined) update.import_status = fields.importStatus
  const { data, error } = await supabase
    .from('musicas')
    .update(update)
    .eq('id', id)
    .select(MUSICA_SELECT)
    .single()

  if (error) throw error
  return data
}

export async function deleteMusica(id) {
  const { error } = await supabase.from('musicas').delete().eq('id', id)
  if (error) throw error
}

export async function fetchAnotacaoMusica(musicaId) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('musica_anotacoes')
    .select('*')
    .eq('user_id', user.id)
    .eq('musica_id', musicaId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Mapa musica_id → conteudo (somente anotações não vazias do usuário logado).
 * @param {string[]} musicaIds
 * @returns {Promise<Record<string, string>>}
 */
export async function fetchAnotacoesPorMusicas(musicaIds) {
  const ids = [...new Set((musicaIds || []).filter(Boolean))]
  if (!ids.length) return {}

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return {}

  const { data, error } = await supabase
    .from('musica_anotacoes')
    .select('musica_id, conteudo')
    .eq('user_id', user.id)
    .in('musica_id', ids)

  if (error) throw error

  const map = {}
  for (const row of data || []) {
    const texto = String(row.conteudo || '').trim()
    if (texto) map[row.musica_id] = texto
  }
  return map
}

export async function salvarAnotacaoMusica(musicaId, conteudo) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data, error } = await supabase
    .from('musica_anotacoes')
    .upsert(
      {
        user_id: user.id,
        musica_id: musicaId,
        conteudo,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,musica_id' },
    )
    .select()
    .single()

  if (error) throw error
  return data
}

export async function upsertSecao(musicaId, secao) {
  const row = {
    musica_id: musicaId,
    slug: secao.slug,
    nome: secao.nome,
    ordem_original: secao.ordem_original,
    linhas: secao.linhas || EMPTY_LINHAS,
  }

  if (secao.id) {
    const { data, error } = await supabase
      .from('secoes_musica')
      .update(row)
      .eq('id', secao.id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('secoes_musica')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSecao(secaoId) {
  const { error } = await supabase
    .from('secoes_musica')
    .delete()
    .eq('id', secaoId)
  if (error) throw error
}

/**
 * Transpõe persistindo offset (graus continuam baseados em tom_original).
 */
export async function aplicarTom(musicaId, ministroId, novoTom) {
  const { data: musica, error } = await supabase
    .from('musicas')
    .select('tom_original, ministro_id')
    .eq('id', musicaId)
    .single()

  if (error) throw error
  if (!musica.tom_original) {
    throw new Error('Defina o tom original da música antes de transpor')
  }

  const semitones = semitonesBetween(musica.tom_original, novoTom)
  const mid = ministroId || musica.ministro_id

  if (mid) {
    const { error: mmErr } = await supabase.from('musica_ministro').upsert({
      musica_id: musicaId,
      ministro_id: mid,
      tom_atual: novoTom,
      semitone_offset: semitones,
    })
    if (mmErr) throw mmErr
  } else {
    const { error: upErr } = await supabase
      .from('musicas')
      .update({ semitone_offset: semitones })
      .eq('id', musicaId)
    if (upErr) throw upErr
  }

  return { tom_exibido: novoTom, semitone_offset: semitones }
}
