import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ReferralModal } from '../components/referral/ReferralModal'
import { CompartilharMusicaModal } from '../components/musicas/CompartilharMusicaModal'
import { InstallPwaPrompt } from '../components/InstallPwaPrompt'
import { NovidadeBanner } from '../components/novidades/NovidadeBanner'
import { MinistroFormModal } from '../components/ministros/MinistroFormModal'
import { MinistroTable } from '../components/ministros/MinistroTable'
import { InfoTooltip } from '../components/ui/InfoTooltip'
import { btnSecondaryClassName } from '../components/ui/inputClasses'
import { FUNCIONALIDADE_TOOLTIPS } from '../lib/funcionalidadeTooltips'
import { useAuth } from '../hooks/useAuth'
import { useMinistros } from '../hooks/useMinistros'
import { useUserSettings } from '../hooks/useUserSettings'
import { assinaturaAtiva, diasRestantesTrial, trialAtivo } from '../lib/planos'
import { createMinistro, updateMinistro } from '../services/ministros'
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

  return (
    <section className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            CRASH <span className="text-[#F97316]">Cifras</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--crash-texto-sec)]">
            Plataforma de cifras e eventos para músicos
          </p>
        </div>
        {user && (
          <button
            type="button"
            onClick={() => setReferralOpen(true)}
            className={`inline-flex items-center gap-1 ${btnSecondaryClassName}`}
          >
            Indicar e Ganhar
            <InfoTooltip
              text={FUNCIONALIDADE_TOOLTIPS.indicacao}
              label="Sobre o programa de indicação"
            />
          </button>
        )}
      </header>

      <InstallPwaPrompt />

      {!user && (
        <Link
          to="/login"
          className="block rounded-xl border border-[var(--crash-cifra)]/40 bg-[var(--crash-cifra)]/5 p-4 text-center text-sm text-white"
        >
          Entrar para cadastrar ministros e músicas
        </Link>
      )}

      {user && (
        <>
          <NovidadeBanner />

          <div className="rounded-2xl border border-[var(--crash-cifra)] bg-black/50 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--crash-cifra)]" />
                <h2 className="text-base font-bold text-white">Modo Solo</h2>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
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
                className="w-full rounded-lg border border-[var(--crash-borda)] bg-black py-2 pl-10 pr-3 text-sm text-white outline-none focus:border-[var(--crash-cifra)]"
              />
            </label>

            {search.trim().length >= 2 && (
              <div className="rounded-lg border border-[var(--crash-borda)] bg-black/40 p-3">
                <h3 className="text-xs font-semibold text-[var(--crash-texto-sec)]">
                  Resultados em todas as pastas
                </h3>
                {searchingSongs && (
                  <p className="mt-2 text-xs text-[var(--crash-texto-sec)]">Buscando…</p>
                )}
                {musicas.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {musicas.map((musica) => (
                      <li
                        key={musica.id}
                        className="flex items-center gap-2 rounded-md border border-white/5 px-2.5 py-2 transition hover:border-[var(--crash-cifra)]"
                      >
                        <Link
                          to={`/musica/${musica.id}`}
                          className="min-w-0 flex-1 text-sm"
                        >
                          <span className="font-medium text-white">{musica.titulo}</span>
                          <span className="mt-0.5 block text-xs text-[var(--crash-texto-sec)]">
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
                          onClick={() => setCopiarMusica(musica)}
                          className={`inline-flex shrink-0 items-center gap-0.5 ${btnSecondaryClassName} !px-2.5 !py-1.5 text-xs`}
                        >
                          Copiar para…
                          <InfoTooltip
                            text={FUNCIONALIDADE_TOOLTIPS.copiarCena}
                            label="Sobre copiar para outro ministro"
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {!searchingSongs && musicas.length === 0 && (
                  <p className="mt-2 text-xs text-[var(--crash-texto-sec)]">
                    Nenhuma música encontrada.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white">Ministros</h2>

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
              />
            )}
          </div>
        </>
      )}

      <ReferralModal open={referralOpen} onClose={() => setReferralOpen(false)} />

      <CompartilharMusicaModal
        open={!!copiarMusica}
        musica={copiarMusica}
        ministros={ministros}
        ministroAtualId={copiarMusica?.ministro_id}
        onClose={() => setCopiarMusica(null)}
        onCopied={() => {
          const termo = search.trim()
          if (termo.length >= 2) {
            searchMusicas(termo).then(setMusicas).catch(() => setMusicas([]))
          }
        }}
        titulo="Copiar para…"
      />

      <MinistroFormModal
        open={modalOpen}
        ministro={editing}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </section>
  )
}
