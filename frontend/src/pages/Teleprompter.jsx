import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Link,
  useBlocker,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { normalizeChordLine } from '@crash-cifras/shared/chord-schema'
import { autoWrapSecoes } from '../lib/cifraAutoWrap'
import { useContentMaxCols } from '../hooks/useContentMaxCols'
import { validateYoutubeUrl } from '@crash-cifras/shared/validate-youtube-url'
import { SECAO_PARA_MOMENTO_VERSICULO } from '@crash-cifras/shared/constants'
import {
  escolherVersiculoParaSecao,
  momentosAtivosFromRecord,
  normalizarVersiculoPrefs,
} from '@crash-cifras/shared/versiculos-config'
import { BlocoSecao } from '../components/cifra/LinhaCifra'
import {
  TELEPROMPTER_AO_VIVO_BOTTOM_MOBILE,
  TELEPROMPTER_ANOTACAO_BOTTOM_MOBILE,
  TELEPROMPTER_CANTO_TOP_RIGHT,
  TELEPROMPTER_MEDLEY_BOTTOM_DESKTOP,
  TELEPROMPTER_MEDLEY_BOTTOM_MOBILE,
  TELEPROMPTER_MEDLEY_RESERVE_RIGHT_DESKTOP,
  TELEPROMPTER_MEDLEY_RESERVE_RIGHT_MOBILE,
} from '../lib/teleprompterColunaDireita'
import {
  RodapePalavra,
  TELEPROMPTER_ANOTACAO_BOTTOM,
  TELEPROMPTER_ANOTACAO_RIGHT,
  TELEPROMPTER_BARRA_INFERIOR_ALTURA,
} from '../components/teleprompter/RodapePalavra'
import { TimbreCard } from '../components/timbre/TimbreCard'
import {
  BarraInferiorTeleprompter,
  BarraSuperiorTeleprompter,
} from '../components/teleprompter/TeleprompterBars'
import { MiniPlayerYoutube } from '../components/teleprompter/MiniPlayerYoutube'
import { TeleprompterLandscapeMarquee } from '../components/teleprompter/TeleprompterLandscapeMarquee'
import {
  buildLandscapeMarqueeBlocks,
  LANDSCAPE_FONT_SCALE,
  landscapeMaxScroll,
  landscapeScrollToBlockIndex,
} from '../lib/teleprompterLandscapeMarquee'
import { PainelConfigTeleprompter } from '../components/teleprompter/PainelConfigTeleprompter'
import { useUserSettings } from '../hooks/useUserSettings'
import { timbreParaSecao } from '../lib/timbreLocal'
import {
  clampBpmForOrientacao,
  loadLandscapeBpm,
  loadPortraitBpmFromMusica,
  saveLandscapeBpm,
} from '../lib/teleprompterBpm'
import {
  hasTeleprompterDisplayStorage,
  loadTeleprompterDisplay,
  saveTeleprompterDisplay,
} from '../lib/teleprompterDisplay'
import {
  loadYoutubeMinimized,
  loadYoutubePlayerEnabled,
  loadYoutubePosition,
  migrateYoutubePositionStorage,
  loadYoutubeSync,
  saveYoutubeMinimized,
  saveYoutubePlayerEnabled,
  saveYoutubePosition,
  saveYoutubeSync,
} from '../lib/teleprompterYoutube'
import { CifraSecaoCarousel } from '../components/musicas/CifraSecaoCarousel'
import { tomParaGrausMusica, getTomExibido, transposeLinhas } from '../lib/transpose'
import { simplifyLinhas } from '../lib/simplify'
import { EquipeLiveIndicator } from '../components/teleprompter/EquipeLiveIndicator'
import { AnotacaoPainelLeitura } from '../components/musicas/AnotacaoPainelLeitura'
import { normalizarAnotacaoEvento } from '../components/playlist/AnotacaoEventoItemBloco'
import { useEquipeSessao } from '../hooks/useEquipeSessao'
import { updateUserSettings } from '../services/settings'
import {
  fetchMusicaCompleta,
  fetchAnotacaoMusica,
  saveBpmPessoal,
} from '../services/musicas'
import { SalvarBpmPessoalModal } from '../components/teleprompter/SalvarBpmPessoalModal'
import { resolveVersiculosForTeleprompter } from '../lib/resolveVersiculosTeleprompter'
import { useIsMobile } from '../hooks/useIsMobile'
import {
  scaleTeleprompterFont,
  teleprompterLineHeightRatio,
} from '../lib/teleprompterMobile'
import { resolverProximaMusicaCulto } from '../lib/playlistCultoNav'
import { aplicarCifraEventoNaMusica } from '@crash-cifras/shared/cifra-evento'
import { fetchTimbreByMusica } from '../services/timbres'
import { fetchPlaylistCompleta } from '../services/playlists'
import {
  ORIENTACOES,
  TELEPROMPTER_SO_PORTRAIT,
  loadOrientacaoTeleprompter,
  orientacaoAlternavel,
  saveOrientacaoTeleprompter,
} from '../lib/teleprompterOrientacao'
import {
  consumeTapGuardAfterClick,
  createTouchTapGuard,
  onTouchMoveForTapGuard,
  onTouchStartForTapGuard,
} from '../lib/teleprompterTapScroll'

/** Mesmo critério de exibição do BlocoSecao (evita índice de linha divergente). */
function linhaTemConteudo(line) {
  const { chordLine, lyricLine } = normalizeChordLine(line)
  return Boolean(chordLine.trim() || lyricLine.trim())
}

function sectionKeyFor(sec, index) {
  return sec.id ? String(sec.id) : `s${index}`
}

// ——— Layout / orientação (antes em teleprompterLayout.js) ———
const ORIENTACOES_ORDEM = [
  ORIENTACOES.LANDSCAPE,
  ORIENTACOES.PORTRAIT,
  ORIENTACOES.FIXO,
]

const LAYOUT_POR_ORIENTACAO = {
  landscape: {
    label: 'Deitado',
    shortLabel: 'Landscape',
    icon: '↔',
    fontSteps: [
      { label: 'M', value: 44 },
      { label: 'G', value: 52 },
      { label: 'GG', value: 60 },
      { label: 'XG', value: 68 },
    ],
    defaultFontIndex: 1,
    sectionGap: 'space-y-20',
    lineGap: 'space-y-6',
    contentPadY: 'py-[38svh]',
    descricao: 'Fonte maior · ~2 linhas no foco',
  },
  portrait: {
    label: 'Em pé',
    shortLabel: 'Portrait',
    icon: '↕',
    fontSteps: [
      { label: 'P', value: 30 },
      { label: 'M', value: 34 },
      { label: 'G', value: 38 },
      { label: 'GG', value: 42 },
    ],
    defaultFontIndex: 1,
    sectionGap: 'space-y-10',
    lineGap: 'space-y-2',
    contentPadY: 'py-[22svh]',
    descricao: 'Fonte menor · mais linhas visíveis',
  },
  fixo: {
    label: 'Fixo',
    shortLabel: 'Fixo',
    icon: '▣',
    fontSteps: [
      { label: 'M', value: 32 },
      { label: 'G', value: 38 },
      { label: 'GG', value: 44 },
      { label: 'XG', value: 50 },
    ],
    defaultFontIndex: 1,
    sectionGap: 'space-y-10',
    lineGap: 'space-y-3',
    contentPadY: '',
    descricao: 'Uma seção por tela · sem rolagem · ◄ ► para avançar',
  },
}

