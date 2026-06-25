import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageNav } from '../components/layout/PageNav'
import { CompartilharMusicaModal } from '../components/musicas/CompartilharMusicaModal'
import { MusicaNovaMenu } from '../components/musicas/MusicaNovaMenu'
import { MusicaTable } from '../components/musicas/MusicaTable'
import { useMinistros } from '../hooks/useMinistros'
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal'
import { inputClassName } from '../components/ui/inputClasses'
import { deleteMusica, fetchAnotacoesPorMusicas, fetchMusicasByMinistro } from '../services/musicas'
import { fetchMinistroById } from '../services/ministros'
import { fetchPlaylistsAtivasComMusica } from '../services/playlists'

const AVISO_MUSICA_PLAYLIST =
  'Esta música está em uma playlist.\nAo excluir será removida também da playlist.'

function iniciais(nome) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export function Ministro() {
  const { id } = useParams()
  const [ministro, setMinistro] = useState(null)
  const [musicas, setMusicas] = useState([])
  const [anotacoesPorMusica, setAnotacoesPorMusica] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [compartilharMusica, setCompartilharMusica] = useState(null)
  const [buscaMusicas, setBuscaMusicas] = useState('')
  const { ministros } = useMinistros()

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([fetchMinistroById(id), fetchMusicasByMinistro(id)])
      .then(async ([m, songs]) => {
        setMinistro(m)
        setMusicas(songs)
        const anotacoes = await fetchAnotacoesPorMusicas(songs.map((s) => s.id)).catch(
          () => ({}),
        )
        setAnotacoesPorMusica(anotacoes)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function solicitarExcluirMusica(musica) {
    let extraWarning = null
    try {
      const playlists = await fetchPlaylistsAtivasComMusica(musica.id)
      if (playlists.length > 0) {
        extraWarning = AVISO_MUSICA_PLAYLIST
      }
    } catch {
      /* segue sem aviso extra */
    }

    setConfirmDelete({
      message:
        'Deseja excluir esta música?\nEsta ação não pode ser desfeita.',
      extraWarning,
      onConfirm: async () => {
        await deleteMusica(musica.id)
        load()
      },
    })
  }

  if (loading) {
    return <p className="text-sm text-[var(--crash-texto-sec)]">Carregando…</p>
  }

  if (error || !ministro) {
    return (
      <section className="space-y-4 text-center">
        <p className="text-red-400">{error || 'Ministro não encontrado'}</p>
        <Link to="/" className="text-[var(--crash-cifra)] hover:underline">
          Voltar
        </Link>
      </section>
    )
  }

  return (
    <section className="space-y-8">
      <PageNav
        breadcrumbItems={[
          { label: 'Início', to: '/' },
          { label: ministro.nome },
        ]}
        backTo="/"
      />

      <header className="flex items-center gap-4">
        {ministro.foto_url ? (
          <img
            src={ministro.foto_url}
            alt=""
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--crash-borda)] text-2xl font-bold text-[var(--crash-cifra)]">
            {iniciais(ministro.nome)}
          </span>
        )}
        <div>
          <h1 className="text-2xl font-bold text-white">{ministro.nome}</h1>
        </div>
      </header>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block min-w-0 flex-1 sm:max-w-md">
            <span className="sr-only">Pesquisar músicas salvas</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--crash-texto-sec)]">
              🔍
            </span>
            <input
              type="search"
              value={buscaMusicas}
              onChange={(e) => setBuscaMusicas(e.target.value)}
              placeholder="Pesquisar músicas salvas…"
              className={`${inputClassName} pl-10`}
            />
          </label>
          <MusicaNovaMenu
            ministroId={id}
            ministroNome={ministro.nome}
            onImported={() => load()}
          />
        </div>

        <MusicaTable
          musicas={musicas}
          anotacoesPorMusica={anotacoesPorMusica}
          query={buscaMusicas}
          onQueryChange={setBuscaMusicas}
          hideSearch
          onExcluir={solicitarExcluirMusica}
          onCompartilhar={setCompartilharMusica}
        />
      </section>

      <ConfirmDeleteModal
        open={!!confirmDelete}
        message={confirmDelete?.message}
        extraWarning={confirmDelete?.extraWarning}
        onConfirm={confirmDelete?.onConfirm ?? (() => {})}
        onClose={() => setConfirmDelete(null)}
      />

      <CompartilharMusicaModal
        open={!!compartilharMusica}
        musica={compartilharMusica}
        ministros={ministros}
        ministroAtualId={id}
        onClose={() => setCompartilharMusica(null)}
        onCopied={() => load()}
      />
    </section>
  )
}
