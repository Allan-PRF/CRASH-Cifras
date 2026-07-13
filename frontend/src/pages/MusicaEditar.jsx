import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { EMPTY_LINHAS, normalizeChordLine } from '@crash-cifras/shared/chord-schema'
import { PageBackButton } from '../components/layout/PageBackButton'
import { PageBreadcrumb } from '../components/layout/PageBreadcrumb'
import { TomEdicaoUnificado } from '../components/cifra/TomEdicaoUnificado'
import { CifraEditorFolhaMaquete } from '../components/musicas/CifraEditorFolhaMaquete'
import { AnotacaoMusicaEditorBloco } from '../components/musicas/AnotacaoMusicaEditorBloco'
import { AcervoVitrineModal } from '../components/musicas/AcervoVitrineModal'
import { CompartilharAcervoCard } from '../components/musicas/CompartilharAcervoCard'
import { PropagarTomAcervoModal } from '../components/musicas/PropagarTomAcervoModal'
import { FonteTomJaCorrigidaModal } from '../components/musicas/FonteTomJaCorrigidaModal'
import { RascunhoEdicaoModal } from '../components/musicas/RascunhoEdicaoModal'
import { ReportTomErradoModal } from '../components/musicas/ReportTomErradoModal'
import { TomMotorConferenciaBanner } from '../components/musicas/TomMotorConferenciaBanner'
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal'
import { useAuth } from '../hooks/useAuth'
import {
  DRAFT_DEBOUNCE_MS,
  buildMusicaEditDraftPayload,
  clearMusicaEditDraft,
  getMusicaEditDraft,
  isDraftNewerThanSaved,
  setMusicaEditDraft,
} from '../lib/musicaEditDraft'
import {
  btnCifraConfirmClassName,
  btnCifraOutlineClassName,
  btnPrimaryClassName,
  inputOrangeClassName,
} from '../components/ui/inputClasses'
import {
  prepararVersiculoPrefsParaSalvar,
  quantidadeFromMomentosAtivos,
} from '@crash-cifras/shared/versiculos-config'
import {
  buildCifraEventoSnapshot,
  cifraEventoTemConteudo,
  secoesFromCifraEvento,
} from '@crash-cifras/shared/cifra-evento'
import { musicaBreadcrumbItems } from '../lib/pageNavItems'
import { semitonesBetween, transposeLinhas, transposeIntro } from '../lib/transpose'
import { fetchUserSettings } from '../services/settings'
import {
  VersiculoMusicaPrefsEditor,
  versiculoPrefsFromMusica,
} from '../components/versiculos/VersiculoMusicaPrefsEditor'
import {
  deleteSecao,
  fetchMusicaCompleta,
  markTomMotorConferido,
  resetOffsetTomPessoal,
  updateMusica,
  upsertSecao,
} from '../services/musicas'
import { corrigirTomVersaoMotor, enviarFeedbackAcervo, isFonteJaCorrigidaError, reportarTomErrado, restaurarCifraMotor } from '../services/acervo'
import { fetchPlaylistItem, updatePlaylistItem } from '../services/playlists'
import { normalizarIntroParaCopia } from '../lib/copiarMusicaHelpers'

function secaoTemConteudo(linhas) {
  if (!linhas?.lines?.length) return false
  return linhas.lines.some((line) => {
    const n = normalizeChordLine(line)
    const lyric = String(n.lyricLine ?? '').trim()
    const temCifra = n.chords.length > 0 || Boolean(n.chordLine.trim())
    return lyric.length > 0 || temCifra
  })
}

function musicasTemSecaoPreenchida(secoes) {
  return secoes.some((sec) => secaoTemConteudo(sec.linhas))
}

/** Seção CC "Intro" com cifra/letra — editada só via card Introdução (mãos). */
function isSecaoIntroDuplicada(sec) {
  return sec?.slug === 'intro'
}

function secoesParaEditor(secoes) {
  return (secoes || []).filter((sec) => !isSecaoIntroDuplicada(sec))
}

const UNDO_STACK_LIMIT = 40

