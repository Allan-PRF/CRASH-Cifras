import { PlaylistPassadasTable } from './PlaylistPassadasTable'
import { PlaylistProximosCards } from './PlaylistProximosCards'

function Subsecao({ titulo, children }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--crash-texto-sec)]">
        {titulo}
      </h3>
      {children}
    </div>
  )
}

/**
 * @param {{
 *   playlists: Array<object>,
 *   userId?: string,
 *   modo: 'cards' | 'tabela',
 *   onExcluir?: (playlist: object) => void,
 * }} props
 */
export function PlaylistListaPorData({ playlists, userId, modo, onExcluir }) {
  const minhas = playlists.filter((p) => p.user_id === userId)
  const daEquipe = playlists.filter((p) => p.user_id !== userId && p.equipe_id)

  const Lista = modo === 'cards' ? PlaylistProximosCards : PlaylistPassadasTable

  if (!minhas.length && !daEquipe.length) return null

  return (
    <div className="space-y-5">
      {minhas.length > 0 && (
        <Subsecao titulo="Suas playlists">
          <Lista playlists={minhas} onExcluir={onExcluir} />
        </Subsecao>
      )}
      {daEquipe.length > 0 && (
        <Subsecao titulo="Playlists da equipe">
          <Lista playlists={daEquipe} equipe onExcluir={onExcluir} />
        </Subsecao>
      )}
    </div>
  )
}
