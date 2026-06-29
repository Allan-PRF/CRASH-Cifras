import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EMPTY_LINHAS, normalizeChordLine } from '@crash-cifras/shared/chord-schema'
import { PageBackButton } from '../components/layout/PageBackButton'
import { PageBreadcrumb } from '../components/layout/PageBreadcrumb'
import { CifraEditorFolhaMaquete } from '../components/musicas/CifraEditorFolhaMaquete'
import {
  btnPrimaryClassName,
  btnSecondaryClassName,
  inputClassName,
} from '../components/ui/inputClasses'
import {
  prepararVersiculoPrefsParaSalvar,
  quantidadeFromMomentosAtivos,
} from '@crash-cifras/shared/versiculos-config'
import { musicaBreadcrumbItems } from '../lib/pageNavItems'
import { fetchUserSettings } from '../services/settings'
import {
  VersiculoMusicaPrefsEditor,
  versiculoPrefsFromMusica,
} from '../components/versiculos/VersiculoMusicaPrefsEditor'
import {
  deleteSecao,
  fetchMusicaCompleta,
  updateMusica,
  upsertSecao,
} from '../services/musicas'
import { enviarFeedbackAcervo } from '../services/acervo'
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

function cloneEditorSnapshot(secoes, intro) {
  return {
    secoes: structuredClone(secoes),
    intro: structuredClone(intro),
  }
}

