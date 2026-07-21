import { Link } from 'react-router-dom'
import { btnSecondaryClassName } from '../ui/inputClasses'

function iniciais(nome) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export function MinistrosArquivadosPanel({
  ministros,
  loading,
  open,
  onToggle,
  onRestaurar,
  restaurandoId,
}) {
  const count = ministros.length

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex max-w-full items-center gap-1.5 text-sm text-[var(--crash-texto-sec)] transition hover:text-[var(--crash-cifra)] ${btnSecondaryClassName} !border-dashed !px-2.5 !py-1.5 !text-sm sm:!px-3 sm:!text-xs`}
        aria-expanded={open}
      >
        <span aria-hidden="true">😴</span>
        <span className="truncate sm:hidden">Soneca ({loading ? '…' : count})</span>
        <span className="hidden truncate sm:inline">
          Ministros em soneca ({loading ? '…' : count})
        </span>
      </button>

      {open && (
        <div className="rounded-xl border border-dashed border-[var(--crash-borda)] bg-white/[0.02] p-3">
          {loading && (
            <p className="text-xs text-[var(--crash-texto-sec)]">Carregando soneca…</p>
          )}
          {!loading && count === 0 && (
            <p className="text-xs text-[var(--crash-texto-sec)]">
              Nenhum ministro em soneca.
            </p>
          )}
          {!loading && count > 0 && (
            <ul className="space-y-1.5">
              {ministros.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2 rounded-lg border border-white/5 px-2.5 py-2"
                >
                  {m.foto_url ? (
                    <img
                      src={m.foto_url}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-md object-cover opacity-70"
                    />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--crash-borda)] text-xs font-bold text-[var(--crash-cifra)] opacity-70">
                      {iniciais(m.nome)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link
                        to={`/ministro/${m.id}`}
                        className="truncate text-sm font-medium text-white/80 hover:text-[var(--crash-cifra)]"
                      >
                        {m.nome}
                      </Link>
                      <span className="shrink-0 rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                        💤 Em soneca
                      </span>
                    </div>
                    <span className="text-xs text-[var(--crash-texto-sec)]">
                      {m.musicas_count ?? 0} música{(m.musicas_count ?? 0) === 1 ? '' : 's'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRestaurar(m)}
                    disabled={restaurandoId === m.id}
                    className="shrink-0 rounded px-2 py-1 text-xs font-medium text-[var(--crash-cifra)] transition hover:bg-[var(--crash-cifra)]/10 disabled:opacity-50"
                  >
                    {restaurandoId === m.id ? 'Acordando…' : (
                      <>
                        <span aria-hidden="true">👁 </span>
                        Acordar
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
