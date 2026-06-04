import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BlocoSecao } from '../components/cifra/LinhaCifra'
import { AnotacaoModal } from '../components/musicas/AnotacaoModal'
import { CifraSecaoCarousel } from '../components/musicas/CifraSecaoCarousel'
import { TonSelector } from '../components/cifra/TonSelector'
import { PlanoGate } from '../components/assinatura/PlanoGate'
import { GuiaTimbre } from '../components/timbre/GuiaTimbre'
import { PageNav } from '../components/layout/PageNav'
import { btnPrimaryClassName, btnSecondaryClassName } from '../components/ui/inputClasses'
import { musicaBreadcrumbItems } from '../lib/pageNavItems'
import { useUserSettings } from '../hooks/useUserSettings'
import { gerarGuiaTimbreLocal } from '../lib/timbreLocal'
import { tomParaGrausMusica, transposeLinhas } from '../lib/transpose'
import {
  aplicarTom,
  fetchAnotacaoMusica,
  fetchMusicaCompleta,
  salvarAnotacaoMusica,
} from '../services/musicas'
import { fetchTimbreByMusica, upsertTimbreMusica } from '../services/timbres'

const TABS = [
  { id: 'cifra', label: '🎵 Cifra' },
  { id: 'graus', label: 'i Graus' },
  { id: 'timbre', label: '🎛️ Timbre' },
]

// TODO: Reativar aba Timbres quando lançar Plano Equipe
const TABS_VISIVEIS = TABS.filter((t) => t.id !== 'timbre')

