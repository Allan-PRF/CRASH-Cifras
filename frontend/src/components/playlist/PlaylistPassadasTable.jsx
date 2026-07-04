import { Link } from 'react-router-dom'
import { formatDataEvento } from '../../lib/formatDataBr'

/**
 * @param {{ playlists: Array<object>, equipe?: boolean, onExcluir?: (playlist: object) => void }} props
 */
export function PlaylistPassadasTable({ playlists, equipe = false, onExcluir }) {
  if (!playlists.length) return null

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--crash-borda)]">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-[var(--crash-texto-sec)]">
            <th className="w-28 px-3 py-2.5 font-medium">Data</th>
            <th className="px-3 py-2.5 font-medium">Evento</th>
            {onExcluir && !equipe ? (
              <th className="w-20 px-3 py-2.5 font-medium text-right"> </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {playlists.map((playlist, i) => (
            <tr
              key={playlist.id}
              className={`border-b border-white/5 transition hover:border-[var(--crash-cifra)] hover:bg-white/[0.03] ${
                i % 2 === 1 ? 'bg-white/[0.015]' : ''
              }`}
            >
              <td className="whitespace-nowrap px-3 py-2.5 text-[var(--crash-texto-sec)]">
                {formatDataEvento(playlist.data_culto)}
              </td>
              <td className="px-3 py-2.5">
                <Link
                  to={`/playlist/${playlist.id}`}
                  className="inline-flex flex-wrap items-center gap-2 font-medium text-white hover:text-[var(--crash-cifra)]"
                >
                  {equipe && (
                    <span className="rounded bg-green-900/40 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-400">
                      Equipe
                    </span>
                  )}
                  <span>{playlist.nome}</span>
                  {playlist.status === 'preparado' && (
                    <span className="text-xs font-normal text-[var(--crash-cifra)]">· Preparado</span>
                  )}
                </Link>
              </td>
              {onExcluir && !equipe ? (
                <td className="px-3 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => onExcluir(playlist)}
                    className="rounded px-2 py-1 text-xs text-red-400/70 transition hover:bg-red-950/40 hover:text-red-400"
                    aria-label={`Excluir playlist ${playlist.nome}`}
                  >
                    Excluir
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
