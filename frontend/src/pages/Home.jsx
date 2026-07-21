import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ReferralModal } from '../components/referral/ReferralModal'
import { CompartilharMusicaPopover } from '../components/musicas/CompartilharMusicaPopover'
import { ExplorarAcervoModal } from '../components/musicas/ExplorarAcervoModal'
import { NovidadeBanner } from '../components/novidades/NovidadeBanner'
import { MinistroFormModal } from '../components/ministros/MinistroFormModal'
import { MinistroTable } from '../components/ministros/MinistroTable'
import { MinistrosArquivadosPanel } from '../components/ministros/MinistrosArquivadosPanel'
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal'
import { InfoTooltip } from '../components/ui/InfoTooltip'
import { btnPrimaryClassName, btnSecondaryClassName } from '../components/ui/inputClasses'
import { FUNCIONALIDADE_TOOLTIPS } from '../lib/funcionalidadeTooltips'
import { useAuth } from '../hooks/useAuth'
import { useMinistros } from '../hooks/useMinistros'
import { useUserSettings } from '../hooks/useUserSettings'
import { assinaturaAtiva, diasRestantesTrial, trialAtivo } from '../lib/planos'
import {
  arquivarMinistro,
  createMinistro,
  fetchMinistrosArquivados,
  restaurarMinistro,
  updateMinistro,
} from '../services/ministros'
import { searchMusicas } from '../services/musicas'

