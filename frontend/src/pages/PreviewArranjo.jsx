import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { expandirOrdemSecoes } from '../lib/diretorLocal'
import { fetchMusicaCompleta } from '../services/musicas'
import { fetchPlaylistCompleta } from '../services/playlists'
import {
  btnPrimaryClassName,
  btnSecondaryClassName,
  cardClassName,
  cardDashedClassName,
} from '../components/ui/inputClasses'

export function PreviewArranjo() {
  const { id } = useParams()
  const [playlist, setPlaylist] = useState(null)
  const [previews, setPreviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const playlistData = await fetchPlaylistCompleta(id)
        const resolved = await Promise.all(
          playlistData.itens.map(async (item) => {
            const musica = await fetchMusicaCompleta(item.musica_id)
            return {
              item,
              musica,
              ordem: expandirOrdemSecoes(item.ordem_secoes, musica.secoes),
            }
          }),
        )
        if (!cancelled) {
          setPlaylist(playlistData)
          setPreviews(resolved)
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return <p className="text-sm text-[var(--crash-texto-sec)]">Carregando…</p>
  }

  if (error || !playlist) {
    return <p className="text-red-400">{error || 'Playlist não encontrada'}</p>
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to={`/playlist/${id}`}
            className="text-xs text-[var(--crash-texto-sec)] hover:text-white"
          >
            ← Voltar à playlist
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-white">Preview do arranjo</h1>
          <p className="text-sm text-[var(--crash-texto-sec)]">{playlist.nome}</p>
        </div>
        {playlist.itens[0] && (
          <Link
            to={`/teleprompter/musica/${playlist.itens[0].musica_id}?playlist=${id}`}
            className={btnPrimaryClassName}
          >
            Iniciar Evento
          </Link>
        )}
      </header>

      {previews.length === 0 && (
        <p className={`p-8 text-center text-sm text-[var(--crash-texto-sec)] ${cardDashedClassName}`}>
          Nenhuma música na playlist.
        </p>
      )}

      <div className="space-y-4">
        {previews.map(({ item, musica, ordem }, index) => (
          <article
            key={item.id}
            className={`p-4 ${cardClassName}`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs text-[var(--crash-cifra)]">Canção {index + 1}</p>
                <h2 className="text-lg font-semibold text-white">{musica.titulo}</h2>
                <p className="text-sm text-[var(--crash-texto-sec)]">
                  Instrução: {item.instrucao_texto || 'Normal — início ao fim'}
                </p>
              </div>
              <Link to={`/playlist/${id}`} className={btnSecondaryClassName}>
                Ajustar
              </Link>
            </div>

            <ol className="mt-4 space-y-2">
              {ordem.map(({ secao, repeticao, repeticoes }, secIndex) => (
                <li
                  key={`${secao.id}-${secIndex}`}
                  className="flex items-center justify-between rounded-lg border border-[var(--crash-cifra)] bg-black/40 px-3 py-2 text-sm"
                >
                  <span className="text-white">
                    {secIndex + 1}. {secao.nome}
                  </span>
                  {repeticoes > 1 && (
                    <span className="text-[var(--crash-cifra)]">
                      {repeticao}/{repeticoes}
                    </span>
                  )}
                </li>
              ))}
              {ordem.length === 0 && (
                <li className={`p-3 text-sm text-[var(--crash-texto-sec)] ${cardDashedClassName}`}>
                  Esta música ainda não tem seções.
                </li>
              )}
            </ol>

            {item.medley_proxima_id && (
              <p className="mt-4 rounded-lg border border-[var(--crash-cifra)]/40 bg-[var(--crash-cifra)]/10 p-3 text-sm text-[var(--crash-cifra)]">
                🔗 MEDLEY com a próxima música
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
