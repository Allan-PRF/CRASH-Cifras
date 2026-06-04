import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PlaylistCriarStepHighlight } from '../components/playlist/PlaylistFlowSteps'
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal'
import { FormField } from '../components/ui/FormField'
import {
  btnPrimaryClassName,
  cardClassName,
  cardMutedClassName,
  inputClassName,
} from '../components/ui/inputClasses'
import {
  applyDataEventoMask,
  formatDataEvento,
  isoDateFromDisplayBr,
} from '../lib/formatDataBr'
import { useAuth } from '../hooks/useAuth'
import {
  createPlaylist,
  deletePlaylist,
  deletePlaylistsSemData,
  fetchPlaylists,
} from '../services/playlists'
import { fetchMinhaEquipe } from '../services/equipes'

export function Playlists() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [nome, setNome] = useState('')
  const [dataEvento, setDataEvento] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [equipeId, setEquipeId] = useState(null)

  function load() {
    setLoading(true)
    setError('')
    deletePlaylistsSemData()
      .then(() => fetchPlaylists())
      .then(setPlaylists)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    fetchMinhaEquipe()
      .then((data) => {
        if (data?.equipe?.id && data.meuTipo === 'lider') {
          setEquipeId(data.equipe.id)
        }
      })
      .catch(() => {})
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!nome.trim()) {
      setError('Informe o nome da playlist')
      return
    }
    const dataCultoIso = isoDateFromDisplayBr(dataEvento)
    if (!dataCultoIso) {
      setError('Informe a data do evento no formato dd/mm/aaaa')
      return
    }
    setSaving(true)
    setError('')
    try {
      const playlist = await createPlaylist({ nome, dataCulto: dataCultoIso, equipeId })
      navigate(`/playlist/${playlist.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const isEmpty = !loading && playlists.length === 0

  function solicitarExcluirPlaylist(playlist) {
    setConfirmDelete({
      message: `Deseja excluir a playlist "${playlist.nome}"?\nEsta ação não pode ser desfeita.`,
      onConfirm: async () => {
        await deletePlaylist(playlist.id)
        load()
      },
    })
  }

  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-white">Playlist de Eventos</h1>
      </header>

      {error && (
        <p className="rounded-lg border border-red-900/40 bg-red-950/20 p-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {loading && <p className="text-sm text-[var(--crash-texto-sec)]">Carregando…</p>}

      {isEmpty && (
        <div className={`space-y-6 p-6 ${cardMutedClassName}`}>
          <div className="text-center">
            <p className="text-lg font-semibold text-white">
              Crie sua primeira playlist de eventos
            </p>
            <p className="mt-2 text-sm text-[var(--crash-texto-sec)]">
              Preencha o nome e a data abaixo para começar.
            </p>
          </div>
        </div>
      )}

      {!loading && (
        <div className="space-y-4">
          <PlaylistCriarStepHighlight />
          <form
            onSubmit={handleSubmit}
            className={`grid gap-4 p-4 sm:grid-cols-[1fr_auto_auto] ${cardMutedClassName}`}
          >
            <FormField label="Nome da playlist">
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className={inputClassName}
                placeholder="Ex.: Evento de Domingo"
                required
              />
            </FormField>
            <FormField label="Data do evento">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={dataEvento}
                onChange={(e) => setDataEvento(applyDataEventoMask(e.target.value))}
                className={inputClassName}
                placeholder="dd/mm/aaaa"
                pattern="\d{2}/\d{2}/\d{4}"
                title="dd/mm/aaaa"
                required
              />
            </FormField>
            <div className="flex items-end">
              <button type="submit" disabled={saving} className={`w-full ${btnPrimaryClassName}`}>
                {saving ? 'Criando…' : '+ Criar playlist'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!loading && playlists.length > 0 && (() => {
        const minhas = playlists.filter((p) => p.user_id === user?.id)
        const daEquipe = playlists.filter((p) => p.user_id !== user?.id && p.equipe_id)
        return (
          <>
            {minhas.length > 0 && (
              <>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--crash-texto-sec)]">
                  Suas playlists
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {minhas.map((playlist) => (
                    <li key={playlist.id} className={`relative p-4 pr-16 ${cardClassName}`}>
                      <Link to={`/playlist/${playlist.id}`} className="block transition hover:opacity-95">
                        <p className="font-semibold text-white">{playlist.nome}</p>
                        <p className="mt-1 text-sm text-[var(--crash-texto-sec)]">
                          {formatDataEvento(playlist.data_culto)}
                          {playlist.status === 'preparado' && (
                            <span className="ml-2 text-[var(--crash-cifra)]">· Preparado</span>
                          )}
                        </p>
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); solicitarExcluirPlaylist(playlist) }}
                        className="absolute right-3 top-3 rounded-md px-2 py-1 text-xs text-red-400/70 transition hover:bg-red-950/40 hover:text-red-400"
                        aria-label={`Excluir playlist ${playlist.nome}`}
                      >
                        Excluir
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {daEquipe.length > 0 && (
              <>
                <h2 className="mt-4 text-sm font-semibold uppercase tracking-wide text-[var(--crash-texto-sec)]">
                  Playlists da equipe
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {daEquipe.map((playlist) => (
                    <li key={playlist.id} className={`relative p-4 ${cardClassName}`}>
                      <Link to={`/playlist/${playlist.id}`} className="block transition hover:opacity-95">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-green-900/40 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-400">
                            Equipe
                          </span>
                          <p className="font-semibold text-white">{playlist.nome}</p>
                        </div>
                        <p className="mt-1 text-sm text-[var(--crash-texto-sec)]">
                          {formatDataEvento(playlist.data_culto)}
                          {playlist.status === 'preparado' && (
                            <span className="ml-2 text-[var(--crash-cifra)]">· Preparado</span>
                          )}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )
      })()}
      <ConfirmDeleteModal
        open={!!confirmDelete}
        message={confirmDelete?.message}
        extraWarning={confirmDelete?.extraWarning}
        onConfirm={confirmDelete?.onConfirm ?? (() => {})}
        onClose={() => setConfirmDelete(null)}
      />
    </section>
  )
}