export function MusicaEditar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [meta, setMeta] = useState(null)
  const [intro, setIntro] = useState({ mao_esquerda: '', mao_direita: '' })
  const [versiculoPrefs, setVersiculoPrefs] = useState(() => versiculoPrefsFromMusica(null))
  const [versaoPadraoUsuario, setVersaoPadraoUsuario] = useState('NVI')
  const [secoes, setSecoes] = useState([])
  const [introSecaoIds, setIntroSecaoIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [offsetVisual, setOffsetVisual] = useState(0)
  const [undoStack, setUndoStack] = useState([])
  const introRef = useRef(intro)
  const secoesRef = useRef(secoes)
  const undoStackRef = useRef(undoStack)
  introRef.current = intro
  secoesRef.current = secoes
  undoStackRef.current = undoStack

  const pushUndoSnapshot = useCallback((snapshot) => {
    setUndoStack((prev) => [...prev.slice(-(UNDO_STACK_LIMIT - 1)), snapshot])
  }, [])

  const setSecoesWithHistory = useCallback(
    (updater) => {
      const prev = secoesRef.current
      pushUndoSnapshot(cloneEditorSnapshot(prev, introRef.current))
      const next = typeof updater === 'function' ? updater(prev) : updater
      setSecoes(next)
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
  }, [])

  const canUndo = undoStack.length > 0

  const load = useCallback(() => {
    setLoading(true)
    fetchMusicaCompleta(id)
      .then((data) => {
        setMeta(data)
        setIntro(data.intro || { mao_esquerda: '', mao_direita: '' })
        setVersiculoPrefs(versiculoPrefsFromMusica(data.versiculo_prefs))
        const todas = data.secoes || []
        setIntroSecaoIds(
          todas.filter(isSecaoIntroDuplicada).map((s) => s.id).filter(Boolean),
        )
        setSecoes(secoesParaEditor(todas))
        setUndoStack([])
        setOffsetVisual(0)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

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
    function onKeyDown(e) {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || e.shiftKey) return
      if (!undoStackRef.current.length) return
      e.preventDefault()
      handleUndo()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [handleUndo])

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

  async function handleSave() {
    if (!meta) return
    setSaving(true)
    setError('')
    try {
      const bpm =
        meta.bpm != null && Number(meta.bpm) >= 1 ? Math.floor(Number(meta.bpm)) : null

      const introToSave = normalizarIntroParaCopia(intro)

      const prefsSalvas = prepararVersiculoPrefsParaSalvar(versiculoPrefs)
      if (
        versiculoPrefs.modo === 'manual' &&
        quantidadeFromMomentosAtivos(versiculoPrefs.momentos_ativos) > 0 &&
        !prefsSalvas
      ) {
        setError('Modo manual: preencha referência e texto do versículo.')
        setSaving(false)
        return
      }
      await updateMusica(id, {
        titulo: meta.titulo,
        artista: meta.artista,
        tomOriginal: meta.tom_original,
        bpm,
        intro: introToSave,
        versiculoPrefs: prefsSalvas,
        ...(meta.import_status === 'pending' && musicasTemSecaoPreenchida(secoes)
          ? { importStatus: 'ready' }
          : {}),
      })
      console.log('[versiculos] prefs salvas em musicas.versiculo_prefs:', prefsSalvas)
      for (const secId of introSecaoIds) {
        await deleteSecao(secId)
      }
      for (let i = 0; i < secoes.length; i++) {
        const sec = { ...secoes[i], ordem_original: i }
        await upsertSecao(id, sec)
      }

      if (meta.acervo_versao_id) {
        try {
          await enviarFeedbackAcervo({
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
        } catch (feedbackErr) {
          console.warn('[acervo] feedback não enviado:', feedbackErr.message)
        }
      }

      setUndoStack([])
      navigate(`/musica/${id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
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
      <div className="space-y-3">
        <PageBreadcrumb
          items={musicaBreadcrumbItems(meta, { suffix: 'Editar' })}
          className="text-sm [&_a]:text-white/90 [&_a:hover]:text-[var(--crash-cifra)] [&>span:last-child]:font-medium [&>span:last-child]:text-[var(--crash-cifra)]"
        />
        <PageBackButton
          to={`/musica/${id}`}
          className="border-[var(--crash-cifra)]/40 text-white hover:border-[var(--crash-cifra)] hover:text-[var(--crash-cifra)]"
        />
      </div>

      {meta.import_status === 'pending' && (
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

      <input
        type="text"
        value={meta.titulo}
        onChange={(e) => setMeta({ ...meta, titulo: e.target.value })}
        aria-label="Título da música"
        placeholder="Título da música"
        className={`${inputClassName} py-2 text-base font-semibold leading-snug placeholder:text-[var(--crash-texto-sec)]`}
      />

      <div
        className="sticky top-2 z-10 flex flex-wrap items-center justify-end gap-2 rounded-lg border border-[var(--crash-borda)]/80 bg-[var(--crash-fundo-card)]/95 px-3 py-2 backdrop-blur-sm"
        role="toolbar"
        aria-label="Ações da edição"
      >
        <button
          type="button"
          onClick={handleUndo}
          disabled={!canUndo}
          className={btnSecondaryClassName}
          aria-keyshortcuts="Control+Z Meta+Z"
          title={canUndo ? 'Desfazer última alteração (Ctrl+Z)' : 'Nada para desfazer'}
        >
          Desfazer{canUndo ? ` (${undoStack.length})` : ''}
        </button>
        <button type="button" onClick={addSecao} className={btnSecondaryClassName}>
          + Seção
        </button>
      </div>

      <CifraEditorFolhaMaquete
        intro={intro}
        secoes={secoes}
        tomOriginal={meta.tom_original}
        offsetVisual={offsetVisual}
        onOffsetVisualChange={setOffsetVisual}
        onSecaoLinhasChange={(index, linhas) => {
          setSecoesWithHistory((prev) => {
            const next = [...prev]
            next[index] = { ...next[index], linhas }
            return next
          })
        }}
      />

      <VersiculoMusicaPrefsEditor
        prefs={versiculoPrefs}
        onChange={setVersiculoPrefs}
        versaoPadraoUsuario={versaoPadraoUsuario}
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className={`w-full ${btnPrimaryClassName}`}
      >
        {saving ? 'Salvando…' : 'Salvar e visualizar'}
      </button>
    </section>
  )
}
