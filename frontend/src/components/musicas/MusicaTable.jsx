import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { inputClassName } from '../ui/inputClasses'

const COLS = [
  { key: '#', label: '#', sortable: false, className: 'w-10 text-center' },
  { key: 'titulo', label: 'Título', sortable: true, className: 'min-w-[140px]' },
  { key: 'artista', label: 'Artista', sortable: true, className: 'min-w-[100px]' },
  { key: 'tom_original', label: 'Tom', sortable: true, className: 'w-16 text-center' },
  { key: 'bpm', label: 'BPM', sortable: true, className: 'w-16 text-center' },
  { key: 'acoes', label: 'Ações', sortable: false, className: 'min-w-[280px] whitespace-nowrap' },
]

function compare(a, b, key, dir) {
  let va = a[key]
  let vb = b[key]
  if (va == null) va = ''
  if (vb == null) vb = ''
  if (typeof va === 'number' && typeof vb === 'number') {
    return dir === 'asc' ? va - vb : vb - va
  }
  const sa = String(va).toLowerCase()
  const sb = String(vb).toLowerCase()
  if (sa < sb) return dir === 'asc' ? -1 : 1
  if (sa > sb) return dir === 'asc' ? 1 : -1
  return 0
}

export function MusicaTable({
  musicas,
  onExcluir,
  onCompartilhar,
  query: queryProp,
  onQueryChange,
  hideSearch = false,
}) {
  const [sortKey, setSortKey] = useState('titulo')
  const [sortDir, setSortDir] = useState('asc')
  const [internalQuery, setInternalQuery] = useState('')

  const query = queryProp !== undefined ? queryProp : internalQuery
  const setQuery = onQueryChange ?? setInternalQuery

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return musicas
    return musicas.filter(
      (m) =>
        m.titulo?.toLowerCase().includes(q) ||
        m.artista?.toLowerCase().includes(q),
    )
  }, [musicas, query])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => compare(a, b, sortKey, sortDir))
  }, [filtered, sortKey, sortDir])

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function arrow(key) {
    if (sortKey !== key) return ''
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  return (
    <div className="space-y-3">
      {!hideSearch && (
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar músicas salvas…"
          className={`${inputClassName} max-w-sm`}
        />
      )}

      <div className="overflow-x-auto rounded-xl border border-[var(--crash-borda)]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--crash-borda)] bg-black/60 text-xs uppercase tracking-wider text-[var(--crash-texto-sec)]">
              {COLS.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2.5 font-medium ${col.className} ${
                    col.sortable ? 'cursor-pointer select-none hover:text-white' : ''
                  }`}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                >
                  {col.label}
                  {col.sortable && (
                    <span className="text-[var(--crash-cifra)]">{arrow(col.key)}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={COLS.length} className="px-3 py-6 text-center text-[var(--crash-texto-sec)]">
                  {query ? 'Nenhum resultado.' : 'Nenhuma música.'}
                </td>
              </tr>
            )}
            {sorted.map((m, idx) => (
              <tr
                key={m.id}
                className={`border-b border-white/5 transition-colors hover:border-[var(--crash-cifra)] hover:bg-[var(--crash-cifra)]/5 ${
                  idx % 2 === 0 ? 'bg-black/30' : 'bg-black/50'
                }`}
              >
                <td className="px-3 py-2 text-center text-xs text-[var(--crash-texto-sec)]">
                  {idx + 1}
                </td>
                <td className="px-3 py-2">
                  <Link
                    to={`/teleprompter/musica/${m.id}`}
                    className="font-medium text-white hover:text-[var(--crash-cifra)]"
                  >
                    {m.titulo}
                  </Link>
                </td>
                <td className="px-3 py-2 text-[var(--crash-texto-sec)]">
                  {m.artista || '—'}
                </td>
                <td className="px-3 py-2 text-center text-[var(--crash-cifra)]">
                  {m.tom_original || '—'}
                </td>
                <td className="px-3 py-2 text-center text-white">
                  {m.bpm || '—'}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-row flex-nowrap items-center justify-start gap-2">
                    <Link
                      to={`/teleprompter/musica/${m.id}`}
                      className="shrink-0 rounded-md bg-green-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-green-500"
                    >
                      ▶ Tocar
                    </Link>
                    <Link
                      to={`/musica/${m.id}/editar`}
                      className="shrink-0 rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white transition hover:border-[var(--crash-cifra)] hover:text-[var(--crash-cifra)]"
                    >
                      Editar
                    </Link>
                    {onCompartilhar && (
                        <button
                          type="button"
                          onClick={(e) => onCompartilhar(m, e.currentTarget)}
                          className="shrink-0 rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white transition hover:border-[var(--crash-cifra)] hover:text-[var(--crash-cifra)]"
                        >
                          ↗ Compartilhar
                        </button>
                    )}
                    {onExcluir && (
                      <button
                        type="button"
                        onClick={() => onExcluir(m)}
                        className="shrink-0 rounded-md border border-red-900/50 bg-red-950/30 px-2.5 py-1 text-xs font-semibold text-red-400 transition hover:bg-red-950/50"
                        aria-label={`Excluir ${m.titulo}`}
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--crash-texto-sec)]">
        {sorted.length} música{sorted.length !== 1 ? 's' : ''}
        {query && ` (filtro: "${query}")`}
      </p>
    </div>
  )
}
