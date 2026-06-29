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
          className={`max-w-xs text-sm ${inputClassName}`}
        />
        <button type="button" onClick={onCreate} className={btnPrimaryClassName}>
          + Novo ministro
        </button>
      </div>

      {filtrados.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--crash-borda)] p-8 text-center text-sm text-[var(--crash-texto-sec)]">
          {busca ? 'Nenhum ministro encontrado.' : 'Nenhum ministro cadastrado.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--crash-borda)]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-[var(--crash-texto-sec)]">
                <th className="px-3 py-2.5 font-medium w-10">#</th>
                <th className="px-3 py-2.5 font-medium w-12">Foto</th>
                {COLUNAS.map((col) => (
                  <th key={col.key} className="px-3 py-2.5 font-medium">
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className="hover:text-white"
                      >
                        {col.label}{arrow(col.key)}
                      </button>
                    ) : col.label}
                  </th>
                ))}
                <th className="px-3 py-2.5 font-medium text-right">Ações</th>
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
                  <td className="px-3 py-2 text-[var(--crash-texto-sec)]">{i + 1}</td>
                  <td className="px-3 py-2">
                    {m.foto_url ? (
                      <img src={m.foto_url} alt="" className="h-9 w-9 rounded-md object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--crash-borda)] text-xs font-bold text-[var(--crash-cifra)]">
                        {iniciais(m.nome)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      to={`/ministro/${m.id}`}
                      className="font-medium text-white hover:text-[var(--crash-cifra)]"
                    >
                      {m.nome}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-[var(--crash-texto-sec)]">{m.musicas_count ?? 0}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/ministro/${m.id}`}
                        className="rounded px-2 py-1 text-xs text-[var(--crash-cifra)] hover:bg-[var(--crash-cifra)]/10"
                      >
                        Abrir →
                      </Link>
                      <button
                        type="button"
                        onClick={() => onEdit(m)}
                        className="rounded px-2 py-1 text-xs text-[var(--crash-texto-sec)] hover:bg-white/10 hover:text-white"
                      >
                        Editar
                      </button>
                      {onArchive && (
                        <button
                          type="button"
                          onClick={() => onArchive(m)}
                          className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-white/10 hover:text-zinc-300"
                          title="Arquivar ministro"
                        >
                          Arquivar
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
