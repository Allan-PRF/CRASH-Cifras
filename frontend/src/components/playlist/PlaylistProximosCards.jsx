import { Link } from 'react-router-dom'
import { formatDataEvento } from '../../lib/formatDataBr'
import { cardClassName } from '../ui/inputClasses'

/**
 * @param {{ playlists: Array<object>, equipe?: boolean, onExcluir?: (playlist: object) => void }} props
 */
export function PlaylistProximosCards({ playlists, equipe = false, onExcluir }) {
  if (!playlists.length) return null

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {playlists.map((playlist) => (
        <li
          key={playlist.id}
          className={`relative p-4 ${onExcluir && !equipe ? 'pr-16' : ''} ${cardClassName}`}
        >
          <Link to={`/playlist/${playlist.id}`} className="block transition hover:opacity-95">
            {equipe ? (
              <div className="flex items-center gap-2">
                <span className="rounded bg-green-900/40 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-400">
                  Equipe
                </span>
                <p className="font-semibold text-white">{playlist.nome}</p>
              </div>
            ) : (
              <p className="font-semibold text-white">{playlist.nome}</p>
            )}
            <p className="mt-1 text-sm text-[var(--crash-texto-sec)]">
              {formatDataEvento(playlist.data_culto)}
              {playlist.status === 'preparado' && (
                <span className="ml-2 text-[var(--crash-cifra)]">· Preparado</span>
              )}
            </p>
          </Link>
          {onExcluir && !equipe && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                onExcluir(playlist)
              }}
              className="absolute right-3 top-3 rounded-md px-2 py-1 text-xs text-red-400/70 transition hover:bg-red-950/40 hover:text-red-400"
              aria-label={`Excluir playlist ${playlist.nome}`}
            >
              Excluir
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