function cloneEditorSnapshot(secoes, intro, tomOriginal) {
  return {
    secoes: structuredClone(secoes),
    intro: structuredClone(intro),
    tom_original: tomOriginal ?? null,
  }
}

export function MusicaEditar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const voltarPara =
    typeof location.state?.returnTo === 'string' ? location.state.returnTo : null
  const editEventoItemId =
    location.state?.editScope === 'evento' && location.state?.playlistItemId
      ? location.state.playlistItemId
      : null
  const editandoCifraEvento = Boolean(editEventoItemId)
  const [meta, setMeta] = useState(null)
  const [intro, setIntro] = useState({ mao_esquerda: '', mao_direita: '' })
  const [versiculoPrefs, setVersiculoPrefs] = useState(() => versiculoPrefsFromMusica(null))
  const [versaoPadraoUsuario, setVersaoPadraoUsuario] = useState('NVI')
  const [secoes, setSecoes] = useState([])
  const [introSecaoIds, setIntroSecaoIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sharingAcervo, setSharingAcervo] = useState(false)
  const [error, setError] = useState('')
  const [offsetVisual, setOffsetVisual] = useState(0)
  const [tomDestino, setTomDestino] = useState(null)
  const [undoStack, setUndoStack] = useState([])
  const [restaurarMotorOpen, setRestaurarMotorOpen] = useState(false)
  const [comunidadeOpen, setComunidadeOpen] = useState(false)
  const [restaurandoMotor, setRestaurandoMotor] = useState(false)
  const [toastMotor, setToastMotor] = useState('')
  const [confirmandoTomMotor, setConfirmandoTomMotor] = useState(false)
  const [propagarTomOpen, setPropagarTomOpen] = useState(false)
  const [fonteJaCorrigidaOpen, setFonteJaCorrigidaOpen] = useState(false)
  const [reportTomOpen, setReportTomOpen] = useState(false)
  const [tomReferenciaTrigger, setTomReferenciaTrigger] = useState(0)
  const [rascunhoModalOpen, setRascunhoModalOpen] = useState(false)
  const introEditorRef = useRef(null)
  const introRef = useRef(intro)
  const secoesRef = useRef(secoes)
  const undoStackRef = useRef(undoStack)
  const tomOriginalInicialRef = useRef(null)
  const metaRef = useRef(meta)
  const versiculoPrefsRef = useRef(versiculoPrefs)
  const offsetVisualRef = useRef(offsetVisual)
  const tomDestinoRef = useRef(tomDestino)
  const pendingDraftRef = useRef(null)
  const skipDraftSaveRef = useRef(true)

  useLayoutEffect(() => {
    introRef.current = intro
    secoesRef.current = secoes
    undoStackRef.current = undoStack
    metaRef.current = meta
    versiculoPrefsRef.current = versiculoPrefs
    offsetVisualRef.current = offsetVisual
    tomDestinoRef.current = tomDestino
  }, [
    intro,
    secoes,
    undoStack,
    meta,
    versiculoPrefs,
    offsetVisual,
    tomDestino,
  ])

  const pushUndoSnapshot = useCallback((snapshot) => {
    setUndoStack((prev) => [...prev.slice(-(UNDO_STACK_LIMIT - 1)), snapshot])
  }, [])

  const setSecoesWithHistory = useCallback(
    (updater) => {
      const prev = secoesRef.current
      pushUndoSnapshot(cloneEditorSnapshot(prev, introRef.current, metaRef.current?.tom_original))
      const next = typeof updater === 'function' ? updater(prev) : updater
      setSecoes(next)
    },
    [pushUndoSnapshot],
  )

  const setIntroWithHistory = useCallback(
    (nextIntro) => {
      pushUndoSnapshot(cloneEditorSnapshot(secoesRef.current, introRef.current, metaRef.current?.tom_original))
      setIntro(nextIntro)
    },
    [pushUndoSnapshot],
  )

  const handleUndo = useCallback(() => {
    const stack = undoStackRef.current
    if (!stack.length) return
    const snapshot = stack[stack.length - 1]
    setUndoStack(stack.slice(0, -1))
    setSecoes(structuredClone(snapshot.secoes))
    setIntro(structuredClone(snapshot.intro))
    setMeta((prev) => (prev ? { ...prev, tom_original: snapshot.tom_original } : prev))
    setTomDestino(null)
    setOffsetVisual(0)
  }, [])

  const canUndo = undoStack.length > 0

  const handleAplicarTom = useCallback(() => {
    const tomBase = metaRef.current?.tom_original
    if (!tomBase || !tomDestino || tomDestino === tomBase) return

    const st = semitonesBetween(tomBase, tomDestino)
    pushUndoSnapshot(
      cloneEditorSnapshot(secoesRef.current, introRef.current, metaRef.current?.tom_original),
    )
    setSecoes((prev) =>
      prev.map((sec) => ({
        ...sec,
        linhas: transposeLinhas(sec.linhas, st, { tonDestino: tomDestino }),
      })),
    )
    setIntro((prev) => transposeIntro(prev, st, { tonDestino: tomDestino }))
    setMeta((prev) => (prev ? { ...prev, tom_original: tomDestino } : prev))
    setTomDestino(null)
    setOffsetVisual(0)
  }, [tomDestino, pushUndoSnapshot])

  const load = useCallback(() => {
    setLoading(true)
    skipDraftSaveRef.current = true
    pendingDraftRef.current = null
    setRascunhoModalOpen(false)

    const itemPromise = editEventoItemId
      ? fetchPlaylistItem(editEventoItemId)
      : Promise.resolve(null)

    Promise.all([fetchMusicaCompleta(id), itemPromise])
      .then(async ([data, playlistItem]) => {
        setMeta(data)
        tomOriginalInicialRef.current = data.tom_original ?? null
        setVersiculoPrefs(versiculoPrefsFromMusica(data.versiculo_prefs))

        const usarCifraEvento =
          editandoCifraEvento && cifraEventoTemConteudo(playlistItem?.cifra_evento)

        if (usarCifraEvento) {
          const cifra = playlistItem.cifra_evento
          setIntro(cifra.intro || { mao_esquerda: '', mao_direita: '' })
          setIntroSecaoIds([])
          setSecoes(secoesParaEditor(secoesFromCifraEvento(cifra)))
        } else {
          setIntro(data.intro || { mao_esquerda: '', mao_direita: '' })
          const todas = data.secoes || []
          setIntroSecaoIds(
            todas.filter(isSecaoIntroDuplicada).map((s) => s.id).filter(Boolean),
          )
          setSecoes(secoesParaEditor(todas))
        }

        setUndoStack([])
        setOffsetVisual(0)
        setTomDestino(null)

        const userId = user?.id || data.user_id
        if (userId) {
          const draft = await getMusicaEditDraft(userId, id, editEventoItemId)
          if (isDraftNewerThanSaved(draft, data.updated_at)) {
            pendingDraftRef.current = draft
            setRascunhoModalOpen(true)
            return
          }
        }
        skipDraftSaveRef.current = false
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id, editEventoItemId, editandoCifraEvento, user?.id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    fetchUserSettings()
      .then((s) => {
        if (s?.versao_biblica) setVersaoPadraoUsuario(s.versao_biblica)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (loading || saving || rascunhoModalOpen || skipDraftSaveRef.current) return
    const userId = user?.id || meta?.user_id
    if (!userId || !id || !meta) return

    const timer = setTimeout(() => {
      if (skipDraftSaveRef.current || rascunhoModalOpen) return
      const introAtual = introEditorRef.current?.flush?.() ?? introRef.current
      const payload = buildMusicaEditDraftPayload({
        userId,
        musicaId: id,
        eventoItemId: editEventoItemId,
        meta: metaRef.current,
        intro: introAtual,
        secoes: secoesRef.current,
        versiculoPrefs: versiculoPrefsRef.current,
        offsetVisual: offsetVisualRef.current,
        tomDestino: tomDestinoRef.current,
        updatedAt: Date.now(),
      })
      void setMusicaEditDraft(payload)
    }, DRAFT_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [
    loading,
    saving,
    rascunhoModalOpen,
    user?.id,
    meta?.user_id,
    meta?.titulo,
    meta?.artista,
    meta?.tom_original,
    meta?.bpm,
    id,
    editEventoItemId,
    intro,
    secoes,
    versiculoPrefs,
    offsetVisual,
    tomDestino,
    meta,
  ])

  function aplicarRascunhoLocal(draft) {
    if (!draft) return
    skipDraftSaveRef.current = true
    setMeta((prev) =>
      prev
        ? {
            ...prev,
            titulo: draft.meta?.titulo ?? prev.titulo,
            artista: draft.meta?.artista ?? prev.artista,
            tom_original: draft.meta?.tom_original ?? prev.tom_original,
            bpm: draft.meta?.bpm ?? prev.bpm,
          }
        : prev,
    )
    setIntro(structuredClone(draft.intro || { mao_esquerda: '', mao_direita: '' }))
    setSecoes(structuredClone(draft.secoes || []))
    if (draft.versiculoPrefs != null) {
      setVersiculoPrefs(versiculoPrefsFromMusica(draft.versiculoPrefs))
    }
    setOffsetVisual(Number(draft.offsetVisual) || 0)
    setTomDestino(draft.tomDestino ?? null)
    setUndoStack([])
    queueMicrotask(() => {
      skipDraftSaveRef.current = false
    })
  }

  function handleContinuarRascunho() {
    const draft = pendingDraftRef.current
    pendingDraftRef.current = null
    setRascunhoModalOpen(false)
    aplicarRascunhoLocal(draft)
  }

  async function handleDescartarRascunho() {
    const userId = user?.id || meta?.user_id
    pendingDraftRef.current = null
    setRascunhoModalOpen(false)
    if (userId) {
      await clearMusicaEditDraft(userId, id, editEventoItemId)
    }
    skipDraftSaveRef.current = false
  }

  async function limparRascunhoAposSalvarOk() {
    const userId = user?.id || meta?.user_id
    if (!userId) return
    await clearMusicaEditDraft(userId, id, editEventoItemId)
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || e.shiftKey) return
      if (!undoStackRef.current.length) return
      e.preventDefault()
      handleUndo()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [handleUndo])

  const temLinhaAcervo = Boolean(meta?.acervo_versao_id || meta?.youtube_url?.trim())
  const versaoMotorLigada = meta?.acervo_versao?.origem === 'motor'
  const mostrarBannerConferenciaTom =
    !editandoCifraEvento &&
    versaoMotorLigada &&
    !meta?.tom_motor_conferido_em

  function aplicarResultadoAcervoNaEdicao(result) {
    const todas = result.secoes || []
    setIntroSecaoIds(
      todas.filter(isSecaoIntroDuplicada).map((s) => s.id).filter(Boolean),
    )
    setSecoes(secoesParaEditor(todas))
    setIntro(result.intro || { mao_esquerda: '', mao_direita: '' })
    setMeta((prev) => ({
      ...prev,
      tom_original: result.tom_original ?? prev.tom_original,
      bpm: result.bpm ?? prev.bpm,
      acervo_versao_id: result.acervo_versao_id ?? prev.acervo_versao_id,
      import_status: prev.import_status === 'pending' ? 'ready' : prev.import_status,
    }))
    setUndoStack([])
    setOffsetVisual(0)
  }

  useEffect(() => {
    if (!toastMotor) return
    const timer = setTimeout(() => setToastMotor(''), 4000)
    return () => clearTimeout(timer)
  }, [toastMotor])

  async function handleRestaurarMotor() {
    setRestaurandoMotor(true)
    setError('')
    try {
      const result = await restaurarCifraMotor(id)
      aplicarResultadoAcervoNaEdicao(result)
      setToastMotor('Cifra do motor restaurada. Suas edições foram descartadas.')
    } catch (err) {
      setError(err.message || 'Não foi possível restaurar a cifra do motor.')
      throw err
    } finally {
      setRestaurandoMotor(false)
    }
  }

  function addSecao() {
    setSecoesWithHistory((prev) => {
      const n = prev.length + 1
      return [
        ...prev,
        {
          id: null,
          slug: 'verso',
          nome: `Verso ${n}`,
          ordem_original: prev.length,
          linhas: EMPTY_LINHAS,
        },
      ]
    })
  }

  async function handleConfirmarTomMotor() {
    setConfirmandoTomMotor(true)
    setError('')
    try {
      const result = await markTomMotorConferido(id)
      setMeta((prev) =>
        prev ? { ...prev, tom_motor_conferido_em: result.tom_motor_conferido_em } : prev,
      )
    } catch (err) {
      setError(err.message || 'Não foi possível confirmar o tom.')
    } finally {
      setConfirmandoTomMotor(false)
    }
  }

  async function executarSalvamento({ propagarFonte = false } = {}) {
    if (!meta) return

    const introAtual = introEditorRef.current?.flush() ?? intro
    const introToSave = normalizarIntroParaCopia(introAtual)

    if (editandoCifraEvento && editEventoItemId) {
      await updatePlaylistItem(editEventoItemId, {
        cifra_evento: buildCifraEventoSnapshot({
          intro: introToSave || { mao_esquerda: '', mao_direita: '' },
          secoes,
        }),
      })
      await limparRascunhoAposSalvarOk()
      setUndoStack([])
      navigate(voltarPara ?? '/')
      return
    }

    const bpm =
      meta.bpm != null && Number(meta.bpm) >= 1 ? Math.floor(Number(meta.bpm)) : null

    const prefsSalvas = prepararVersiculoPrefsParaSalvar(versiculoPrefs)
    if (
      versiculoPrefs.modo === 'manual' &&
      quantidadeFromMomentosAtivos(versiculoPrefs.momentos_ativos) > 0 &&
      !prefsSalvas
    ) {
      throw new Error('Modo manual: preencha referência e texto do versículo.')
    }

    const tomOriginalAlterado =
      (meta.tom_original ?? null) !== (tomOriginalInicialRef.current ?? null)

    if (propagarFonte && meta.acervo_versao_id && meta.tom_original) {
      await corrigirTomVersaoMotor({
        acervoVersaoId: meta.acervo_versao_id,
        tomOriginal: meta.tom_original,
      })
    }

    const marcarConferidoMotor =
      tomOriginalAlterado && versaoMotorLigada && !meta.tom_motor_conferido_em
    const conferidoEm = marcarConferidoMotor ? new Date().toISOString() : undefined

    await updateMusica(id, {
      titulo: meta.titulo,
      artista: meta.artista,
      tomOriginal: meta.tom_original,
      bpm,
      intro: introToSave,
      versiculoPrefs: prefsSalvas,
      ...(conferidoEm ? { tomMotorConferidoEm: conferidoEm } : {}),
      ...(meta.import_status === 'pending' && musicasTemSecaoPreenchida(secoes)
        ? { importStatus: 'ready' }
        : {}),
    })

    if (conferidoEm) {
      setMeta((prev) =>
        prev ? { ...prev, tom_motor_conferido_em: conferidoEm } : prev,
      )
    }

    if (tomOriginalAlterado) {
      await resetOffsetTomPessoal(id, {
        ministroId: meta.ministro_id,
        tomOriginal: meta.tom_original,
      })
    }

    console.log('[versiculos] prefs salvas em musicas.versiculo_prefs:', prefsSalvas)
    for (const secId of introSecaoIds) {
      await deleteSecao(secId)
    }
    for (let i = 0; i < secoes.length; i++) {
      const sec = { ...secoes[i], ordem_original: i }
      await upsertSecao(id, sec)
    }

    await limparRascunhoAposSalvarOk()

    tomOriginalInicialRef.current = meta.tom_original ?? null
    setUndoStack([])
    navigate(`/teleprompter/musica/${id}`)
  }

  async function handleRestaurarVersaoMinistroEvento() {
    if (!editEventoItemId) return
    setSaving(true)
    setError('')
    try {
      await updatePlaylistItem(editEventoItemId, { cifra_evento: null })
      await load()
      setToastMotor('Versão da pasta do ministro restaurada neste evento.')
    } catch (err) {
      setError(err.message || 'Não foi possível restaurar a versão do ministro.')
    } finally {
      setSaving(false)
    }
  }

  async function handleCompartilharComunidade() {
    if (!meta?.acervo_versao_id || editandoCifraEvento) return
    setSharingAcervo(true)
    setError('')
    try {
      const bpm =
        meta.bpm != null && Number(meta.bpm) >= 1 ? Math.floor(Number(meta.bpm)) : null
      const result = await enviarFeedbackAcervo({
        acervoVersaoId: meta.acervo_versao_id,
        tomOriginal: meta.tom_original,
        bpm,
        secoes: secoes.map((sec, i) => ({
          slug: sec.slug,
          nome: sec.nome,
          ordem_original: i,
          linhas: sec.linhas,
        })),
      })
      const tipo = result?.result?.tipo
      if (tipo === 'aceitacao') {
        setToastMotor('Comunidade: cifra igual à origem (aceitação registrada).')
      } else if (tipo === 'convergencia') {
        setToastMotor('Comunidade: sua cifra convergiu com uma versão existente.')
      } else if (tipo === 'nova_correcao') {
        setToastMotor('Comunidade: versão de correção publicada.')
      } else {
        setToastMotor('Cifra compartilhada com a comunidade.')
      }
    } catch (err) {
      setError(err.message || 'Não foi possível compartilhar com a comunidade.')
    } finally {
      setSharingAcervo(false)
    }
  }

  async function handleSave() {
    if (!meta) return
    setSaving(true)
    setError('')
    let aguardandoModalPropagacao = false
    try {
      const tomOriginalAlterado =
        (meta.tom_original ?? null) !== (tomOriginalInicialRef.current ?? null)

      if (
        !editandoCifraEvento &&
        tomOriginalAlterado &&
        meta.acervo_versao_id &&
        versaoMotorLigada
      ) {
        setPropagarTomOpen(true)
        aguardandoModalPropagacao = true
        return
      }

      await executarSalvamento({ propagarFonte: false })
    } catch (err) {
      setError(err.message)
    } finally {
      if (!aguardandoModalPropagacao) {
        setSaving(false)
      }
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--crash-texto-sec)]">Carregando…</p>
  }

  if (error && !meta) {
    return (
      <p className="text-red-400">
        {error}
        <Link to="/" className="ml-2 text-[var(--crash-cifra)]">
          Voltar
        </Link>
      </p>
    )
  }

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <PageBreadcrumb
          items={musicaBreadcrumbItems(meta, { suffix: 'Editar' })}
          className="min-w-0 flex-1 text-sm [&_a]:text-white/90 [&_a:hover]:text-[var(--crash-cifra)] [&>span:last-child]:font-medium [&>span:last-child]:text-[var(--crash-cifra)]"
        />
        <PageBackButton
          to={voltarPara ?? (meta?.ministro_id ? `/ministro/${meta.ministro_id}` : '/')}
          variant="cifra"
          className="shrink-0 px-3 py-1.5 text-sm"
        />
      </div>

      {editandoCifraEvento && (
        <div
          className="flex gap-3 rounded-xl border border-[var(--crash-cifra)]/40 bg-[var(--crash-cifra)]/10 p-4"
          role="status"
        >
          <p className="text-sm leading-relaxed text-white">
            <strong className="text-[var(--crash-cifra)]">Edição só deste evento.</strong>{' '}
            A pasta do ministro não será alterada. Outros eventos continuam usando a cifra
            original do ministro.
          </p>
        </div>
      )}

      {meta.import_status === 'pending' && !editandoCifraEvento && (
        <div
          className="flex gap-3 rounded-xl border border-amber-600/35 bg-amber-950/25 p-4"
          role="status"
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-lg text-amber-300"
            aria-hidden
          >
            ℹ️
          </span>
          <p className="text-sm leading-relaxed text-amber-100/95">
            Esta música ainda não tem cifra cadastrada. Preencha as seções abaixo para usar
            no teleprompter.
          </p>
        </div>
      )}

      {toastMotor && (
        <div
          className="flex gap-3 rounded-xl border border-[var(--crash-cifra)]/40 bg-[var(--crash-cifra)]/10 px-4 py-3"
          role="status"
        >
          <p className="text-sm font-medium text-[var(--crash-cifra)]">{toastMotor}</p>
        </div>
      )}

      {mostrarBannerConferenciaTom && (
        <TomMotorConferenciaBanner
          tomDetectado={meta.tom_original}
          onConfirmarTom={handleConfirmarTomMotor}
          onCorrigirTom={() => setTomReferenciaTrigger((n) => n + 1)}
          confirmando={confirmandoTomMotor}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={meta.titulo}
          onChange={(e) => setMeta({ ...meta, titulo: e.target.value })}
          readOnly={editandoCifraEvento}
          aria-label="Título da música"
          placeholder="Título da música"
          className={`min-w-0 flex-1 ${inputOrangeClassName} py-2 text-base font-semibold leading-snug placeholder:text-[var(--crash-texto-sec)]${editandoCifraEvento ? ' cursor-default opacity-90' : ''}`}
        />
        {!editandoCifraEvento && (
          <TomEdicaoUnificado
            tomOriginal={meta.tom_original}
            offsetVisual={offsetVisual}
            onOffsetVisualChange={setOffsetVisual}
            tomDestino={tomDestino}
            onTomDestinoChange={setTomDestino}
            onAplicarTom={handleAplicarTom}
            onCorrigirReferencia={(tom) => {
              setMeta((prev) => ({ ...prev, tom_original: tom }))
              setOffsetVisual(0)
              setTomDestino(null)
            }}
            referenciaModeTrigger={tomReferenciaTrigger}
          />
        )}
      </div>

      <div
        className="sticky top-2 z-10 flex flex-nowrap items-center justify-end gap-1 overflow-x-auto rounded-xl border border-[var(--crash-cifra)]/40 bg-black/90 px-2 py-2 shadow-lg shadow-black/50 backdrop-blur-sm sm:gap-2 sm:px-3"
        role="toolbar"
        aria-label="Ações da edição"
      >
        <button
          type="button"
          onClick={handleUndo}
          disabled={!canUndo}
          className={`${btnCifraOutlineClassName} shrink-0 px-2 py-1.5 text-xs sm:px-4 sm:py-2.5 sm:text-sm`}
          aria-keyshortcuts="Control+Z Meta+Z"
          title={canUndo ? 'Desfazer última alteração (Ctrl+Z)' : 'Nada para desfazer'}
        >
          Desfazer{canUndo ? ` (${undoStack.length})` : ''}
        </button>
        <button
          type="button"
          onClick={() => setRestaurarMotorOpen(true)}
          disabled={!temLinhaAcervo || restaurandoMotor || editandoCifraEvento}
          className={`${btnCifraOutlineClassName} shrink-0 px-2 py-1.5 text-xs sm:px-4 sm:py-2.5 sm:text-sm`}
          title={
            temLinhaAcervo
              ? 'Trazer a cifra original do motor (descarta suas edições)'
              : 'Música sem vínculo com o acervo'
          }
        >
          {restaurandoMotor ? 'Restaurando…' : 'Cifra Motor'}
        </button>
        <button
          type="button"
          onClick={() => setComunidadeOpen(true)}
          disabled={!temLinhaAcervo || editandoCifraEvento}
          className={`${btnCifraOutlineClassName} shrink-0 px-2 py-1.5 text-xs sm:px-4 sm:py-2.5 sm:text-sm`}
          title={
            temLinhaAcervo
              ? 'Ver versões da comunidade e escolher qual usar'
              : 'Música sem vínculo com o acervo'
          }
        >
          Acervo Comunidade
        </button>
        {editandoCifraEvento && (
          <button
            type="button"
            onClick={handleRestaurarVersaoMinistroEvento}
            disabled={saving}
            className={btnCifraOutlineClassName}
          >
            Usar cifra do ministro
          </button>
        )}
      </div>

      <CifraEditorFolhaMaquete
        intro={intro}
        introEditorRef={introEditorRef}
        onIntroChange={setIntroWithHistory}
        secoes={secoes}
        tomOriginal={meta.tom_original}
        offsetVisual={offsetVisual}
        onOffsetVisualChange={setOffsetVisual}
        tomDestino={tomDestino}
        onTomDestinoChange={setTomDestino}
        onAddSecao={addSecao}
        onSecaoLinhasChange={(index, linhas) => {
          setSecoesWithHistory((prev) => {
            const next = [...prev]
            next[index] = { ...next[index], linhas }
            return next
          })
        }}
      />

      {!editandoCifraEvento && <AnotacaoMusicaEditorBloco musicaId={id} />}

      {!editandoCifraEvento && (
        <VersiculoMusicaPrefsEditor
          prefs={versiculoPrefs}
          onChange={setVersiculoPrefs}
          versaoPadraoUsuario={versaoPadraoUsuario}
        />
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className={`w-full ${btnPrimaryClassName}`}
      >
        {saving
          ? 'Salvando…'
          : editandoCifraEvento
            ? 'Salvar cifra deste evento'
            : 'Salvar minha cópia'}
      </button>

      {!editandoCifraEvento && meta?.acervo_versao_id && (
        <CompartilharAcervoCard
          sharing={sharingAcervo}
          disabled={saving}
          onCompartilhar={handleCompartilharComunidade}
        />
      )}

      <RascunhoEdicaoModal
        open={rascunhoModalOpen}
        onContinuar={handleContinuarRascunho}
        onDescartar={handleDescartarRascunho}
      />

      <ConfirmDeleteModal
        open={restaurarMotorOpen}
        title="Restaurar cifra do motor"
        message="Isso vai descartar suas edições e trazer a cifra original do motor. Continuar?"
        confirmLabel="Restaurar cifra do motor"
        confirmLoadingLabel="Restaurando…"
        confirmButtonClassName={btnCifraConfirmClassName}
        cancelLabel="Cancelar"
        onClose={() => setRestaurarMotorOpen(false)}
        onConfirm={handleRestaurarMotor}
      />

      <AcervoVitrineModal
        open={comunidadeOpen}
        musicaId={id}
        onClose={() => setComunidadeOpen(false)}
        onVersaoAplicada={(result) => {
          aplicarResultadoAcervoNaEdicao(result)
          setToastMotor('Versão aplicada.')
        }}
      />

      <PropagarTomAcervoModal
        open={propagarTomOpen}
        tomOriginal={meta.tom_original}
        onClose={() => {
          setPropagarTomOpen(false)
          setSaving(false)
        }}
        onPropagar={async () => {
          setSaving(true)
          try {
            await executarSalvamento({ propagarFonte: true })
            setPropagarTomOpen(false)
          } catch (err) {
            if (isFonteJaCorrigidaError(err)) {
              setPropagarTomOpen(false)
              setFonteJaCorrigidaOpen(true)
            } else {
              setError(err.message)
            }
          } finally {
            setSaving(false)
          }
        }}
        onManterCopia={async () => {
          setSaving(true)
          try {
            await executarSalvamento({ propagarFonte: false })
            setPropagarTomOpen(false)
          } catch (err) {
            setError(err.message)
          } finally {
            setSaving(false)
          }
        }}
      />

      <FonteTomJaCorrigidaModal
        open={fonteJaCorrigidaOpen}
        onClose={() => {
          setFonteJaCorrigidaOpen(false)
          setSaving(false)
        }}
        onReportar={() => {
          setFonteJaCorrigidaOpen(false)
          setReportTomOpen(true)
        }}
        onSalvarCopia={async () => {
          setSaving(true)
          try {
            await executarSalvamento({ propagarFonte: false })
            setFonteJaCorrigidaOpen(false)
          } catch (err) {
            setError(err.message)
          } finally {
            setSaving(false)
          }
        }}
      />

      <ReportTomErradoModal
        open={reportTomOpen}
        tomAtual={meta.acervo_versao?.tom_original ?? meta.tom_original}
        onClose={() => {
          setReportTomOpen(false)
          setSaving(false)
        }}
        onSubmit={async ({ tomSugerido, comentario }) => {
          await reportarTomErrado({
            acervoVersaoId: meta.acervo_versao_id,
            musicaId: id,
            tomSugerido,
            comentario,
          })
          setToastMotor('Reporte enviado. A equipe será notificada.')
          await executarSalvamento({ propagarFonte: false })
          setReportTomOpen(false)
        }}
      />
    </section>
  )
}
