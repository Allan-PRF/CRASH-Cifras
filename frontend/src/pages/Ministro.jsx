import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PageNav } from '../components/layout/PageNav'
import { PageBackButton } from '../components/layout/PageBackButton'
import { CompartilharMusicaPopover } from '../components/musicas/CompartilharMusicaPopover'
import { MusicaNovaMenu } from '../components/musicas/MusicaNovaMenu'
import { ExplorarAcervoModal } from '../components/musicas/ExplorarAcervoModal'
import { ImportacaoEmAndamentoBanner } from '../components/musicas/ImportacaoEmAndamentoBanner'
import { ImportacaoConcluidaBanner } from '../components/musicas/ImportacaoConcluidaBanner'
import { MusicaTable } from '../components/musicas/MusicaTable'
import { useMinistros } from '../hooks/useMinistros'
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal'
import { btnCifraOutlineClassName, inputClassName } from '../components/ui/inputClasses'
import { deleteMusica, fetchMusicasByMinistro } from '../services/musicas'
import { fetchMinistroById } from '../services/ministros'
import { fetchPlaylistsAtivasComMusica } from '../services/playlists'
import {
  loadImportDoneInvite,
  saveImportDoneInvite,
} from '../lib/importJobStorage'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [compartilharMusica, setCompartilharMusica] = useState(null)
  const [buscaMusicas, setBuscaMusicas] = useState('')
  const [importJobAtivo, setImportJobAtivo] = useState(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [explorarAcervoOpen, setExplorarAcervoOpen] = useState(false)
  const [importDoneInvite, setImportDoneInvite] = useState(() => loadImportDoneInvite(id))
  const { ministros } = useMinistros()

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([fetchMinistroById(id), fetchMusicasByMinistro(id)])
      .then(([m, songs]) => {
        setMinistro(m)
        setMusicas(songs)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    setImportDoneInvite(loadImportDoneInvite(id))
  }, [id])

  // Enriquecer título "Música" com o nome real após load() na pasta.
  useEffect(() => {
    if (!importDoneInvite?.musicaId || !musicas.length) return
    const row = musicas.find((m) => m.id === importDoneInvite.musicaId)
    if (!row?.titulo) return
    if (importDoneInvite.titulo && importDoneInvite.titulo !== 'Música') return
    saveImportDoneInvite(id, {
      musicaId: importDoneInvite.musicaId,
      titulo: row.titulo,
      etapa: importDoneInvite.etapa,
      jobId: importDoneInvite.jobId,
    })
    setImportDoneInvite(loadImportDoneInvite(id))
  }, [musicas, importDoneInvite, id])

  const tituloConviteEnriquecido = (() => {
    if (!importDoneInvite?.musicaId) return null
    const row = musicas.find((m) => m.id === importDoneInvite.musicaId)
    return row?.titulo || importDoneInvite.titulo || null
  })()

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
        <PageBackButton to="/" variant="cifra" label="Voltar" />
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
        backVariant="cifra"
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
        <ImportacaoEmAndamentoBanner
          ministroId={id}
          onJobChange={setImportJobAtivo}
          onVerProgresso={() => setImportModalOpen(true)}
          onConcluido={() => {
            load()
            setImportDoneInvite(loadImportDoneInvite(id))
          }}
        />

        <ImportacaoConcluidaBanner
          ministroId={id}
          invite={importDoneInvite}
          tituloEnriquecido={tituloConviteEnriquecido}
          onDismiss={() => setImportDoneInvite(null)}
        />

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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setExplorarAcervoOpen(true)}
              className={btnCifraOutlineClassName}
            >
              Explorar acervo
            </button>
            <MusicaNovaMenu
              ministroId={id}
              ministroNome={ministro.nome}
              resumeJob={importJobAtivo}
              importOpen={importModalOpen}
              onImportOpenChange={setImportModalOpen}
              onImported={() => load()}
            />
          </div>
        </div>

        <MusicaTable
          musicas={musicas}
          query={buscaMusicas}
          onQueryChange={setBuscaMusicas}
          hideSearch
          onExcluir={solicitarExcluirMusica}
          onCompartilhar={(m, anchorEl) => setCompartilharMusica({ musica: m, anchorEl })}
        />
      </section>

      <ConfirmDeleteModal
        open={!!confirmDelete}
        message={confirmDelete?.message}
        extraWarning={confirmDelete?.extraWarning}
        onConfirm={confirmDelete?.onConfirm ?? (() => {})}
        onClose={() => setConfirmDelete(null)}
      />

      <CompartilharMusicaPopover
        open={!!compartilharMusica}
        musica={compartilharMusica?.musica}
        anchorEl={compartilharMusica?.anchorEl}
        ministros={ministros}
        ministroAtualId={id}
        onClose={() => setCompartilharMusica(null)}
        onCopied={() => load()}
      />

      <ExplorarAcervoModal
        open={explorarAcervoOpen}
        ministros={ministros}
        ministroInicialId={id}
        onClose={() => setExplorarAcervoOpen(false)}
        onMusicaAdicionada={(_musica, destinoMinistroId) => {
          if (destinoMinistroId === id) load()
        }}
      />
    </section>
  )
}
