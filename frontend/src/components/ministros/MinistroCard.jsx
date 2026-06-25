import { Link } from 'react-router-dom'
import { cardClassName } from '../ui/inputClasses'

function iniciais(nome) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export function MinistroCard({ ministro, onEdit }) {
  const { id, nome, foto_url, musicas_count } = ministro

  return (
    <article className={`group relative p-4 transition hover:bg-white/[0.03] ${cardClassName}`}>
      <Link to={`/ministro/${id}`} className="flex items-center gap-4">
        {foto_url ? (
          <img
            src={foto_url}
            alt=""
            className="h-[72px] w-[72px] shrink-0 rounded-lg object-cover"
          />
        ) : (
          <span
            className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-lg bg-[var(--crash-borda)] text-xl font-bold text-[var(--crash-cifra)]"
            aria-hidden
          >
            {iniciais(nome)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-white">{nome}</h2>
          <p className="mt-0.5 text-sm text-[var(--crash-texto-sec)]">
            {musicas_count === 0
              ? 'Nenhuma música'
              : `${musicas_count} música${musicas_count !== 1 ? 's' : ''}`}
          </p>
        </div>
      </Link>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          onEdit(ministro)
        }}
        className="absolute right-3 top-3 rounded-md px-2 py-1 text-xs text-[var(--crash-texto-sec)] opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"
      >
        Editar
      </button>
    </article>
  )
}
