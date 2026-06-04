import {
  isVersiculoModoManual,
  montarRegistroVersiculosFromPrefs,
  parseMomentosAtivos,
  prepararVersiculoPrefsParaSalvar,
  quantidadeFromMomentosAtivos,
  versiculosFromManualPrefs,
} from '@crash-cifras/shared/versiculos-config'
import { fetchVersiculosForMusica } from '../services/versiculos'
import { gerarVersiculos } from './palavraLocal'

function momentosAtivosFromMusicaPrefs(musica) {
  const raw = musica?.versiculo_prefs
  if (!raw || typeof raw !== 'object') return null
  return parseMomentosAtivos(raw.momentos_ativos)
}

function todosMomentosDesligados(momentos) {
  if (!momentos) return false
  return quantidadeFromMomentosAtivos(momentos) === 0
}

function filtrarVersiculosPorMomentos(versiculos, momentos) {
  if (!momentos || todosMomentosDesligados(momentos)) return []
  return (Array.isArray(versiculos) ? versiculos : []).filter(
    (v) => v?.momento && momentos[v.momento] === true,
  )
}

function registroVazio(musicaId, extras = {}) {
  const momentos_ativos = { verso: false, refrao: false, ponte: false }
  return {
    versao_biblica: 'NVI',
    tema_identificado: null,
    versiculos: [],
    quantidade_versiculos: 0,
    momentos_ativos,
    musica_id: musicaId,
    playlist_id: null,
    ...extras,
  }
}

/**
 * Resolve versículos para o teleprompter:
 * - Com ?playlist=: registro em versiculos_playlist do evento.
 * - Sem playlist: musicas.versiculo_prefs (manual ou IA/cache).
 */
export async function resolveVersiculosForTeleprompter({ musicaId, playlistId, musica }) {
  if (!musicaId || !musica) return null

  const momentosMusica = momentosAtivosFromMusicaPrefs(musica)

  if (playlistId) {
    const row = await fetchVersiculosForMusica(musicaId, playlistId)
    if (momentosMusica && todosMomentosDesligados(momentosMusica)) {
      console.log('[versiculos] playlist ignorada — todos os momentos OFF na música')
      return registroVazio(musicaId, { playlist_id: playlistId, _fonte: 'momentos_off' })
    }
    if (row && momentosMusica) {
      const filtrados = filtrarVersiculosPorMomentos(row.versiculos, momentosMusica)
      console.log('[versiculos] fonte: versiculos_playlist (filtrado por prefs música)', {
        playlistId,
        qtd: filtrados.length,
        momentos: momentosMusica,
      })
      return {
        ...row,
        versiculos: filtrados,
        momentos_ativos: momentosMusica,
        quantidade_versiculos: quantidadeFromMomentosAtivos(momentosMusica),
      }
    }
    console.log('[versiculos] fonte: versiculos_playlist (evento)', {
      playlistId,
      qtd: row?.versiculos?.length ?? 0,
    })
    return row
  }

  if (momentosMusica && todosMomentosDesligados(momentosMusica)) {
    console.log('[versiculos] todos os momentos OFF — sem exibição')
    return registroVazio(musicaId, { _fonte: 'momentos_off' })
  }

  const prefs = prepararVersiculoPrefsParaSalvar(musica.versiculo_prefs)
  console.log('[versiculos] sem playlist — versiculo_prefs:', prefs)

  if (!prefs) {
    console.log('[versiculos] prefs inválidas ou vazias — sem fallback legado')
    return null
  }

  const momentos = prefs.momentos_ativos
  if (todosMomentosDesligados(momentos)) {
    console.log('[versiculos] todos os momentos OFF (prefs) — sem exibição')
    return registroVazio(musicaId, { _fonte: 'momentos_off' })
  }

  if (isVersiculoModoManual(musica.versiculo_prefs) || prefs.modo === 'manual') {
    const versiculos = versiculosFromManualPrefs(musica.versiculo_prefs, musica.secoes ?? [])
    const record = montarRegistroVersiculosFromPrefs({
      prefs: musica.versiculo_prefs,
      versiculos,
      secoes: musica.secoes ?? [],
      tema: null,
      extras: {
        musica_id: musicaId,
        playlist_id: null,
        _fonte: 'versiculo_prefs+manual',
      },
    })
    console.log('[versiculos] modo manual:', {
      qtd: record?.versiculos?.length ?? 0,
      momentos: record?.momentos_ativos,
      ref: prefs.manual_referencia,
    })
    return record
  }

  const cache = await fetchVersiculosForMusica(musicaId, null)
  let versiculos = filtrarVersiculosPorMomentos(cache?.versiculos, momentos)
  let tema = cache?.tema_identificado ?? null
  let fonte = 'versiculo_prefs'

  if (!versiculos.length) {
    console.log('[versiculos] gerando textos (momentos ativos:', momentos, ')')
    const gerado = await gerarVersiculos(musica, prefs.versao_biblica)
    versiculos = filtrarVersiculosPorMomentos(gerado.versiculos, momentos)
    tema = gerado.tema ?? tema
    fonte = 'versiculo_prefs+gerado'
  } else {
    console.log('[versiculos] cache filtrado por momentos de versiculo_prefs')
    fonte = 'versiculo_prefs+cache_filtrado'
  }

  if (!versiculos.length) {
    console.log('[versiculos] nenhum versículo para momentos ativos')
    return registroVazio(musicaId, { _fonte: 'momentos_sem_texto' })
  }

  const record = montarRegistroVersiculosFromPrefs({
    prefs: musica.versiculo_prefs,
    versiculos,
    secoes: musica.secoes ?? [],
    tema,
    extras: {
      musica_id: musicaId,
      playlist_id: null,
      id: cache?.id ?? null,
      _fonte: fonte,
    },
  })

  console.log('[versiculos] registro montado (edição):', {
    fonte,
    qtd: record?.versiculos?.length ?? 0,
    momentos: record?.momentos_ativos,
  })

  return record
}