export function Home() {
  const { user } = useAuth()
  const { settings } = useUserSettings()
  const { ministros, loading, error, reload } = useMinistros({ enabled: !!user })
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [musicas, setMusicas] = useState([])
  const [searchingSongs, setSearchingSongs] = useState(false)
  const [referralOpen, setReferralOpen] = useState(false)
  const [copiarMusica, setCopiarMusica] = useState(null)
  const [ministrosArquivados, setMinistrosArquivados] = useState([])
  const [loadingArquivados, setLoadingArquivados] = useState(false)
  const [showArquivados, setShowArquivados] = useState(false)
  const [confirmArquivar, setConfirmArquivar] = useState(null)
  const [restaurandoId, setRestaurandoId] = useState(null)
  const [explorarAcervoOpen, setExplorarAcervoOpen] = useState(false)

  const loadArquivados = useCallback(async () => {
    setLoadingArquivados(true)
    try {
      const data = await fetchMinistrosArquivados()
      setMinistrosArquivados(data)
    } catch {
      setMinistrosArquivados([])
    } finally {
      setLoadingArquivados(false)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setMinistrosArquivados([])
      return
    }
    loadArquivados()
  }, [user, loadArquivados])

  const emTrial = trialAtivo(settings)
  const diasTrial = diasRestantesTrial(settings)
  const planoAssinatura = settings?.plano || 'gratuito'
  const assinaturaAtivaAgora = assinaturaAtiva(settings)

  const modoSoloBadge = (() => {
    if (emTrial) return `Trial · ${diasTrial}d restantes`
    if (assinaturaAtivaAgora) {
      if (planoAssinatura === 'solo') return 'Plano Solo'
      if (planoAssinatura === 'equipe') return 'Plano Equipe'
      return `Plano ${planoAssinatura}`
    }
    return 'Plano gratuito'
  })()

  useEffect(() => {
    if (!user || search.trim().length < 2) {
      setMusicas([])
      return
    }

    let cancelled = false
    setSearchingSongs(true)
    searchMusicas(search)
      .then((data) => {
        if (!cancelled) setMusicas(data)
      })
      .catch(() => {
        if (!cancelled) setMusicas([])
      })
      .finally(() => {
        if (!cancelled) setSearchingSongs(false)
      })

    return () => { cancelled = true }
  }, [search, user])

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(ministro) {
    setEditing(ministro)
    setModalOpen(true)
  }

  async function handleSave(payload) {
    if (editing) {
      await updateMinistro(editing.id, payload)
    } else {
      await createMinistro(payload)
    }
    await reload()
  }

  async function handleArquivarConfirm() {
    if (!confirmArquivar) return
    await arquivarMinistro(confirmArquivar.id)
    await Promise.all([reload(), loadArquivados()])
  }

  async function handleRestaurar(ministro) {
    setRestaurandoId(ministro.id)
    try {
      await restaurarMinistro(ministro.id)
      await Promise.all([reload(), loadArquivados()])
    } finally {
      setRestaurandoId(null)
    }
  }

  return (
    <section className="space-y-6 sm:space-y-8">
      <header>
        <h1 className="text-[1.75rem] font-bold leading-tight text-white sm:text-3xl">
          CRASH <span className="text-[#F97316]">Cifras</span>
        </h1>
        <p className="mt-1.5 text-base text-[var(--crash-texto-sec)] sm:text-sm">
          Plataforma de cifras e eventos para músicos
        </p>
      </header>

      {!user && (
        <Link
          to="/login"
          className="block rounded-xl border border-[var(--crash-cifra)]/40 bg-[var(--crash-cifra)]/5 p-4 text-center text-base text-white sm:text-sm"
        >
          Entrar para cadastrar ministros e músicas
        </Link>
      )}

      {user && (
        <>
          <NovidadeBanner />

          <button
            type="button"
            onClick={() => setReferralOpen(true)}
            className="flex w-full max-w-md items-center justify-start gap-2 rounded-xl bg-green-600 px-5 py-3 text-base font-bold text-white transition hover:bg-green-500 sm:px-6 sm:text-lg"
          >
            Convide um amigo músico e tire ele do sufoco
            <InfoTooltip
              text={FUNCIONALIDADE_TOOLTIPS.indicacao}
              label="Sobre o programa de indicação"
              triggerClassName="text-white/90 hover:bg-white/15 hover:text-white"
            />
          </button>

          <div className="space-y-4 rounded-2xl border border-[var(--crash-cifra)] bg-black/50 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--crash-cifra)]" />
                <span
                  className={`rounded-full px-2.5 py-1 text-sm font-semibold ${
                    emTrial
                      ? 'bg-[var(--crash-cifra)]/15 text-[var(--crash-cifra)]'
                      : assinaturaAtivaAgora
                        ? 'bg-green-900/30 text-green-400'
                        : 'bg-white/5 text-zinc-400'
                  }`}
                >
                  {modoSoloBadge}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setExplorarAcervoOpen(true)}
                className={`${btnSecondaryClassName} shrink-0 !px-3 !py-2 text-sm`}
              >
                Explorar acervo
              </button>
            </div>

            <label className="relative block">
              <span className="sr-only">Buscar música</span>
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--crash-texto-sec)]">
                🔍
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título ou artista…"
                className="w-full rounded-lg border border-[var(--crash-borda)] bg-black py-2.5 pl-10 pr-3 text-base text-white outline-none focus:border-[var(--crash-cifra)] sm:py-2 sm:text-sm"
              />
            </label>

            {search.trim().length >= 2 && (
              <div className="rounded-lg border border-[var(--crash-borda)] bg-black/40 p-3">
                <h3 className="text-sm font-semibold text-[var(--crash-texto-sec)] sm:text-xs">
                  Resultados em todas as pastas
                </h3>
                {searchingSongs && (
                  <p className="mt-2 text-sm text-[var(--crash-texto-sec)] sm:text-xs">Buscando…</p>
                )}
                {musicas.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {musicas.map((musica) => (
                      <li
                        key={musica.id}
                        className="flex items-center gap-2 rounded-md border border-white/5 px-2.5 py-2 transition hover:border-[var(--crash-cifra)]"
                      >
                        <Link
                          to={`/teleprompter/musica/${musica.id}`}
                          className="min-w-0 flex-1 text-base sm:text-sm"
                        >
                          <span className="font-medium text-white">{musica.titulo}</span>
                          <span className="mt-0.5 block text-sm text-[var(--crash-texto-sec)] sm:text-xs">
                            {[
                              musica.artista || 'Sem artista',
                              musica.ministro?.nome || 'Sem ministro',
                              musica.tom_original || null,
                              musica.bpm ? `${musica.bpm} BPM` : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </Link>
                        <button
                          type="button"
                          onClick={(e) =>
                            setCopiarMusica({ musica, anchorEl: e.currentTarget })
                          }
                          className={`shrink-0 ${btnSecondaryClassName} !px-2.5 !py-1.5 text-sm sm:text-xs`}
                        >
                          Copiar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {!searchingSongs && musicas.length === 0 && (
                  <p className="mt-2 text-sm text-[var(--crash-texto-sec)] sm:text-xs">
                    Nenhuma música encontrada.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-bold text-white sm:text-lg">Ministros</h2>
              {!loading && !error && (
                <MinistrosArquivadosPanel
                  ministros={ministrosArquivados}
                  loading={loadingArquivados}
                  open={showArquivados}
                  onToggle={() => setShowArquivados((v) => !v)}
                  onRestaurar={handleRestaurar}
                  restaurandoId={restaurandoId}
                />
              )}
            </div>

            {loading && (
              <p className="text-sm text-[var(--crash-texto-sec)]">Carregando…</p>
            )}

            {error && (
              <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-400">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={reload}
                  className="mt-2 text-[var(--crash-cifra)] hover:underline"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {!loading && !error && (
              <MinistroTable
                ministros={ministros}
                onEdit={openEdit}
                onCreate={openCreate}
                onArchive={setConfirmArquivar}
              />
            )}
          </div>
        </>
      )}

      <ReferralModal open={referralOpen} onClose={() => setReferralOpen(false)} />

      <ExplorarAcervoModal
        open={explorarAcervoOpen}
        ministros={ministros}
        onClose={() => setExplorarAcervoOpen(false)}
        onMusicaAdicionada={() => {
          const termo = search.trim()
          if (termo.length >= 2) {
            searchMusicas(termo).then(setMusicas).catch(() => setMusicas([]))
          }
        }}
      />

      <CompartilharMusicaPopover
        open={!!copiarMusica}
        musica={copiarMusica?.musica}
        anchorEl={copiarMusica?.anchorEl}
        ministros={ministros}
        ministroAtualId={copiarMusica?.musica?.ministro_id}
        onClose={() => setCopiarMusica(null)}
        onCopied={() => {
          const termo = search.trim()
          if (termo.length >= 2) {
            searchMusicas(termo).then(setMusicas).catch(() => setMusicas([]))
          }
        }}
      />

      <MinistroFormModal
        open={modalOpen}
        ministro={editing}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      <ConfirmDeleteModal
        open={!!confirmArquivar}
        title="Modo soneca?"
        message={
          'O ministro vai entrar em modo soneca (sai da lista, mas o acervo dele fica guardado). Você pode acordá-lo quando quiser.'
        }
        confirmLabel="😴 Colocar em soneca"
        confirmLoadingLabel="Colocando em soneca…"
        confirmButtonClassName={btnPrimaryClassName}
        onConfirm={handleArquivarConfirm}
        onClose={() => setConfirmArquivar(null)}
      />
    </section>
  )
}
