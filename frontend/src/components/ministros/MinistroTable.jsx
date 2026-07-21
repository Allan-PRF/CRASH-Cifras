import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { btnPrimaryClassName, inputClassName } from '../ui/inputClasses'

function iniciais(nome) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

const COLUNAS = [
  { key: 'nome', label: 'Nome', sortable: true },
  { key: 'musicas_count', label: 'Músicas', sortable: true },
]

export function MinistroTable({ ministros, onEdit, onCreate, onArchive }) {
  const [busca, setBusca] = useState('')
  const [sortKey, setSortKey] = useState('nome')
  const [sortAsc, setSortAsc] = useState(true)

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim()
    let list = ministros
    if (q) {
      list = list.filter((m) => m.nome.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => {
      let va = a[sortKey] ?? ''
      let vb = b[sortKey] ?? ''
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortAsc ? va - vb : vb - va
      }
      va = String(va).toLowerCase()
      vb = String(vb).toLowerCase()
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  }, [ministros, busca, sortKey, sortAsc])

  function toggleSort(key) {
    if (sortKey === key) {
      setSortAsc((v) => !v)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  function arrow(key) {
    if (sortKey !== key) return ''
    return sortAsc ? ' ↑' : ' ↓'
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="Buscar ministro…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className={`max-w-xs text-base sm:text-sm ${inputClassName}`}
        />
        <button
          type="button"
          onClick={onCreate}
          className={`${btnPrimaryClassName} !px-5 !py-3 !text-lg !font-bold sm:!px-4 sm:!py-2.5 sm:!text-base`}
        >
          + Novo ministro
        </button>
      </div>

      {filtrados.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--crash-borda)] p-8 text-center text-base text-[var(--crash-texto-sec)] sm:text-sm">
          {busca ? 'Nenhum ministro encontrado.' : 'Nenhum ministro cadastrado.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--crash-borda)]">
          <table className="w-full table-fixed text-left text-base sm:text-sm">
            <colgroup>
              <col className="w-14 sm:w-16" />
              <col />
              <col className="w-10 sm:w-16" />
              <col className="w-40 sm:w-44" />
            </colgroup>
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-[var(--crash-texto-sec)]">
                <th className="px-2 py-2.5 font-medium sm:px-3">Foto</th>
                {COLUNAS.map((col) => (
                  <th
                    key={col.key}
                    className={`py-2.5 font-medium ${
                      col.key === 'musicas_count'
                        ? 'px-1 text-center sm:px-2'
                        : 'px-1.5 sm:px-2'
                    }`}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className="hover:text-white"
                      >
                        {col.key === 'musicas_count' ? (
                          <>
                            <span className="sm:hidden">Mús.</span>
                            <span className="hidden sm:inline">{col.label}</span>
                          </>
                        ) : (
                          col.label
                        )}
                        {arrow(col.key)}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
                <th className="px-1 py-2.5 text-right font-medium sm:px-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((m, i) => (
                <tr
                  key={m.id}
                  className={`border-b border-white/5 transition hover:border-[var(--crash-cifra)] hover:bg-white/[0.03] ${
                    i % 2 === 1 ? 'bg-white/[0.015]' : ''
                  }`}
                >
                  <td className="px-2 py-2.5 sm:px-3">
                    {m.foto_url ? (
                      <img
                        src={m.foto_url}
                        alt=""
                        className="h-12 w-12 rounded-md object-cover sm:h-11 sm:w-11"
                      />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-md bg-[var(--crash-borda)] text-sm font-bold text-[var(--crash-cifra)] sm:h-11 sm:w-11">
                        {iniciais(m.nome)}
                      </span>
                    )}
                  </td>
                  <td className="min-w-0 px-1 py-2.5 sm:px-2">
                    <Link
                      to={`/ministro/${m.id}`}
                      className="block truncate text-base font-semibold text-white hover:text-[var(--crash-cifra)] sm:text-[15px]"
                    >
                      {m.nome}
                    </Link>
                  </td>
                  <td className="px-1 py-2.5 text-center text-[var(--crash-texto-sec)] sm:px-2">
                    {m.musicas_count ?? 0}
                  </td>
                  <td className="px-0.5 py-2.5 text-right sm:px-2">
                    <div className="flex flex-wrap items-center justify-end gap-x-1 gap-y-0.5">
                      <Link
                        to={`/ministro/${m.id}`}
                        className="rounded px-1 py-1 text-xs font-semibold text-[var(--crash-cifra)] hover:bg-[var(--crash-cifra)]/10 sm:px-2 sm:text-xs"
                      >
                        Abrir →
                      </Link>
                      <button
                        type="button"
                        onClick={() => onEdit(m)}
                        className="rounded px-1 py-1 text-xs text-[var(--crash-texto-sec)] hover:bg-white/10 hover:text-white sm:px-2"
                      >
                        Editar
                      </button>
                      {onArchive && (
                        <button
                          type="button"
                          onClick={() => onArchive(m)}
                          className="rounded px-1 py-1 text-xs text-zinc-500 hover:bg-white/10 hover:text-zinc-300 sm:px-2"
                          title="Colocar ministro em modo soneca"
                        >
                          <span aria-hidden="true">😴 </span>
                          Soneca
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
