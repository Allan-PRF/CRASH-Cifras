import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { InstrucaoArranjo } from '../components/playlist/InstrucaoArranjo'
import { PageNav } from '../components/layout/PageNav'
import { MedleyToggle } from '../components/playlist/MedleyToggle'
import { BuscaMusicaEvento } from '../components/playlist/BuscaMusicaEvento'
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal'
import {
  btnPrimaryClassName,
  btnSecondaryClassName,
  btnCifraOutlineClassName,
  cardClassName,
  cardDashedClassName,
  cardMutedClassName,
  selectClassName,
} from '../components/ui/inputClasses'
import { formatDataEvento } from '../lib/formatDataBr'
import { gerarOrdemSecoesLocal } from '../lib/diretorLocal'
import { tituloDestinoMedley } from '../lib/playlistCultoNav'
import { cacheCultoPreparado, removeCultoPreparadoFromCache } from '../lib/offlineCulto'
import {
  aplicarSecoesPadraoVersiculos,
  mesclarVersiculoPrefs,
  quantidadeFromMomentosAtivos,
  versiculosFromManualPrefs,
} from '@crash-cifras/shared/versiculos-config'
import { gerarVersiculos } from '../lib/palavraLocal'
import {
  prefsEventoPadrao,
  VersiculosPreparoPanel,
} from '../components/versiculos/VersiculosPreparoPanel'
import { fetchMusicaCompleta, fetchAnotacoesPorMusicas, fetchMusicasParaPlaylist } from '../services/musicas'
import { AnotacaoIndicador } from '../components/musicas/AnotacaoIndicador'
import {
  addMusicaToPlaylist,
  fetchPlaylistCompleta,
  isPlaylistNotFoundError,
  marcarPlaylistPreparada,
  reabrirPlaylistRascunho,
  removePlaylistItem,
  reorderPlaylistItems,
  updatePlaylistItem,
} from '../services/playlists'
import { fetchUserSettings } from '../services/settings'
import { fetchTimbreByMusica } from '../services/timbres'
import { upsertVersiculosPlaylist } from '../services/versiculos'

function tomExibido(item) {
  return item.musicas?.tom_original || '—'
}

function ministroNome(item) {
  return item.musicas?.ministro?.nome || 'Sem ministro'
}