/** Scroll linear: altura fixa por linha + BPM → ms por linha. */
const ALTURA_LINHA = 80
const COMPASSOS_POR_LINHA_SCROLL = 4

function segundosPorLinhaScroll(bpm) {
  return (60 / bpm) * COMPASSOS_POR_LINHA_SCROLL
}

/** Espaço abaixo da barra fixa (navegação manual de seção). */
const TELEPROMPTER_SCROLL_OFFSET = 112
/** Spacer no início do conteúdo (modo evento): scrollTop=0 → tela vazia; conteúdo sobe do rodapé. */
const TELEPROMPTER_EVENTO_SPACER_HEIGHT = '60vh'

function scrollParaElemento(container, targetEl) {
  if (!container || !targetEl) return 0
  const cRect = container.getBoundingClientRect()
  const tRect = targetEl.getBoundingClientRect()
  return Math.round(
    Math.max(
      0,
      container.scrollTop + (tRect.top - cRect.top) - TELEPROMPTER_SCROLL_OFFSET,
    ),
  )
}

export function Teleprompter() {
  const { musicaId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { settings, setSettings } = useUserSettings()
  const [musica, setMusica] = useState(null)
  const [musicaServidor, setMusicaServidor] = useState(null)
  const [versiculosRecord, setVersiculosRecord] = useState(null)
  const [timbreRecord, setTimbreRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState(0)
  const [activeLineKey, setActiveLineKey] = useState(null)
  const [paused, setPaused] = useState(true)
  const [modoEvento, setModoEvento] = useState(false)
  const [showGrades, setShowGrades] = useState(
    () => loadTeleprompterDisplay().graus_visiveis,
  )
  const [showChords, setShowChords] = useState(
    () => loadTeleprompterDisplay().acordes_visiveis,
  )
  const [showVerses, setShowVerses] = useState(true)
  const [versiculoRodapeVisivel, setVersiculoRodapeVisivel] = useState(true)
  const [showMetronome, setShowMetronome] = useState(true)
  const [orientacao, setOrientacao] = useState(() => loadOrientacaoTeleprompter())
  const [fontIndex, setFontIndex] = useState(() => {
    const o = loadOrientacaoTeleprompter()
    return LAYOUT_POR_ORIENTACAO[o].defaultFontIndex
  })
  const [bpm, setBpm] = useState(72)
  const bpmRef = useRef(72)
  /** BPM portrait efetivo salvo (bpm_pessoal ?? musicas.bpm). */
  const bpmBaseSalvoRef = useRef(72)
  /** Último BPM portrait da sessão (preserva ao alternar orientação). */
  const portraitBpmSessaoRef = useRef(null)
  const bpmPessoalDirtyRef = useRef(false)
  const [salvarBpmModalOpen, setSalvarBpmModalOpen] = useState(false)
  const [bpmParaSalvarModal, setBpmParaSalvarModal] = useState(null)
  const modoEventoRef = useRef(false)
  const pausedRef = useRef(true)
  const rafRef = useRef(null)
  const lastTimeRef = useRef(null)
  const scrollAccumRef = useRef(0)
  const [panelOpen, setPanelOpen] = useState(false)
  const [timbreOpen, setTimbreOpen] = useState(false)
  const [anotacao, setAnotacao] = useState(null)
  const [anotacaoPainelOpen, setAnotacaoPainelOpen] = useState(false)
  const [offsetSessao, setOffsetSessao] = useState(0)
  const [tomDestinoSessao, setTomDestinoSessao] = useState(null)
  const [simplificar, setSimplificar] = useState(false)
  const [youtubeEnabled, setYoutubeEnabled] = useState(() => loadYoutubePlayerEnabled())
  const [youtubeSync, setYoutubeSync] = useState(() => loadYoutubeSync())
  const [youtubeMinimized, setYoutubeMinimized] = useState(() => loadYoutubeMinimized())
  const [youtubePos, setYoutubePos] = useState(() => loadYoutubePosition())
  const [playlistCulto, setPlaylistCulto] = useState(null)
  const contentRef = useRef(null)
  const portraitScrollInnerRef = useRef(null)
  const landscapeTrackRef = useRef(null)
  const landscapeViewportRef = useRef(
    typeof window !== 'undefined' ? window.innerWidth : 800,
  )
  const [landscapeViewportW, setLandscapeViewportW] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 800,
  )
  const landscapeBlocksRef = useRef([])
  const landscapeActiveKeyRef = useRef(null)
  const orientacaoRef = useRef(orientacao)
  const lastBpmClickMsRef = useRef(0)
  const equipeSyncTimerRef = useRef(null)
  const touchTapGuardRef = useRef(createTouchTapGuard())

  const isLandscape = !TELEPROMPTER_SO_PORTRAIT && orientacao === ORIENTACOES.LANDSCAPE
  const isFixo = !TELEPROMPTER_SO_PORTRAIT && orientacao === ORIENTACOES.FIXO

  useEffect(() => {
    orientacaoRef.current = orientacao
  }, [orientacao])

  function applyLandscapeTransform(x) {
    const el = landscapeTrackRef.current
    if (el) {
      el.style.transform = `translate3d(${-Math.round(x)}px, -50%, 0)`
    }
  }

  /** Portrait: scrollTop inteiro + translateY fracionário evita trepidação do Math.round por frame. */
  function applyPortraitScroll(y) {
    const container = contentRef.current
    const inner = portraitScrollInnerRef.current
    if (!container) return
    const clamped = Math.max(0, y)
    const intY = Math.floor(clamped)
    const subY = clamped - intY
    container.scrollTop = intY
    if (inner) {
      if (subY > 0.0005) {
        inner.style.transform = `translate3d(0, ${-subY}px, 0)`
        inner.style.willChange = 'transform'
      } else {
        inner.style.transform = ''
        inner.style.willChange = ''
      }
    }
  }

  function clearPortraitSubpixelTransform() {
    const inner = portraitScrollInnerRef.current
    if (!inner) return
    inner.style.transform = ''
    inner.style.willChange = ''
  }

  function syncScrollAccumFromDom() {
    if (orientacaoRef.current === ORIENTACOES.LANDSCAPE) return
    clearPortraitSubpixelTransform()
    if (contentRef.current) {
      scrollAccumRef.current = contentRef.current.scrollTop
    }
  }

  function setScrollTop(y, { instant = false } = {}) {
    const container = contentRef.current
    if (!container) return
    const top = Math.max(0, y)
    scrollAccumRef.current = top
    if (instant) container.style.scrollBehavior = 'auto'
    applyPortraitScroll(top)
    if (instant) container.style.scrollBehavior = 'auto'
  }

  useEffect(() => {
    migrateYoutubePositionStorage()
    setYoutubePos(loadYoutubePosition())
  }, [])
  const sectionRefs = useRef([])
  const lineRefsMap = useRef({})
  const metronomeTimerRef = useRef(null)
  const playlistId = searchParams.get('playlist')
  const offset = offsetSessao
  const tomExibido = useMemo(
    () =>
      musica?.tom_original
        ? getTomExibido(musica.tom_original, offsetSessao, tomDestinoSessao)
        : null,
    [musica?.tom_original, offsetSessao, tomDestinoSessao],
  )
  const tomGraus = tomExibido ?? tomParaGrausMusica(musica, offsetSessao, tomDestinoSessao)

  const equipeSessao = useEquipeSessao()
  const equipeSeguindo = !equipeSessao.isLider && equipeSessao.sessao != null
  const sessaoRemotaRef = useRef(null)

  useEffect(() => {
    equipeSessao.iniciar()
  }, [equipeSessao.iniciar])

  // Líder: envia estado ao mudar seção, play/pause, BPM (debounce evita rajada de API/auth)
  const prevSyncRef = useRef(null)
  useEffect(() => {
    if (!equipeSessao.isLider || !equipeSessao.equipeId) return

    clearTimeout(equipeSyncTimerRef.current)
    equipeSyncTimerRef.current = window.setTimeout(() => {
      const key = `${musicaId}|${activeSection}|${paused}|${offset}|${bpm}`
      if (prevSyncRef.current === key) return
      prevSyncRef.current = key
      equipeSessao.atualizarSessao({
        playlist_id: playlistId || null,
        musica_id: musicaId,
        secao_index: activeSection,
        tocando: !paused,
        tom_offset: offset,
        bpm,
      })
    }, 200)

    return () => {
      clearTimeout(equipeSyncTimerRef.current)
    }
  }, [
    equipeSessao.isLider,
    equipeSessao.equipeId,
    equipeSessao.atualizarSessao,
    musicaId,
    activeSection,
    paused,
    offset,
    bpm,
    playlistId,
  ])

  // Membro: segue sessão do líder
  useEffect(() => {
    if (equipeSessao.isLider || !equipeSessao.sessao) return
    const s = equipeSessao.sessao
    const prev = sessaoRemotaRef.current

    if (s.musica_id && s.musica_id !== musicaId) {
      const url = `/teleprompter/musica/${s.musica_id}${s.playlist_id ? `?playlist=${s.playlist_id}` : ''}`
      navigate(url, { replace: true })
      return
    }

    if (prev?.secao_index !== s.secao_index && s.secao_index != null && s.secao_index !== activeSection) {
      scrollToSection(s.secao_index)
    }

    if (s.tocando != null && s.tocando !== !paused) {
      pausedRef.current = !s.tocando
      setPaused(!s.tocando)
      if (s.tocando) {
        if (!modoEvento) setModoEvento(true)
        lastTimeRef.current = null
      } else {
        syncScrollAccumFromDom()
      }
    }

    if (s.bpm != null && s.bpm !== bpmRef.current) {
      const remoto = clampBpmForOrientacao(
        s.bpm,
        orientacaoRef.current === ORIENTACOES.LANDSCAPE ? 'landscape' : 'portrait',
      )
      bpmRef.current = remoto
      setBpm(remoto)
    }

    sessaoRemotaRef.current = s
  }, [equipeSessao.sessao])

  const layout = LAYOUT_POR_ORIENTACAO[orientacao] ?? LAYOUT_POR_ORIENTACAO.landscape
  const fontSteps = layout.fontSteps
  const isMobile = useIsMobile()
  const fonteBase = fontSteps[fontIndex]?.value ?? fontSteps[1].value
  const fonteLetra = scaleTeleprompterFont(fonteBase, orientacao, isMobile)
  const fonteLetraLandscape = Math.round(fonteLetra * LANDSCAPE_FONT_SCALE)
  const lineHeightRatio = teleprompterLineHeightRatio(isMobile)
  const fontLabel = fontSteps[fontIndex]?.label ?? 'M'

  const fonteLetraWrap = isLandscape ? fonteLetraLandscape : fonteLetra
  const getTeleprompterContentWidth = useCallback(() => {
    if (isLandscape) {
      return landscapeViewportW || landscapeViewportRef.current || window.innerWidth || 0
    }
    return (
      portraitScrollInnerRef.current?.clientWidth ||
      contentRef.current?.clientWidth ||
      window.innerWidth ||
      0
    )
  }, [isLandscape, landscapeViewportW])
  const maxCols = useContentMaxCols(getTeleprompterContentWidth, fonteLetraWrap, {
    enabled: true,
    deps: [isLandscape, isFixo, orientacao, landscapeViewportW],
  })

  useEffect(() => {
    if (!settings) return
    if (!hasTeleprompterDisplayStorage()) {
      setShowGrades(settings.graus_visiveis !== false)
      setShowChords(true)
    }
    setShowVerses(settings.versiculos_visiveis !== false)
    setShowMetronome(settings.metronomo_visivel !== false)
  }, [settings])

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    fetchMusicaCompleta(musicaId)
      .then(setMusicaServidor)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [musicaId])

  useEffect(() => {
    if (!musicaServidor) {
      setMusica(null)
      return
    }
    let next = musicaServidor
    if (playlistId && playlistCulto?.itens?.length) {
      const item = playlistCulto.itens.find(
        (it) => String(it.musica_id) === String(musicaId),
      )
      next = aplicarCifraEventoNaMusica(musicaServidor, item?.cifra_evento)
    }
    setMusica(next)
  }, [musicaServidor, playlistCulto, playlistId, musicaId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!playlistId) {
      setPlaylistCulto(null)
      return
    }
    let cancelled = false
    fetchPlaylistCompleta(playlistId)
      .then((data) => {
        if (!cancelled) setPlaylistCulto(data)
      })
      .catch(() => {
        if (!cancelled) setPlaylistCulto(null)
      })
    return () => {
      cancelled = true
    }
  }, [playlistId])

  useEffect(() => {
    setActiveSection(0)
    setActiveLineKey(null)
    scrollAccumRef.current = 0
    setTomDestinoSessao(null)
  }, [musicaId])

  const proximaMusicaCulto = useMemo(
    () => resolverProximaMusicaCulto(playlistCulto, musicaId),
    [playlistCulto, musicaId],
  )

  const playlistItemAtual = useMemo(() => {
    if (!playlistId || !playlistCulto?.itens?.length) return null
    return (
      playlistCulto.itens.find((it) => String(it.musica_id) === String(musicaId)) ?? null
    )
  }, [playlistCulto, playlistId, musicaId])

  useEffect(() => {
    if (!musica || String(musica.id) !== String(musicaId)) return
    const offset = musica.semitone_offset ?? 0
    setOffsetSessao(offset)
    if (
      offset !== 0 &&
      musica.tom_exibido &&
      musica.tom_exibido !== musica.tom_original
    ) {
      setTomDestinoSessao(musica.tom_exibido)
    } else {
      setTomDestinoSessao(null)
    }
  }, [
    musicaId,
    musica?.id,
    musica?.semitone_offset,
    musica?.tom_exibido,
    musica?.tom_original,
  ])

  useEffect(() => {
    if (!musicaId || !musica) return
    let cancelled = false

    if (!playlistId && !normalizarVersiculoPrefs(musica.versiculo_prefs)) {
      console.warn(
        '[versiculos] URL sem ?playlist= e música sem versiculo_prefs — configure em Editar música ou abra pelo evento preparado.',
      )
    }

    resolveVersiculosForTeleprompter({ musicaId, playlistId: playlistId || null, musica })
      .then((row) => {
        if (!cancelled) setVersiculosRecord(row)
      })
      .catch((err) => {
        console.error('[versiculos] falha no teleprompter:', err.message)
        if (!cancelled) setVersiculosRecord(null)
      })

    return () => {
      cancelled = true
    }
  }, [musicaId, playlistId, musica])

  useEffect(() => {
    fetchTimbreByMusica(musicaId)
      .then(setTimbreRecord)
      .catch(() => setTimbreRecord(null))
  }, [musicaId])

  useEffect(() => {
    fetchAnotacaoMusica(musicaId)
      .then(setAnotacao)
      .catch(() => setAnotacao(null))
  }, [musicaId])

  const secoes = musica?.secoes ?? []
  const secaoAtual = secoes[activeSection]
  const momentosAtivosVersiculo = useMemo(
    () => momentosAtivosFromRecord(versiculosRecord),
    [versiculosRecord],
  )

  const versiculoAtual = escolherVersiculoParaSecao({
    versiculos: versiculosRecord?.versiculos,
    quantidadeVersiculos: versiculosRecord?.quantidade_versiculos ?? 1,
    momentosAtivos: momentosAtivosVersiculo,
    secao: secaoAtual,
  })
  const timbreAtual = timbreParaSecao(timbreRecord?.guia, secaoAtual)
  const rodapeAtivo = showVerses && Boolean(versiculoAtual) && versiculoRodapeVisivel

  useEffect(() => {
    setVersiculoRodapeVisivel(true)
  }, [activeSection, versiculoAtual?.referencia, versiculoAtual?.texto])

  useEffect(() => {
    if (!musica) return
    const momentoSlug = secaoAtual
      ? SECAO_PARA_MOMENTO_VERSICULO[secaoAtual.slug] || 'verso'
      : null
    console.log('[versiculos] seção atual:', {
      index: activeSection,
      nome: secaoAtual?.nome,
      slug: secaoAtual?.slug,
      id: secaoAtual?.id,
      momentoEsperado: momentoSlug,
      playlistId: playlistId || null,
      toggleVersiculos: showVerses,
      rodapeVisivel: versiculoRodapeVisivel,
      record: versiculosRecord
        ? {
            qtd: versiculosRecord.versiculos?.length,
            momentos: momentosAtivosVersiculo,
            fonte: versiculosRecord._fonte || (playlistId ? 'playlist' : 'musica'),
          }
        : null,
      versiculo: versiculoAtual
        ? {
            ref: versiculoAtual.referencia,
            momento: versiculoAtual.momento,
            secao_id: versiculoAtual.secao_id,
          }
        : null,
      exibirRodape: rodapeAtivo,
    })
  }, [
    musica,
    activeSection,
    secaoAtual,
    playlistId,
    showVerses,
    versiculoRodapeVisivel,
    versiculosRecord,
    momentosAtivosVersiculo,
    versiculoAtual,
    rodapeAtivo,
  ])

  const youtubeVideoId = useMemo(() => {
    const result = validateYoutubeUrl(musica?.youtube_url)
    return result.valid ? result.videoId : null
  }, [musica?.youtube_url])

  function toggleYoutubeEnabled() {
    setYoutubeEnabled((v) => {
      const next = !v
      saveYoutubePlayerEnabled(next)
      return next
    })
  }

  function toggleYoutubeSync() {
    setYoutubeSync((v) => {
      const next = !v
      saveYoutubeSync(next)
      return next
    })
  }

  function handleYoutubePosition(pos) {
    setYoutubePos(pos)
    saveYoutubePosition(pos)
  }

  /**
   * Linhas para EXIBIÇÃO: transpose/simplify + wrap adaptativo (Cifra Club).
   * maxCols só muda com largura/fonte — não com scroll. Banco permanece com linhas inteiras.
   */
  const linhasPorSecao = useMemo(() => {
    const transposed = secoes.map((sec) =>
      transposeLinhas(sec.linhas, offset, { tonDestino: tomExibido ?? undefined }),
    )
    const base = simplificar
      ? transposed.map((linhas) => simplifyLinhas(linhas))
      : transposed
    if (maxCols == null) return base
    const wrapped = autoWrapSecoes(
      base.map((linhas, i) => ({
        slug: secoes[i]?.slug,
        nome: secoes[i]?.nome,
        linhas,
      })),
      maxCols,
    )
    return wrapped.secoes.map((s) => s.linhas)
  }, [secoes, offset, tomExibido, simplificar, maxCols])

  const flatLines = useMemo(() => {
    const items = []
    linhasPorSecao.forEach((linhas, secIdx) => {
      const sk = sectionKeyFor(secoes[secIdx], secIdx)
      linhas?.lines?.forEach((line, lineIdx) => {
        if (!linhaTemConteudo(line)) return
        items.push({
          key: `${sk}-${lineIdx}`,
          secIdx,
          sk,
          lineIdx,
        })
      })
    })
    return items
  }, [linhasPorSecao, secoes])

  const flatLineKeys = useMemo(() => flatLines.map((l) => l.key), [flatLines])

  const landscapeBlocks = useMemo(() => {
    if (!isLandscape || !flatLines.length) return []
    return buildLandscapeMarqueeBlocks({
      flatLines,
      linhasPorSecao,
      fonteLetra: fonteLetraLandscape,
    })
  }, [isLandscape, flatLines, linhasPorSecao, fonteLetraLandscape])

  useEffect(() => {
    landscapeBlocksRef.current = landscapeBlocks
  }, [landscapeBlocks])

  function landscapeBlockIndexAtScroll(scrollX, blocks, viewportWidth) {
    let edge = viewportWidth
    for (let i = 0; i < blocks.length; i++) {
      if (scrollX < edge + blocks[i].width) return i
      edge += blocks[i].width
    }
    return Math.max(0, blocks.length - 1)
  }

  function setLandscapeScroll(x, { instant = true } = {}) {
    const vw = landscapeViewportRef.current
    const blocks = landscapeBlocksRef.current
    const max = landscapeMaxScroll(blocks, vw)
    const top = Math.max(0, Math.min(Math.round(x), max))
    scrollAccumRef.current = top
    applyLandscapeTransform(top)
    if (instant) {
      const idx = landscapeBlockIndexAtScroll(top, blocks, vw)
      const block = blocks[idx]
      if (block) syncActiveFromLineKey(block.key)
    }
  }

  const applyBpmForOrientacao = useCallback((orient, musicaRow) => {
    if (!musicaRow?.id) return
    const base = loadPortraitBpmFromMusica(musicaRow)
    bpmBaseSalvoRef.current = base
    if (orient === ORIENTACOES.LANDSCAPE) {
      const valor = loadLandscapeBpm(musicaRow.ministro_id, musicaRow.id)
      bpmRef.current = valor
      setBpm(valor)
      return
    }
    const valor = portraitBpmSessaoRef.current ?? base
    bpmRef.current = valor
    setBpm(valor)
  }, [])

  useEffect(() => {
    if (!musica?.id) return
    const base = loadPortraitBpmFromMusica(musica)
    bpmBaseSalvoRef.current = base
    portraitBpmSessaoRef.current = base
    bpmPessoalDirtyRef.current = false
    applyBpmForOrientacao(orientacao, musica)
    // Só reinicia sessão BPM ao trocar de música / ministro (não a cada re-render).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- orientacao via outro effect
  }, [musica?.id, musica?.ministro_id])

  useEffect(() => {
    if (!musica?.id) return
    applyBpmForOrientacao(orientacao, musica)
  }, [orientacao, applyBpmForOrientacao, musica])

  useEffect(() => {
    if (!musica?.id) return
    if (orientacao === ORIENTACOES.LANDSCAPE) return
    if (bpmPessoalDirtyRef.current) return
    const valor = loadPortraitBpmFromMusica(musica)
    bpmBaseSalvoRef.current = valor
    portraitBpmSessaoRef.current = valor
    bpmRef.current = valor
    setBpm(valor)
  }, [musica?.bpm, musica?.bpm_pessoal, musica?.id, orientacao, musica])

  const anotacaoPastaTexto = anotacao?.conteudo?.trim() || ''
  const anotacaoEventoTexto = normalizarAnotacaoEvento(playlistItemAtual?.anotacao_evento)
  const temAnotacao = Boolean(anotacaoEventoTexto || anotacaoPastaTexto)

  const progresso = useMemo(() => {
    if (!secoes.length) return '0/0 seções'
    return `${activeSection + 1}/${secoes.length} seções`
  }, [activeSection, secoes.length])

  const secondsPerLine = segundosPorLinhaScroll(bpm)

  const registerLineRef = useCallback((key, node) => {
    if (node) lineRefsMap.current[key] = node
    else delete lineRefsMap.current[key]
  }, [])

  function syncActiveFromLineKey(lineKey) {
    if (!lineKey) return
    setActiveLineKey(lineKey)
    const entry = flatLines.find((l) => l.key === lineKey)
    if (entry && entry.secIdx !== activeSection) {
      setActiveSection(entry.secIdx)
    }
  }

  useEffect(() => {
    modoEventoRef.current = modoEvento
  }, [modoEvento])

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  function scrollToSection(index) {
    const next = Math.max(0, Math.min(index, secoes.length - 1))
    setActiveSection(next)

    if (orientacaoRef.current === ORIENTACOES.FIXO) return

    if (orientacaoRef.current === ORIENTACOES.LANDSCAPE) {
      const blockIdx = landscapeBlocksRef.current.findIndex((b) => b.secIdx === next)
      if (blockIdx >= 0) {
        requestAnimationFrame(() => {
          setLandscapeScroll(
            landscapeScrollToBlockIndex(
              landscapeBlocksRef.current,
              blockIdx,
              landscapeViewportRef.current,
            ),
            { instant: true },
          )
        })
      }
      return
    }

    const container = contentRef.current
    if (!container) return

    const sk = sectionKeyFor(secoes[next], next)
    const firstLine = flatLines.find((l) => l.sk === sk)
    const el = firstLine ? lineRefsMap.current[firstLine.key] : null
    const sectionEl = sectionRefs.current[next]

    const aplicarScroll = () => {
      const c = contentRef.current
      if (!c) return
      if (el) {
        setScrollTop(scrollParaElemento(c, el), { instant: true })
        syncActiveFromLineKey(firstLine.key)
        return
      }
      if (sectionEl) {
        setScrollTop(scrollParaElemento(c, sectionEl), { instant: true })
      }
    }

    requestAnimationFrame(aplicarScroll)
  }

  function reiniciar() {
    console.log('[nav] botão clicado:', 'reiniciar')
    setActiveSection(0)
    const firstKey = flatLineKeys[0]
    if (firstKey) setActiveLineKey(firstKey)
    lastTimeRef.current = null

    requestAnimationFrame(() => {
      scrollAccumRef.current = 0
      if (orientacaoRef.current === ORIENTACOES.FIXO) return
      if (orientacaoRef.current === ORIENTACOES.LANDSCAPE) {
        setLandscapeScroll(0, { instant: true })
      } else {
        setScrollTop(0, { instant: true })
      }
    })
  }

  function irParaProximaSecao() {
    console.log('[nav] botão clicado:', 'proximo')
    scrollToSection(activeSection + 1)
  }

  function irParaSecaoAnterior() {
    console.log('[nav] botão clicado:', 'anterior')
    scrollToSection(activeSection - 1)
  }

  const irParaProximaMusicaCulto = useCallback(() => {
    if (!proximaMusicaCulto || !playlistId) return
    if (equipeSessao.isLider && equipeSessao.equipeId) {
      equipeSessao.atualizarSessao({
        playlist_id: playlistId,
        musica_id: proximaMusicaCulto.musicaId,
        secao_index: 0,
        tocando: !pausedRef.current,
        tom_offset: offsetSessao,
        bpm: bpmRef.current,
      })
    }
    navigate(`/teleprompter/musica/${proximaMusicaCulto.musicaId}?playlist=${playlistId}`)
  }, [
    proximaMusicaCulto,
    playlistId,
    equipeSessao.isLider,
    equipeSessao.equipeId,
    equipeSessao.atualizarSessao,
    offsetSessao,
    navigate,
  ])

  function togglePause() {
    const next = !pausedRef.current
    if (orientacaoRef.current === ORIENTACOES.FIXO) {
      pausedRef.current = next
      setPaused(next)
      return
    }
    if (next) {
      syncScrollAccumFromDom()
    } else {
      if (!modoEventoRef.current) {
        modoEventoRef.current = true
        setModoEvento(true)
        requestAnimationFrame(() => {
          scrollAccumRef.current = 0
          if (orientacaoRef.current === ORIENTACOES.LANDSCAPE) {
            setLandscapeScroll(0, { instant: true })
          } else {
            setScrollTop(0, { instant: true })
          }
        })
      } else {
        syncScrollAccumFromDom()
      }
      lastTimeRef.current = null
    }
    pausedRef.current = next
    setPaused(next)
  }

  function toggleOrientacao() {
    setOrientacao((atual) => {
      const idx = ORIENTACOES_ORDEM.indexOf(atual)
      const next = ORIENTACOES_ORDEM[(idx + 1) % ORIENTACOES_ORDEM.length]
      saveOrientacaoTeleprompter(next)
      const nextLayout = LAYOUT_POR_ORIENTACAO[next]
      setFontIndex(nextLayout.defaultFontIndex)
      orientacaoRef.current = next
      scrollAccumRef.current = 0
      requestAnimationFrame(() => {
        if (next === ORIENTACOES.FIXO) return
        if (next === ORIENTACOES.LANDSCAPE) {
          setLandscapeScroll(0, { instant: true })
        } else {
          setScrollTop(0, { instant: true })
        }
      })
      return next
    })
  }

  async function toggleGrades() {
    const next = !showGrades
    setShowGrades(next)
    saveTeleprompterDisplay({ graus_visiveis: next, acordes_visiveis: showChords })
    setSettings?.((current) =>
      current ? { ...current, graus_visiveis: next } : current,
    )
    try {
      await updateUserSettings({ graus_visiveis: next })
    } catch {
      // preferência local
    }
  }

  function toggleChords() {
    const next = !showChords
    setShowChords(next)
    saveTeleprompterDisplay({ acordes_visiveis: next, graus_visiveis: showGrades })
  }

  async function toggleMetronome() {
    const next = !showMetronome
    setShowMetronome(next)
    setSettings?.((current) =>
      current ? { ...current, metronomo_visivel: next } : current,
    )
    try {
      await updateUserSettings({ metronomo_visivel: next })
    } catch {
      // preferência local
    }
  }

  async function toggleVerses() {
    const next = !showVerses
    setShowVerses(next)
    setSettings?.((current) =>
      current ? { ...current, versiculos_visiveis: next } : current,
    )
    try {
      await updateUserSettings({ versiculos_visiveis: next })
    } catch {
      // preferência local
    }
  }

  function toggleModoEvento() {
    setModoEvento((value) => {
      const next = !value
      modoEventoRef.current = next
      return next
    })
  }

  function changeFont(delta) {
    setFontIndex((value) =>
      Math.max(0, Math.min(fontSteps.length - 1, value + delta)),
    )
  }

  function changeBpm(delta) {
    const novo = clampBpmForOrientacao(
      bpmRef.current + delta,
      orientacaoRef.current === ORIENTACOES.LANDSCAPE ? 'landscape' : 'portrait',
    )
    bpmRef.current = novo
    setBpm(novo)
    if (!musicaId) return

    if (orientacaoRef.current === ORIENTACOES.LANDSCAPE) {
      saveLandscapeBpm(musica?.ministro_id, musicaId, novo)
      return
    }

    // Portrait/fixo: só sessão até [Salvar] no prompt ao sair.
    portraitBpmSessaoRef.current = novo
    bpmPessoalDirtyRef.current = Boolean(
      musica?.ministro_id && novo !== bpmBaseSalvoRef.current,
    )
  }

  function handleBpmClick(delta, event) {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    const now = Date.now()
    if (now - lastBpmClickMsRef.current < 100) return
    lastBpmClickMsRef.current = now
    changeBpm(delta)
  }

  const shouldBlockBpmLeave = useCallback(() => {
    return Boolean(
      musica?.ministro_id &&
        bpmPessoalDirtyRef.current &&
        portraitBpmSessaoRef.current != null &&
        portraitBpmSessaoRef.current !== bpmBaseSalvoRef.current,
    )
  }, [musica?.ministro_id])

  const bpmLeaveBlocker = useBlocker(shouldBlockBpmLeave)

  useEffect(() => {
    if (bpmLeaveBlocker.state === 'blocked') {
      setBpmParaSalvarModal(portraitBpmSessaoRef.current ?? bpmRef.current)
      setSalvarBpmModalOpen(true)
    }
  }, [bpmLeaveBlocker.state])

  useEffect(() => {
    function onBeforeUnload(event) {
      if (!shouldBlockBpmLeave()) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [shouldBlockBpmLeave])

  async function confirmarSalvarBpmPessoal() {
    const valor = portraitBpmSessaoRef.current ?? bpmRef.current
    await saveBpmPessoal(musicaId, musica.ministro_id, valor)
    bpmBaseSalvoRef.current = clampBpmForOrientacao(valor, 'portrait')
    portraitBpmSessaoRef.current = bpmBaseSalvoRef.current
    bpmPessoalDirtyRef.current = false
    setMusica((prev) =>
      prev ? { ...prev, bpm_pessoal: bpmBaseSalvoRef.current } : prev,
    )
    setSalvarBpmModalOpen(false)
    if (bpmLeaveBlocker.state === 'blocked') {
      bpmLeaveBlocker.proceed()
    }
  }

  function descartarBpmPessoalESair() {
    bpmPessoalDirtyRef.current = false
    portraitBpmSessaoRef.current = bpmBaseSalvoRef.current
    setSalvarBpmModalOpen(false)
    if (bpmLeaveBlocker.state === 'blocked') {
      bpmLeaveBlocker.proceed()
    }
  }

  const metronomeDotRef = useRef(null)

  useEffect(() => {
    function tick(timestamp) {
      if (
        !pausedRef.current &&
        modoEventoRef.current &&
        orientacaoRef.current !== ORIENTACOES.FIXO
      ) {
        if (lastTimeRef.current === null) {
          lastTimeRef.current = timestamp
        }
        const delta = timestamp - lastTimeRef.current
        lastTimeRef.current = timestamp

        const msPorLinha = (60 / bpmRef.current) * COMPASSOS_POR_LINHA_SCROLL * 1000

        if (orientacaoRef.current === ORIENTACOES.LANDSCAPE) {
          const blocks = landscapeBlocksRef.current
          const vw = landscapeViewportRef.current
          const pixelsPorMs = ALTURA_LINHA / msPorLinha
          const max = landscapeMaxScroll(blocks, vw)
          scrollAccumRef.current = Math.min(
            scrollAccumRef.current + delta * pixelsPorMs,
            max,
          )
          applyLandscapeTransform(scrollAccumRef.current)
          const idx = landscapeBlockIndexAtScroll(
            scrollAccumRef.current,
            blocks,
            vw,
          )
          const block = blocks[idx]
          if (block?.key && block.key !== landscapeActiveKeyRef.current) {
            landscapeActiveKeyRef.current = block.key
            syncActiveFromLineKey(block.key)
          }
        } else {
          const pixelsPorMs = ALTURA_LINHA / msPorLinha
          scrollAccumRef.current += delta * pixelsPorMs
          applyPortraitScroll(scrollAccumRef.current)
        }
      } else {
        lastTimeRef.current = null
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  useEffect(() => {
    if (!showMetronome || !modoEvento || paused || !bpm || isFixo) {
      if (metronomeDotRef.current) metronomeDotRef.current.style.opacity = '0.3'
      return
    }

    const beatMs = Math.max(250, Math.round(60000 / bpm))
    function pulse() {
      const dot = metronomeDotRef.current
      if (dot) {
        dot.style.opacity = '1'
        window.setTimeout(() => {
          if (metronomeDotRef.current) metronomeDotRef.current.style.opacity = '0.3'
        }, 120)
      }
    }
    pulse()
    metronomeTimerRef.current = window.setInterval(pulse, beatMs)
    return () => {
      window.clearInterval(metronomeTimerRef.current)
      metronomeTimerRef.current = null
    }
  }, [showMetronome, modoEvento, paused, bpm, isFixo])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.target.closest?.('input, textarea, select, button, a')) return
      if (event.code === 'Space') {
        event.preventDefault()
        togglePause()
      }
      if (orientacaoAlternavel()) {
        if (event.key === 'ArrowLeft') irParaSecaoAnterior()
        if (event.key === 'ArrowRight') irParaProximaSecao()
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        changeFont(1)
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        changeFont(-1)
      }
      if (event.key.toLowerCase() === 'g') toggleGrades()
      if (event.key.toLowerCase() === 't') setPanelOpen((value) => !value)
      if (event.key.toLowerCase() === 'm') toggleModoEvento()
      if (orientacaoAlternavel() && event.key.toLowerCase() === 'o') toggleOrientacao()
      if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        handleBpmClick(1, event)
      }
      if (event.key === '-') {
        event.preventDefault()
        handleBpmClick(-1, event)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  function handleContentClick(event) {
    if (event.target.closest?.('button, a, [data-teleprompter-versiculo]')) return
    if (consumeTapGuardAfterClick(touchTapGuardRef.current)) return
    togglePause()
  }

  function handlePortraitTouchStart(event) {
    onTouchStartForTapGuard(touchTapGuardRef.current, event)
  }

  function handlePortraitTouchMove(event) {
    onTouchMoveForTapGuard(touchTapGuardRef.current, event)
  }

  function handlePortraitScroll() {
    syncScrollAccumFromDom()
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-black text-white">
        Carregando teleprompter…
      </div>
    )
  }

  if (error || !musica) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-black p-6 text-center text-white">
        <p className="text-red-400">{error || 'Música não encontrada'}</p>
        <Link to="/" className="text-[var(--crash-cifra)] hover:underline">
          Voltar ao início
        </Link>
      </div>
    )
  }

  const teleprompterBackTo = playlistId
    ? `/playlist/${playlistId}`
    : musica.ministro_id
      ? `/ministro/${musica.ministro_id}`
      : '/'

  return (
    <div className="min-h-svh overflow-hidden bg-black text-white">
      <BarraSuperiorTeleprompter
        musica={musica}
        secaoAtual={secaoAtual}
        progresso={progresso}
        pausado={paused}
        mostrarGraus={showGrades}
        mostrarMetronomo={showMetronome}
        metronomeOn={showMetronome && modoEvento && !paused}
        modoEvento={modoEvento}
        orientacaoLabel={layout.shortLabel}
        orientacaoIcon={layout.icon}
        tomOriginal={musica.tom_original}
        offsetSessao={offsetSessao}
        onOffsetSessaoChange={setOffsetSessao}
        tomDestino={tomDestinoSessao}
        onTomDestinoChange={setTomDestinoSessao}
        onToggleOrientacao={toggleOrientacao}
        onToggleGraus={toggleGrades}
        onOpenSettings={() => setPanelOpen(true)}
        showOrientacaoToggle={orientacaoAlternavel()}
        backTo={teleprompterBackTo}
      />

      {(equipeSessao.isLider || equipeSeguindo) && (
        <>
          <div className="fixed left-1/2 top-12 z-30 hidden -translate-x-1/2 sm:block">
            <EquipeLiveIndicator
              isLider={equipeSessao.isLider}
              membrosOnline={equipeSessao.membrosOnline}
              liderNome={equipeSessao.liderNome}
              seguindo={equipeSeguindo}
            />
          </div>
          <div
            className="fixed z-[44] sm:hidden"
            style={{
              right: TELEPROMPTER_CANTO_TOP_RIGHT,
              bottom: TELEPROMPTER_AO_VIVO_BOTTOM_MOBILE,
            }}
          >
            <EquipeLiveIndicator
              variant="compact"
              isLider={equipeSessao.isLider}
              membrosOnline={equipeSessao.membrosOnline}
              liderNome={equipeSessao.liderNome}
              seguindo={equipeSeguindo}
            />
          </div>
        </>
      )}

      {/* Modos fixo / landscape desativados via TELEPROMPTER_SO_PORTRAIT — código mantido para religar */}
      {isFixo ? (
        <main
          className={`flex h-[100svh] flex-col justify-center px-2 pt-[5.5rem] sm:px-6 sm:pt-20 ${
            isMobile ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'
          }`}
          style={{ paddingBottom: TELEPROMPTER_BARRA_INFERIOR_ALTURA + 16 }}
          onClick={isMobile ? handleContentClick : undefined}
        >
          <div className="mx-auto w-full max-w-5xl">
            {secoes.length === 0 ? (
              <p className="text-center text-xl text-[var(--crash-texto-sec)]">
                Esta música ainda não tem seções.
              </p>
            ) : (
              <CifraSecaoCarousel
                secoes={secoes}
                activeIndex={activeSection}
                onActiveIndexChange={setActiveSection}
                variant="teleprompter"
                disableKeyboard
                renderSlide={(sec, index) => {
                  const sk = sectionKeyFor(sec, index)
                  return (
                    <div>
                      <div className="mb-4 flex items-center justify-center gap-3 sm:mb-6">
                        <span className="h-2.5 w-2.5 rounded-full bg-[var(--crash-cifra)]" />
                        <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--crash-cifra)] sm:text-base">
                          {sec.nome}
                        </h2>
                      </div>
                      <BlocoSecao
                        linhas={linhasPorSecao[index]}
                        tomOriginal={tomGraus}
                        mostrarAcordes={showChords}
                        mostrarGrau={showGrades}
                        fonteLetra={fonteLetra}
                        sectionKey={sk}
                        lineGapClassName={layout.lineGap}
                        lineHeightRatio={lineHeightRatio}
                        corLetra="#FFFFFF"
                      />
                    </div>
                  )
                }}
              />
            )}
          </div>
        </main>
      ) : isLandscape ? (
        <TeleprompterLandscapeMarquee
          blocks={landscapeBlocks}
          showChords={showChords}
          showGrades={showGrades}
          fonteLetra={fonteLetraLandscape}
          lineHeightRatio={lineHeightRatio}
          tomGraus={tomGraus}
          onViewportWidth={(w) => {
            landscapeViewportRef.current = w
            setLandscapeViewportW((prev) => (Math.abs(prev - w) < 1 ? prev : w))
          }}
          onTrackRef={(node) => {
            landscapeTrackRef.current = node
            if (node) applyLandscapeTransform(scrollAccumRef.current)
          }}
          onClick={handleContentClick}
        />
      ) : (
      <main
        ref={contentRef}
        onClick={handleContentClick}
        onTouchStart={handlePortraitTouchStart}
        onTouchMove={handlePortraitTouchMove}
        onScroll={handlePortraitScroll}
        className="h-[100vh] touch-pan-y overflow-y-auto overflow-x-hidden px-4 pt-[5.5rem] sm:px-6 sm:pt-20"
        style={{
          paddingBottom: TELEPROMPTER_BARRA_INFERIOR_ALTURA + 16,
          scrollBehavior: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div
          ref={portraitScrollInnerRef}
          className={`mx-auto max-w-7xl ${layout.sectionGap} ${
            modoEvento ? 'pb-[18svh]' : layout.contentPadY
          }`}
        >
          {modoEvento && (
            <div
              aria-hidden
              className="shrink-0"
              style={{ height: TELEPROMPTER_EVENTO_SPACER_HEIGHT }}
            />
          )}

          {secoes.map((sec, index) => {
            const sk = sectionKeyFor(sec, index)
            return (
              <section
                key={sec.id || index}
                ref={(node) => {
                  sectionRefs.current[index] = node
                }}
                className="scroll-mt-24"
              >
                <div className="mb-4 flex items-center gap-3 sm:mb-6">
                  <span className="h-2 w-2 rounded-full bg-[var(--crash-cifra)]" />
                  <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--crash-cifra)]">
                    {sec.nome}
                  </h2>
                </div>
                <BlocoSecao
                  linhas={linhasPorSecao[index]}
                  tomOriginal={tomGraus}
                  mostrarAcordes={showChords}
                  mostrarGrau={showGrades}
                  fonteLetra={fonteLetra}
                  sectionKey={sk}
                  lineGapClassName={layout.lineGap}
                  onLineRef={registerLineRef}
                  lineHeightRatio={lineHeightRatio}
                  corLetra="#FFFFFF"
                />
              </section>
            )
          })}
          {secoes.length === 0 && (
            <p className="text-center text-xl text-[var(--crash-texto-sec)]">
              Esta música ainda não tem seções.
            </p>
          )}
        </div>
      </main>
      )}

      {modoEvento && !paused && !isFixo && (
        <div className="pointer-events-none fixed left-4 top-28 z-20 hidden items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-[var(--crash-cifra)] sm:flex">
          <span
            ref={metronomeDotRef}
            className="h-2 w-2 rounded-full bg-[var(--crash-cifra)] transition-opacity opacity-30"
          />
          {secondsPerLine.toFixed(1)}s/linha · {bpm} BPM
        </div>
      )}

      <MiniPlayerYoutube
        videoId={youtubeVideoId}
        teleprompterPaused={paused}
        syncVideo={youtubeSync}
        enabled={Boolean(youtubeVideoId) && youtubeEnabled}
        minimized={youtubeMinimized}
        position={youtubePos}
        onToggleMinimized={(v) => {
          setYoutubeMinimized(v)
          saveYoutubeMinimized(v)
        }}
        onPositionChange={handleYoutubePosition}
      />

      {playlistId && proximaMusicaCulto && (
        <div
          className="fixed z-[54] px-4"
          style={{
            bottom: isMobile
              ? TELEPROMPTER_MEDLEY_BOTTOM_MOBILE
              : TELEPROMPTER_MEDLEY_BOTTOM_DESKTOP,
            left: 0,
            right: isMobile
              ? TELEPROMPTER_MEDLEY_RESERVE_RIGHT_MOBILE
              : TELEPROMPTER_MEDLEY_RESERVE_RIGHT_DESKTOP,
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              irParaProximaMusicaCulto()
            }}
            className="w-full truncate rounded-lg border border-[var(--crash-cifra)]/80 bg-black/85 px-3 py-1.5 text-xs font-semibold text-[var(--crash-cifra)] shadow-md backdrop-blur transition hover:border-[var(--crash-cifra)] hover:bg-[var(--crash-cifra)]/10 hover:text-white"
          >
            {proximaMusicaCulto.isMedley ? '🔗 Medley' : 'Próx. música'} →{' '}
            {proximaMusicaCulto.titulo}
          </button>
        </div>
      )}

      <BarraInferiorTeleprompter
        pausado={paused}
        bpm={bpm}
        bpmModoIcon={isLandscape ? '↔' : isFixo ? '▣' : '↕'}
        modoEvento={modoEvento}
        fontLabel={fontLabel}
        footerClassName={isLandscape ? '!z-[60]' : ''}
        showSectionNav={orientacaoAlternavel()}
        onPrev={irParaSecaoAnterior}
        onReset={reiniciar}
        onTogglePause={togglePause}
        onNext={irParaProximaSecao}
        onBpmDown={(e) => handleBpmClick(-1, e)}
        onBpmUp={(e) => handleBpmClick(1, e)}
        onFontDown={() => changeFont(-1)}
        onFontUp={() => changeFont(1)}
      />

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setAnotacaoPainelOpen(true)
        }}
        className={`fixed z-[55] flex h-10 w-10 items-center justify-center rounded-full border text-lg shadow-lg backdrop-blur-sm transition ${
          temAnotacao
            ? 'border-white/15 bg-black/70 hover:border-[var(--crash-cifra)]/70 hover:bg-black/85'
            : 'border-white/10 bg-black/50 opacity-70 hover:opacity-90'
        }`}
        style={{
          bottom: isMobile ? TELEPROMPTER_ANOTACAO_BOTTOM_MOBILE : TELEPROMPTER_ANOTACAO_BOTTOM,
          right: TELEPROMPTER_ANOTACAO_RIGHT,
        }}
        aria-label="Ver anotações da música"
        title={temAnotacao ? 'Anotações' : 'Sem anotações nesta música'}
      >
        📝
      </button>

      <AnotacaoPainelLeitura
        open={anotacaoPainelOpen}
        conteudoEvento={anotacaoEventoTexto}
        conteudoPasta={anotacaoPastaTexto}
        onClose={() => setAnotacaoPainelOpen(false)}
      />

      <PainelConfigTeleprompter
        open={panelOpen}
        modoEvento={modoEvento}
        orientacaoLabel={layout.label}
        orientacaoDescricao={layout.descricao}
        orientacaoIcon={layout.icon}
        mostrarGraus={showGrades}
        mostrarAcordes={showChords}
        simplificar={simplificar}
        mostrarVersiculos={showVerses}
        mostrarMetronomo={showMetronome}
        temTimbre={Boolean(timbreAtual)}
        fontLabel={fontLabel}
        bpm={bpm}
        tomOriginal={musica.tom_original}
        offsetSessao={offsetSessao}
        onOffsetSessaoChange={setOffsetSessao}
        tomDestino={tomDestinoSessao}
        onTomDestinoChange={setTomDestinoSessao}
        onClose={() => setPanelOpen(false)}
        onToggleModo={toggleModoEvento}
        onToggleOrientacao={toggleOrientacao}
        showOrientacaoToggle={orientacaoAlternavel()}
        onToggleGraus={toggleGrades}
        onToggleAcordes={toggleChords}
        onToggleSimplificar={() => setSimplificar((v) => !v)}
        onToggleVersiculos={toggleVerses}
        onToggleMetronomo={toggleMetronome}
        miniPlayerYoutube={youtubeEnabled}
        sincronizarVideo={youtubeSync}
        temYoutube={Boolean(youtubeVideoId)}
        onToggleMiniPlayer={toggleYoutubeEnabled}
        onToggleSincronizarVideo={toggleYoutubeSync}
        onShowTimbre={() => {
          setTimbreOpen(true)
          setPanelOpen(false)
        }}
        onFontDown={() => changeFont(-1)}
        onFontUp={() => changeFont(1)}
        onBpmDown={(e) => handleBpmClick(-1, e)}
        onBpmUp={(e) => handleBpmClick(1, e)}
      />

      <TimbreCard
        timbre={timbreOpen ? timbreAtual : null}
        nivelTeclado={settings?.nivel_teclado || 'basico'}
        onClose={() => setTimbreOpen(false)}
      />

      <SalvarBpmPessoalModal
        open={salvarBpmModalOpen}
        bpm={bpmParaSalvarModal ?? bpm}
        onSalvar={confirmarSalvarBpmPessoal}
        onAgoraNao={descartarBpmPessoalESair}
      />

      <RodapePalavra
        versiculo={versiculoAtual}
        visivel={rodapeAtivo}
        layout={isLandscape ? 'landscape' : 'portrait'}
        onDismiss={() => setVersiculoRodapeVisivel(false)}
      />
    </div>
  )
}
