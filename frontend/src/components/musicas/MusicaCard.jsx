import { Link } from 'react-router-dom'
import { cardClassName } from '../ui/inputClasses'

const btnExcluirDiscreto =
  'rounded-md px-2 py-1 text-xs text-red-400/70 transition hover:bg-red-950/40 hover:text-red-400'

export function MusicaCard({ musica, onExcluir }) {
  const tom = musica.tom_original

  return (
    <article className={`relative p-4 pr-16 ${cardClassName}`}>
      {onExcluir && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onExcluir(musica)
          }}
          className={`absolute right-3 top-3 z-10 ${btnExcluirDiscreto}`}
          aria-label={`Excluir ${musica.titulo}`}
        >
          Excluir
        </button>
      )}
      <Link to={`/teleprompter/musica/${musica.id}`} className="block">
        <p className="font-medium text-white">{musica.titulo}</p>
        {musica.artista && (
          <p className="text-sm text-[var(--crash-texto-sec)]">{musica.artista}</p>
        )}
        <p className="mt-2 text-xs text-[var(--crash-cifra)]">
          {tom && `Tom: ${tom}`}
          {musica.bpm && ` · ${musica.bpm} BPM`}
        </p>
      </Link>
      <Link
        to={`/musica/${musica.id}/editar`}
        className="mt-2 inline-block text-xs text-[var(--crash-texto-sec)] hover:text-[var(--crash-cifra)]"
      >
        Editar cifra →
      </Link>
    </article>
  )
}
