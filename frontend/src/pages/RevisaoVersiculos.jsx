import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  MOMENTOS_VERSICULO,
  aplicarSecoesPadraoVersiculos,
  parseMomentosAtivos,
  quantidadeFromMomentosAtivos,
  normalizarQuantidadeVersiculos,
  secaoPadraoParaMomento,
} from '@crash-cifras/shared/versiculos-config'
import { gerarVersiculos } from '../lib/palavraLocal'
import { PageNav } from '../components/layout/PageNav'
import { fetchMusicaCompleta } from '../services/musicas'
import { fetchPlaylistCompleta } from '../services/playlists'
import {
  fetchVersiculosByPlaylist,
  updateVersiculosRecord,
  upsertVersiculosPlaylist,
} from '../services/versiculos'
import {
  btnPrimaryClassName,
  btnSecondaryClassName,
  cardClassName,
  selectClassName,
} from '../components/ui/inputClasses'

const LABEL_MOMENTO = {
  verso: 'VERSO',
  refrao: 'REFRÃO',
  ponte: 'PONTE',
}

export function RevisaoVersiculos() {
  const { id } = useParams()
  const [playlist, setPlaylist] = useState(null)
  const [records, setRecords] = useState([])
  const [musicas, setMusicas] = useState({})
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingPrefs, setSavingPrefs] = useState(null)
  const [error, setError] = useState('')

  const recordsByMusic = useMemo(
    () => new Map(records.map((record) => [record.musica_id, record])),
    [records],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [playlistData, versiculos] = await Promise.all([
        fetchPlaylistCompleta(id),
        fetchVersiculosByPlaylist(id),
      ])
      const musicEntries = await Promise.all(
        playlistData.itens.map(async (item) => [
          item.musica_id,
          await fetchMusicaCompleta(item.musica_id),
        ]),
      )
      setPlaylist(playlistData)
      setRecords(versiculos)
      setMusicas(Object.fromEntries(musicEntries))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  function startEdit(record, momento) {
    const item = record.versiculos.find((v) => v.momento === momento)
    setEditing({ recordId: record.id, momento })
    setDraft({ ...item })
  }

  async function saveEdit() {
    const record = records.find((item) => item.id === editing.recordId)
    const next = record.versiculos.map((item) =>
      item.momento === editing.momento ? draft : item,
    )
    await updateVersiculosRecord(record.id, { versiculos: next })
    setEditing(null)
    setDraft(null)
    load()
  }

  async function regenerate(record, momento) {
    const musica = musicas[record.musica_id]
    const gerado = await gerarVersiculos(musica, record.versao_biblica)
    const replacement = gerado.versiculos.find((item) => item.momento === momento)
    const momentos = parseMomentosAtivos(record.momentos_ativos)
    const next = aplicarSecoesPadraoVersiculos(
      record.versiculos.map((item) =>
        item.momento === momento ? { ...replacement, secao_id: item.secao_id } : item,
      ),
      musica?.secoes ?? [],
      momentos,
    )
    await updateVersiculosRecord(record.id, {
      tema_identificado: gerado.tema,
      versiculos: next,
    })
    load()
  }

  async function ensureRecord(item) {
    const musica = await fetchMusicaCompleta(item.musica_id)
    const gerado = await gerarVersiculos(musica)
    const momentos_ativos = { verso: true, refrao: false, ponte: false }
    const versiculos = aplicarSecoesPadraoVersiculos(
      gerado.versiculos,
      musica.secoes ?? [],
      momentos_ativos,
    )
    await upsertVersiculosPlaylist({
      playlistId: id,
      musicaId: item.musica_id,
      versaoBiblica: 'NVI',
      tema: gerado.tema,
      versiculos,
      quantidadeVersiculos: quantidadeFromMomentosAtivos(momentos_ativos),
      momentosAtivos: momentos_ativos,
    })
    load()
  }

  async function saveMomentosAtivos(record, momentos) {
    const musica = musicas[record.musica_id]
    const qty = quantidadeFromMomentosAtivos(momentos)
    setSavingPrefs(record.id)
    try {
      const versiculos = aplicarSecoesPadraoVersiculos(
        record.versiculos,
        musica?.secoes ?? [],
        momentos,
      )
      await updateVersiculosRecord(record.id, {
        quantidade_versiculos: qty,
        momentos_ativos: momentos,
        versiculos,
      })
      await load()
    } finally {
      setSavingPrefs(null)
    }
  }

  async function toggleMomentoAtivo(record, momentoId) {
    const momentos = parseMomentosAtivos(record.momentos_ativos)
    momentos[momentoId] = !momentos[momentoId]
    await saveMomentosAtivos(record, momentos)
  }

  async function saveSecaoVersiculo(record, momento, secaoId) {
    const musica = musicas[record.musica_id]
    const momentos = parseMomentosAtivos(record.momentos_ativos)
    setSavingPrefs(`${record.id}-${momento}`)
    try {
      const versiculos = aplicarSecoesPadraoVersiculos(
        record.versiculos.map((item) =>
          item.momento === momento ? { ...item, secao_id: secaoId } : item,
        ),
        musica?.secoes ?? [],
        momentos,
      )
      await updateVersiculosRecord(record.id, { versiculos })
      setRecords((prev) =>
        prev.map((r) => (r.id === record.id ? { ...r, versiculos } : r)),
      )
    } finally {
      setSavingPrefs(null)
    }
  }

  if (loading) return <p className="text-sm text-[var(--crash-texto-sec)]">Carregando…</p>
  if (error || !playlist) {
    return <p className="text-red-400">{error || 'Playlist não encontrada'}</p>
  }

  return (
    <section className="space-y-6">
      <PageNav
        breadcrumbItems={[
          { label: 'Início', to: '/' },
          { label: 'Eventos', to: '/playlist' },
          { label: playlist.nome, to: `/playlist/${id}` },
          { label: 'Versículos' },
        ]}
        backTo={`/playlist/${id}`}
      />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Revisão de versículos</h1>
          <p className="text-sm text-[var(--crash-texto-sec)]">{playlist.nome}</p>
        </div>
        <Link to={`/playlist/${id}/preview`} className={btnSecondaryClassName}>
          Preview arranjo
        </Link>
      </header>

      <div className="space-y-4">
        {playlist.itens.map((item) => {
          const record = recordsByMusic.get(item.musica_id)
          const musica = musicas[item.musica_id] || item.musicas
          const secoes = musica?.secoes ?? []
          const momentosAtivos = parseMomentosAtivos(record?.momentos_ativos)
          const quantidade = quantidadeFromMomentosAtivos(momentosAtivos)
          const momentosVisiveis = MOMENTOS_VERSICULO.filter((m) => momentosAtivos[m.id])
          const prefsBusy = savingPrefs === record?.id

          return (
            <article key={item.id} className={`p-4 ${cardClassName}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-[var(--crash-cifra)]">
                    📖 {record?.versao_biblica || 'NVI'}
                  </p>
                  <h2 className="text-lg font-semibold text-white">{musica?.titulo}</h2>
                  {record?.tema_identificado && (
                    <p className="text-sm text-[var(--crash-texto-sec)]">
                      Tema: {record.tema_identificado}
                    </p>
                  )}
                </div>
                {!record && (
                  <button
                    type="button"
                    onClick={() => ensureRecord(item)}
                    className={btnPrimaryClassName}
                  >
                    Gerar
                  </button>
                )}
              </div>

              {record && (
                <>
                  <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-black/40 px-4 py-3">
                    <p className="text-sm font-medium text-white">
                      Onde ministrar ({quantidade} versículo
                      {quantidade !== 1 ? 's' : ''})
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {MOMENTOS_VERSICULO.map((m) => (
                        <label
                          key={m.id}
                          className="flex cursor-pointer items-center gap-2 text-sm text-white"
                        >
                          <input
                            type="checkbox"
                            checked={momentosAtivos[m.id] === true}
                            disabled={prefsBusy}
                            onChange={() => toggleMomentoAtivo(record, m.id)}
                            className="h-4 w-4 accent-[var(--crash-cifra)]"
                          />
                          {LABEL_MOMENTO[m.id]}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 divide-y divide-white/10">
                    {momentosVisiveis.map((momento) => {
                      const versiculo = record.versiculos.find(
                        (v) => v.momento === momento.id,
                      )
                      const isEditing =
                        editing?.recordId === record.id &&
                        editing?.momento === momento.id
                      const secaoBusy = savingPrefs === `${record.id}-${momento.id}`

                      return (
                        <div key={momento.id} className="py-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-xs font-bold text-[var(--crash-cifra)]">
                              {LABEL_MOMENTO[momento.id]} → {versiculo?.referencia}
                            </p>
                            {secoes.length > 0 && versiculo && (
                              <label className="flex flex-wrap items-center gap-2 text-xs text-[var(--crash-texto-sec)]">
                                Exibir em:
                                <select
                                  value={
                                    versiculo.secao_id ||
                                    secaoPadraoParaMomento(secoes, momento.id) ||
                                    ''
                                  }
                                  disabled={secaoBusy}
                                  onChange={(e) =>
                                    saveSecaoVersiculo(
                                      record,
                                      momento.id,
                                      e.target.value,
                                    )
                                  }
                                  className={`${selectClassName} max-w-[220px] py-1 text-sm`}
                                >
                                  {secoes.map((sec) => (
                                    <option key={sec.id} value={sec.id}>
                                      {sec.nome || sec.slug}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="mt-3 space-y-2">
                              <input
                                value={draft.referencia}
                                onChange={(e) =>
                                  setDraft({ ...draft, referencia: e.target.value })
                                }
                                className="w-full rounded-lg border border-[var(--crash-borda)] bg-black px-3 py-2 text-sm text-white"
                              />
                              <textarea
                                value={draft.texto}
                                onChange={(e) =>
                                  setDraft({ ...draft, texto: e.target.value })
                                }
                                className="w-full rounded-lg border border-[var(--crash-borda)] bg-black px-3 py-2 text-sm text-white"
                              />
                              <textarea
                                value={draft.palavra}
                                onChange={(e) =>
                                  setDraft({ ...draft, palavra: e.target.value })
                                }
                                className="w-full rounded-lg border border-[var(--crash-borda)] bg-black px-3 py-2 text-sm text-white"
                              />
                              <button
                                type="button"
                                onClick={saveEdit}
                                className={btnPrimaryClassName}
                              >
                                Salvar
                              </button>
                            </div>
                          ) : (
                            <>
                              <p className="mt-1 text-sm italic text-[var(--crash-versiculo-texto)]">
                                “{versiculo?.texto}”
                              </p>
                              <p className="mt-2 text-sm text-white">✨ {versiculo?.palavra}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEdit(record, momento.id)}
                                  className={btnSecondaryClassName}
                                >
                                  ✏️ Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => regenerate(record, momento.id)}
                                  className={btnSecondaryClassName}
                                >
                                  🔄 Gerar outro
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