export function Musica() {
  const { id } = useParams()
  const { settings } = useUserSettings()
  const [musica, setMusica] = useState(null)
  const [tab, setTab] = useState('cifra')
  const [secaoAtiva, setSecaoAtiva] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tonOpen, setTonOpen] = useState(false)
  const [timbreRecord, setTimbreRecord] = useState(null)
  const [generatingTimbre, setGeneratingTimbre] = useState(false)
  const [anotacao, setAnotacao] = useState(null)
  const [anotacaoOpen, setAnotacaoOpen] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetchMusicaCompleta(id)
      .then(setMusica)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    fetchTimbreByMusica(id)
      .then(setTimbreRecord)
      .catch(() => setTimbreRecord(null))
  }, [id])

  useEffect(() => {
    fetchAnotacaoMusica(id).then(setAnotacao).catch(() => setAnotacao(null))
  }, [id])

  useEffect(() => {
    if (!musica) return
    const tituloPagina = musica.artista
      ? `${musica.titulo} — ${musica.artista}`
      : musica.titulo
    document.title = `${tituloPagina} · CRASH Cifras`
    return () => {
      document.title = 'CRASH Cifras'
    }
  }, [musica])

  useEffect(() => {
    setSecaoAtiva(0)
  }, [id, musica?.secoes?.length])

  const mostrarAcordes = tab === 'cifra' || tab === 'graus'
  const mostrarGrau = tab === 'graus'
  const offset = musica?.semitone_offset ?? 0
  const tomGraus = tomParaGrausMusica(musica, offset)
  const secoes = musica?.secoes ?? []

  async function handleTomSelect(novoTom) {
    setTonOpen(false)
    try {
      await aplicarTom(id, musica.ministro_id, novoTom)
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleGenerateTimbre() {
    setGeneratingTimbre(true)
    try {
      const guia = gerarGuiaTimbreLocal(musica)
      const record = await upsertTimbreMusica({ musicaId: id, guia })
      setTimbreRecord(record)
    } catch (err) {
      alert(err.message)
    } finally {
      setGeneratingTimbre(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--crash-texto-sec)]">Carregando…</p>
  }

  if (error || !musica) {
    return (
      <section className="text-center">
        <p className="text-red-400">{error || 'Música não encontrada'}</p>
        <Link to="/" className="mt-4 inline-block text-[var(--crash-cifra)]">
          Voltar
        </Link>
      </section>
    )
  }

  const voltarPara = musica.ministro_id
    ? `/ministro/${musica.ministro_id}`
    : '/'

  return (
    <section className="space-y-4">
      <PageNav
        breadcrumbItems={musicaBreadcrumbItems(musica)}
        backTo={voltarPara}
      />

      <header className="space-y-1 border-b border-[var(--crash-borda)] pb-4">
        <h1 className="text-xl font-bold leading-tight text-white sm:text-2xl">
          {musica.titulo}
          {musica.artista && (
            <span className="font-normal text-[var(--crash-texto-sec)]">
              {' '}
              · {musica.artista}
            </span>
          )}
        </h1>
        <p className="text-xs text-[var(--crash-cifra)]">
          Tom: {musica.tom_exibido || '—'}
          {musica.tom_original &&
            musica.tom_exibido !== musica.tom_original &&
            ` (original ${musica.tom_original})`}
          {musica.bpm && ` · ${musica.bpm} BPM`}
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Link
          to={`/teleprompter/musica/${id}`}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500"
        >
          ▶ Modo Evento
        </Link>
        <button
          type="button"
          onClick={() => setAnotacaoOpen(true)}
          className={btnSecondaryClassName}
        >
          📝 Anotações
        </button>
        <button type="button" onClick={() => setTonOpen(true)} className={btnSecondaryClassName}>
          Transpor
        </button>
        <Link to={`/musica/${id}/editar`} className={btnPrimaryClassName}>
          Editar
        </Link>
      </div>

      <nav
        className="flex gap-1 border-b border-[var(--crash-borda)]"
        aria-label="Visualização da música"
      >
        {TABS_VISIVEIS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
            className={`px-3 py-2 text-sm font-medium transition ${
              tab === t.id
                ? 'border-b-2 border-[var(--crash-cifra)] text-[var(--crash-cifra)]'
                : 'text-[var(--crash-texto-sec)] hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'timbre' && (
        <PlanoGate minimo="equipe">
          <GuiaTimbre
            musica={musica}
            guia={timbreRecord?.guia}
            nivelTeclado={settings?.nivel_teclado || 'basico'}
            loading={generatingTimbre}
            onGenerate={handleGenerateTimbre}
          />
        </PlanoGate>
      )}

      {(tab === 'cifra' || tab === 'graus') && (
        <div className="space-y-3">
          {secoes.length > 1 && (
            <nav
              className="-mx-1 flex gap-1 overflow-x-auto pb-1"
              aria-label="Seções da cifra"
            >
              {secoes.map((sec, i) => (
                <button
                  key={sec.id || i}
                  type="button"
                  onClick={() => setSecaoAtiva(i)}
                  aria-current={secaoAtiva === i ? 'true' : undefined}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                    secaoAtiva === i
                      ? 'bg-[var(--crash-cifra)] text-black'
                      : 'bg-[var(--crash-borda)]/40 text-[var(--crash-texto-sec)] hover:text-white'
                  }`}
                >
                  {sec.nome}
                </button>
              ))}
            </nav>
          )}

          <div className="overflow-hidden rounded-xl border border-[var(--crash-borda)] bg-black px-3 py-3 sm:px-4">
            {secoes.length === 0 ? (
              <p className="text-sm text-[var(--crash-texto-sec)]">
                Nenhuma seção.{' '}
                <Link to={`/musica/${id}/editar`} className="text-[var(--crash-cifra)]">
                  Adicionar cifra
                </Link>
              </p>
            ) : (
              <CifraSecaoCarousel
                secoes={secoes}
                activeIndex={secaoAtiva}
                onActiveIndexChange={setSecaoAtiva}
                renderSlide={(sec) => (
                  <div>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--crash-cifra)]">
                      {sec.nome}
                    </h2>
                    <BlocoSecao
                      linhas={transposeLinhas(sec.linhas, offset)}
                      tomOriginal={tomGraus}
                      mostrarAcordes={mostrarAcordes}
                      mostrarGrau={mostrarGrau}
                      visualizacao
                      sectionKey={sec.id || sec.slug}
                    />
                  </div>
                )}
              />
            )}
          </div>
        </div>
      )}

      {tonOpen && (
        <TonSelector
          tomAtual={musica.tom_exibido}
          onSelect={handleTomSelect}
          onClose={() => setTonOpen(false)}
        />
      )}

      <AnotacaoModal
        open={anotacaoOpen}
        initialValue={anotacao?.conteudo}
        onClose={() => setAnotacaoOpen(false)}
        onSave={async (conteudo) => {
          const saved = await salvarAnotacaoMusica(id, conteudo)
          setAnotacao(saved)
        }}
      />
    </section>
  )
}
