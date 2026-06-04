import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EMPTY_LINHAS, normalizeChordLine } from '@crash-cifras/shared/chord-schema'
import { TranspositorTomDropdown } from '../components/cifra/TranspositorTomDropdown'
import { PageNav } from '../components/layout/PageNav'
import { IntroducaoEditor } from '../components/musicas/IntroducaoEditor'
import { SecaoEditor } from '../components/musicas/SecaoEditor'
import { FormField } from '../components/ui/FormField'
import {
  btnPrimaryClassName,
  btnSecondaryClassName,
  inputOrangeClassName,
} from '../components/ui/inputClasses'
import { semitonesBetween, transposeLinhas } from '../lib/transpose'
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

function secaoTemAcordes(linhas) {
  if (!linhas?.lines?.length) return false
  return linhas.lines.some((line) => {
    const n = normalizeChordLine(line)
    return n.chords.length > 0 || Boolean(n.chordLine.trim())
  })
}

function musicasTemAcordes(secoes) {
  return secoes.some((sec) => secaoTemAcordes(sec.linhas))
}

/** Seção CC "Intro" com cifra/letra — editada só via card Introdução (mãos). */
function isSecaoIntroDuplicada(sec) {
  return sec?.slug === 'intro'
}

function secoesParaEditor(secoes) {
  return (secoes || []).filter((sec) => !isSecaoIntroDuplicada(sec))
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

  function addSecao() {
    const n = secoes.length + 1
    setSecoes([
      ...secoes,
      {
        id: null,
        slug: 'verso',
        nome: `Verso ${n}`,
        ordem_original: secoes.length,
        linhas: EMPTY_LINHAS,
      },
    ])
  }

  async function handleSave() {
    if (!meta) return
    setSaving(true)
    setError('')
    try {
      const bpm =
        meta.bpm != null && Number(meta.bpm) >= 1 ? Math.floor(Number(meta.bpm)) : null

      const introToSave =
        (intro.mao_esquerda?.trim() || intro.mao_direita?.trim())
          ? { mao_esquerda: intro.mao_esquerda?.trim() || '', mao_direita: intro.mao_direita?.trim() || '' }
          : null

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
      })
      console.log('[versiculos] prefs salvas em musicas.versiculo_prefs:', prefsSalvas)
      for (const secId of introSecaoIds) {
        await deleteSecao(secId)
      }
      for (let i = 0; i < secoes.length; i++) {
        const sec = { ...secoes[i], ordem_original: i }
        await upsertSecao(id, sec)
      }
      navigate(`/musica/${id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveSecao(index) {
    const sec = secoes[index]
    if (sec.id) await deleteSecao(sec.id)
    setSecoes(secoes.filter((_, i) => i !== index))
  }

  function aplicarNovoTomOriginal(novoTom, { transporAcordes = false } = {}) {
    const anterior = meta.tom_original
    if (novoTom === anterior) return

    if (transporAcordes && anterior && novoTom) {
      const st = semitonesBetween(anterior, novoTom)
      if (st) {
        setSecoes(
          secoes.map((sec) => ({
            ...sec,
            linhas: transposeLinhas(sec.linhas, st),
          })),
        )
      }
    }

    setMeta({ ...meta, tom_original: novoTom || null })
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
    <section className="mx-auto max-w-3xl space-y-6">
      <PageNav
        breadcrumbItems={musicaBreadcrumbItems(meta, { suffix: 'Editar' })}
        backTo={`/musica/${id}`}
      />

      <header>
        <h1 className="text-2xl font-bold text-white">Editar cifra</h1>
      </header>

      <div className="grid gap-4 rounded-xl border-2 border-orange-500 p-4 sm:grid-cols-2">
        <FormField label="Título">
          <input
            type="text"
            value={meta.titulo}
            onChange={(e) => setMeta({ ...meta, titulo: e.target.value })}
            className={inputOrangeClassName}
          />
        </FormField>
        <FormField label="Artista">
          <input
            type="text"
            value={meta.artista || ''}
            onChange={(e) => setMeta({ ...meta, artista: e.target.value })}
            className={inputOrangeClassName}
          />
        </FormField>
        <FormField label="Tom original">
          <TranspositorTomDropdown
            tomAtual={meta.tom_original}
            perguntarTransporAcordes={musicasTemAcordes(secoes)}
            onApplyTom={aplicarNovoTomOriginal}
          />
        </FormField>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Seções</h2>
        <button type="button" onClick={addSecao} className={btnSecondaryClassName}>
          + Seção
        </button>
      </div>

      <div className="space-y-4">
        <IntroducaoEditor intro={intro} onChange={setIntro} />

        {secoes.map((sec, index) => (
          <SecaoEditor
            key={sec.id || `new-${index}`}
            secao={sec}
            onChange={(updated) => {
              const next = [...secoes]
              next[index] = updated
              setSecoes(next)
            }}
            onRemove={
              secoes.length > 1 ? () => handleRemoveSecao(index) : undefined
            }
          />
        ))}
      </div>

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