export function Playlist() {
  const { id } = useParams()
  const [playlist, setPlaylist] = useState(null)
  const [availableSongs, setAvailableSongs] = useState([])
  const [selectedSong, setSelectedSong] = useState('')
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [draggingId, setDraggingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [reabrindoEdicao, setReabrindoEdicao] = useState(false)
  const [anotacoesPorMusica, setAnotacoesPorMusica] = useState({})
  const [prefsVersiculosEvento, setPrefsVersiculosEvento] = useState(() =>
    prefsEventoPadrao(),
  )

  const itemIds = useMemo(() => playlist?.itens?.map((item) => item.id) ?? [], [playlist])
  const isPreparado = playlist?.status === 'preparado'
  const isRascunho = !playlist?.status || playlist.status === 'rascunho'

  const load = useCallback(({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true)
      setNotFound(false)
    }
    setError('')
    Promise.all([fetchPlaylistCompleta(id), fetchMusicasParaPlaylist()])
      .then(([playlistData, songs]) => {
        setPlaylist(playlistData)
        setAvailableSongs(songs)
        const ids = playlistData.itens?.map((item) => item.musica_id) ?? []
        if (ids.length) {
          fetchAnotacoesPorMusicas(ids)
            .then(setAnotacoesPorMusica)
            .catch(() => setAnotacoesPorMusica({}))
        } else {
          setAnotacoesPorMusica({})
        }
        if (playlistData.itens.length === 0) {
          setShowAddPanel(true)
        }
      })
      .catch((err) => {
        if (isPlaylistNotFoundError(err)) {
          removeCultoPreparadoFromCache(id)
          setNotFound(true)
          setPlaylist(null)
          setError('')
        } else {
          setError(err.message)
        }
      })
      .finally(() => {
        if (!silent) setLoading(false)
      })
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    fetchUserSettings()
      .then((s) => {
        if (s?.versao_biblica) {
          setPrefsVersiculosEvento((p) => ({
            ...p,
            versao_biblica: s.versao_biblica,
          }))
        }
      })
      .catch(() => {})
  }, [])

  async function handleAddSong(event) {
    event.preventDefault()
    if (!selectedSong) return
    setAdding(true)
    setError('')
    try {
      await addMusicaToPlaylist(id, selectedSong)
      setSelectedSong('')
      setShowAddPanel(false)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  async function reorder(nextIds) {
    setPlaylist((current) => ({
      ...current,
      itens: nextIds
        .map((itemId) => current.itens.find((item) => item.id === itemId))
        .filter(Boolean),
    }))
    await reorderPlaylistItems(id, nextIds)
    load()
  }

  async function handleDrop(targetId) {
    if (!draggingId || draggingId === targetId) return
    const next = [...itemIds]
    const from = next.indexOf(draggingId)
    const to = next.indexOf(targetId)
    if (from < 0 || to < 0) return
    next.splice(from, 1)
    next.splice(to, 0, draggingId)
    setDraggingId(null)
    await reorder(next)
  }

  async function interpretItem(item, instrucao) {
    try {
      const musica = await fetchMusicaCompleta(item.musica_id)
      const ordem = gerarOrdemSecoesLocal(instrucao, musica.secoes)
      await updatePlaylistItem(item.id, {
        instrucao_texto: instrucao,
        ordem_secoes: ordem,
        tipo: 'arranjo',
      })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  function solicitarRemoverItem(item) {
    const titulo = item.musicas?.titulo || 'esta música'
    setConfirmDelete({
      message: `Deseja remover "${titulo}" desta playlist?\nEsta ação não pode ser desfeita.`,
      onConfirm: async () => {
        await removePlaylistItem(item.id)
        load({ silent: true })
      },
    })
  }

  async function toggleMedley(index) {
    const item = playlist.itens[index]
    const next = playlist.itens[index + 1]
    if (!item || !next) return
    const active = item.medley_proxima_id === next.id
    await updatePlaylistItem(item.id, {
      medley_proxima_id: active ? null : next.id,
      tipo: active ? (item.ordem_secoes ? 'arranjo' : 'normal') : 'medley',
    })
    load()
  }

  async function handleEditarEvento() {
    setReabrindoEdicao(true)
    setError('')
    try {
      await reabrirPlaylistRascunho(id)
      setShowAddPanel(false)
      await load({ silent: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setReabrindoEdicao(false)
    }
  }

  async function preparePlaylist() {
    setPreparing(true)
    setError('')
    try {
      const settings = await fetchUserSettings()
      const musicasPreparadas = []
      const versiculosPreparados = []
      const timbresPreparados = []
      for (const item of playlist.itens) {
        const musica = await fetchMusicaCompleta(item.musica_id)
        musicasPreparadas.push(musica)
        const prefs = mesclarVersiculoPrefs(
          musica.versiculo_prefs,
          prefsVersiculosEvento,
          settings.versao_biblica,
        )
        let gerado = { tema: null, versiculos: [] }
        if (prefs.quantidade_versiculos > 0) {
          if (prefs.modo === 'manual') {
            gerado = {
              tema: null,
              versiculos: versiculosFromManualPrefs(musica.versiculo_prefs, musica.secoes ?? []),
            }
          } else {
            gerado = await gerarVersiculos(musica, prefs.versao_biblica)
          }
        }
        const filtrados = (gerado.versiculos || []).filter(
          (v) => prefs.momentos_ativos[v.momento] === true,
        )
        const versiculos = aplicarSecoesPadraoVersiculos(
          filtrados,
          musica.secoes ?? [],
          prefs.momentos_ativos,
        )
        const versiculo = await upsertVersiculosPlaylist({
          playlistId: id,
          musicaId: item.musica_id,
          versaoBiblica: prefs.versao_biblica,
          tema: gerado.tema,
          versiculos,
          quantidadeVersiculos: prefs.quantidade_versiculos,
          momentosAtivos: prefs.momentos_ativos,
        })
        versiculosPreparados.push(versiculo)
        console.log('[versiculos] preparo evento:', item.musica_id, {
          salvos: versiculo?.versiculos?.length ?? 0,
          momentos: prefs.momentos_ativos,
        })
        const timbre = await fetchTimbreByMusica(item.musica_id).catch(() => null)
        if (timbre) timbresPreparados.push(timbre)
      }
      const preparada = await marcarPlaylistPreparada(id)
      cacheCultoPreparado({
        playlist: { ...playlist, ...preparada },
        musicas: musicasPreparadas,
        versiculos: versiculosPreparados,
        timbres: timbresPreparados,
      })
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setPreparing(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--crash-texto-sec)]">Carregando…</p>
  }

  if (notFound) {
    return (
      <section className="mx-auto max-w-lg space-y-4">
        <PageNav
          breadcrumbItems={[
            { label: 'Início', to: '/' },
            { label: 'Histórico', to: '/historico' },
            { label: 'Evento' },
          ]}
          backTo="/historico"
          backVariant="cifra"
        />
        <div className={`space-y-3 p-6 ${cardClassName}`}>
          <h1 className="text-xl font-bold text-white">Este evento não existe mais</h1>
          <p className="text-sm leading-relaxed text-[var(--crash-texto-sec)]">
            Ele foi removido do servidor ou o cache offline deste dispositivo estava
            desatualizado. Removemos a cópia local automaticamente.
          </p>
          <Link to="/historico" className={`inline-block ${btnPrimaryClassName}`}>
            Voltar ao histórico
          </Link>
        </div>
      </section>
    )
  }

  if (error && !playlist) {
    return <p className="text-red-400">{error}</p>
  }

  const alreadyInPlaylist = new Set(playlist.itens.map((item) => item.musica_id))
  const addableSongs = availableSongs.filter((song) => !alreadyInPlaylist.has(song.id))
  const firstItem = playlist.itens[0]
  const canPrepare = isRascunho && playlist.itens.length > 0 && !preparing
  const canStart = isPreparado && firstItem
  const versiculosNoEvento = quantidadeFromMomentosAtivos(prefsVersiculosEvento.momentos_ativos)

  return (
    <section className="space-y-8">
      <PageNav
        breadcrumbItems={[
          { label: 'Início', to: '/' },
          { label: 'Eventos', to: '/playlist' },
          { label: playlist.nome },
        ]}
        backTo="/playlist"
        backVariant="cifra"
      />

      <header>
        <h1 className="text-2xl font-bold text-white">{playlist.nome}</h1>
        <p className="text-sm text-[var(--crash-texto-sec)]">
          {formatDataEvento(playlist.data_culto)}
          {isPreparado && (
            <span className="ml-2 font-medium text-[var(--crash-cifra)]">· Evento preparado</span>
          )}
        </p>
      </header>

      {isPreparado && (
        <div
          className={`flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between ${cardMutedClassName}`}
        >
          <p className="text-sm leading-relaxed text-white">
            Este evento está preparado.
            <br />
            Para adicionar músicas clique em Editar evento.
          </p>
          <button
            type="button"
            onClick={handleEditarEvento}
            disabled={reabrindoEdicao}
            className={`${btnPrimaryClassName} shrink-0`}
          >
            {reabrindoEdicao ? 'Abrindo edição…' : 'Editar evento'}
          </button>
        </div>
      )}

      {isRascunho && (
        <BuscaMusicaEvento
          playlistId={id}
          musicaIdsNaPlaylist={alreadyInPlaylist}
          disabled={false}
          onMusicaAdicionada={() => load({ silent: true })}
        />
      )}

      {error && (
        <p className="rounded-lg border border-red-900/40 bg-red-950/20 p-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {isRascunho &&
        (!showAddPanel ? (
        <button
          type="button"
          onClick={() => setShowAddPanel(true)}
          disabled={addableSongs.length === 0}
          className="w-full rounded-xl border-2 border-dashed border-[var(--crash-cifra)] bg-[var(--crash-cifra)]/10 px-6 py-5 text-lg font-semibold text-[var(--crash-cifra)] transition hover:bg-[var(--crash-cifra)]/20 disabled:border-[var(--crash-borda)] disabled:bg-transparent disabled:text-[var(--crash-texto-sec)]"
        >
          + Adicionar músicas
        </button>
      ) : (
        <form
          onSubmit={handleAddSong}
          className={`space-y-3 p-4 ${cardClassName}`}
        >
          <p className="text-sm font-medium text-white">Escolha uma música para a playlist</p>
          <select
            value={selectedSong}
            onChange={(e) => setSelectedSong(e.target.value)}
            className={selectClassName}
            autoFocus
          >
            <option value="">Selecione…</option>
            {addableSongs.map((song) => (
              <option key={song.id} value={song.id}>
                {song.titulo}
                {song.ministro?.nome ? ` · ${song.ministro.nome}` : ''}
                {song.tom_original ? ` · ${song.tom_original}` : ''}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={!selectedSong || adding}
              className={`flex-1 ${btnPrimaryClassName}`}
            >
              {adding ? 'Adicionando…' : 'Adicionar à playlist'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddPanel(false)}
              className={btnSecondaryClassName}
            >
              Fechar
            </button>
          </div>
          {addableSongs.length === 0 && (
            <p className="text-xs text-[var(--crash-texto-sec)]">
              Todas as suas músicas já estão nesta playlist.{' '}
              <Link to="/importar" className="text-[var(--crash-cifra)] hover:underline">
                Importe mais músicas
              </Link>
            </p>
          )}
        </form>
      ))}

      {playlist.itens.length === 0 ? (
        <p className={`p-8 text-center text-sm text-[var(--crash-texto-sec)] ${cardDashedClassName}`}>
          {isPreparado ? (
            'Nenhuma música nesta playlist.'
          ) : (
            <>
              Nenhuma música ainda. Toque em{' '}
              <strong className="text-white">+ Adicionar músicas</strong> ou use a busca do YouTube
              acima e monte a ordem do evento (de 3 a 6 músicas é o ideal).
            </>
          )}
        </p>
      ) : (
        <ol className="space-y-2">
          {playlist.itens.map((item, index) => {
            const medleyTitulo = tituloDestinoMedley(item, playlist.itens)
            return (
            <li key={item.id}>
              <article
                draggable={isRascunho}
                onDragStart={isRascunho ? () => setDraggingId(item.id) : undefined}
                onDragEnd={isRascunho ? () => setDraggingId(null) : undefined}
                onDragOver={isRascunho ? (event) => event.preventDefault() : undefined}
                onDrop={isRascunho ? () => handleDrop(item.id) : undefined}
                className={`p-4 transition ${cardClassName} ${
                  draggingId === item.id ? 'opacity-70' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {isRascunho ? (
                    <span
                      className="mt-1 cursor-grab select-none text-lg text-[var(--crash-texto-sec)] active:cursor-grabbing"
                      title="Arraste para reordenar"
                      aria-hidden
                    >
                      ⋮⋮
                    </span>
                  ) : (
                    <span
                      className="mt-1 select-none text-lg text-[var(--crash-borda)]"
                      aria-hidden
                    >
                      ⋮⋮
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[var(--crash-texto-sec)]">#{index + 1}</p>
                    <h2 className="mt-0.5 inline-flex items-center gap-2 text-lg font-semibold text-white">
                      {item.musicas?.titulo}
                      <AnotacaoIndicador conteudo={anotacoesPorMusica[item.musica_id]} />
                    </h2>
                    <p className="mt-1 text-sm text-[var(--crash-texto-sec)]">
                      {ministroNome(item)}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-[var(--crash-cifra)]">
                      Tom: {tomExibido(item)}
                    </p>
                    {medleyTitulo && (
                      <p className="mt-2 text-xs font-semibold text-[var(--crash-cifra)]">
                        🔗 MEDLEY → {medleyTitulo}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Link
                      to={`/musica/${item.musica_id}/editar`}
                      state={{ returnTo: `/playlist/${id}` }}
                      className={`${btnCifraOutlineClassName} px-3 py-1.5 text-xs`}
                    >
                      Editar cifra
                    </Link>
                    {isRascunho && (
                      <button
                        type="button"
                        onClick={() => solicitarRemoverItem(item)}
                        className="rounded-md px-2 py-1 text-xs text-red-400/70 transition hover:bg-red-950/40 hover:text-red-400"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>

                {isRascunho && (
                  <details className="mt-3 border-t border-[var(--crash-borda)] pt-3">
                    <summary className="cursor-pointer text-xs text-[var(--crash-texto-sec)] hover:text-white">
                      Arranjo / medley (opcional)
                    </summary>
                    <div className="mt-3">
                      <InstrucaoArranjo
                        item={item}
                        onSave={(instrucao) =>
                          updatePlaylistItem(item.id, { instrucao_texto: instrucao }).then(() =>
                            load({ silent: true }),
                          )
                        }
                        onInterpret={(instrucao) => interpretItem(item, instrucao)}
                      />
                    </div>
                  </details>
                )}
              </article>

              {isRascunho && index < playlist.itens.length - 1 && (
                <MedleyToggle
                  active={item.medley_proxima_id === playlist.itens[index + 1].id}
                  onToggle={() => toggleMedley(index)}
                />
              )}
              {!isRascunho && medleyTitulo && (
                <p className="my-2 text-center text-xs font-semibold text-[var(--crash-cifra)]">
                  🔗 MEDLEY
                </p>
              )}
            </li>
            )
          })}
        </ol>
      )}

      <div className={`space-y-4 p-4 ${cardMutedClassName}`}>
        <h2 className="text-sm font-semibold text-white">Próximos passos</h2>

        {isRascunho ? (
          <>
            <VersiculosPreparoPanel
              prefs={prefsVersiculosEvento}
              onChange={setPrefsVersiculosEvento}
              disabled={preparing}
            />
            <button
              type="button"
              onClick={preparePlaylist}
              disabled={!canPrepare}
              className={`w-full ${btnPrimaryClassName} py-3 text-base`}
            >
              {preparing
                ? 'Preparando evento…'
                : versiculosNoEvento > 0
                  ? 'Gerar versículos e preparar evento'
                  : 'Preparar evento'}
            </button>
            <p className="text-xs text-[var(--crash-texto-sec)]">
              {versiculosNoEvento > 0
                ? 'Gera versículos em cache no Supabase para cada música (revise em “Revisar versículos”).'
                : 'Sem versículos bíblicos neste evento — após preparar, use Iniciar Evento para ir ao teleprompter.'}
            </p>
          </>
        ) : (
          <p className="text-sm text-[var(--crash-texto-sec)]">
            Evento preparado. Use <strong className="text-white">Editar evento</strong> acima para
            alterar músicas e depois prepare novamente.
          </p>
        )}

        {canStart ? (
          <Link
            to={`/teleprompter/musica/${firstItem.musica_id}?playlist=${id}`}
            className="flex w-full items-center justify-center rounded-xl bg-[var(--crash-iniciar)] px-6 py-4 text-lg font-bold text-black transition hover:opacity-90"
          >
            Iniciar Evento
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed rounded-xl bg-[var(--crash-iniciar)]/30 px-6 py-4 text-lg font-bold text-black/50"
          >
            Iniciar Evento
          </button>
        )}
        {!isPreparado && playlist.itens.length > 0 && (
          <p className="text-center text-xs text-[var(--crash-texto-sec)]">
            Prepare o evento antes de iniciar o teleprompter.
          </p>
        )}

        <div className="flex flex-wrap gap-2 border-t border-[var(--crash-borda)] pt-4">
          {versiculosNoEvento > 0 ? (
            <Link to={`/playlist/${id}/versiculos`} className={btnSecondaryClassName}>
              Revisar versículos
            </Link>
          ) : null}
          <Link to={`/playlist/${id}/preview`} className={btnSecondaryClassName}>
            Preview arranjo
          </Link>
        </div>
      </div>
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
