import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { btnPrimaryClassName, btnSecondaryClassName } from '../ui/inputClasses'
import { fetchMinhaEquipe } from '../../services/equipes'

function StatusDot({ online }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${online ? 'bg-green-400' : 'bg-zinc-600'}`}
    />
  )
}

export function HomeEquipeResumo() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      const result = await fetchMinhaEquipe()
      setData(result)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="rounded-2xl border border-green-800/40 bg-green-950/20 p-5">
        <p className="text-sm text-zinc-400">Carregando equipe…</p>
      </div>
    )
  }

  const equipe = data?.equipe
  const membros = data?.membros || []
  const isLider = data?.meuTipo === 'lider'

  function copiarCodigo() {
    if (!equipe) return
    const url = `${window.location.origin}/conta?equipe=${equipe.codigo}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!equipe) {
    return (
      <div className="rounded-2xl border border-green-800/40 bg-green-950/20 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
          <h2 className="text-base font-bold text-white">Minha Equipe</h2>
        </div>
        <p className="text-sm text-zinc-400">
          Você ainda não faz parte de uma equipe.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link to="/conta" className={btnPrimaryClassName}>
            Criar equipe
          </Link>
          <Link to="/conta" className={btnSecondaryClassName}>
            Entrar em uma equipe
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-green-800/40 bg-green-950/20 p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-400" />
          <h2 className="text-base font-bold text-white">{equipe.nome}</h2>
        </div>
        {isLider && (
          <button
            type="button"
            onClick={copiarCodigo}
            className="rounded-md border border-green-700/40 px-2.5 py-1 text-xs text-green-300 transition hover:bg-green-900/30"
          >
            {copied ? 'Copiado!' : `Convite: ${equipe.codigo}`}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {membros.slice(0, 7).map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-xs"
          >
            <StatusDot online={m.status_online} />
            <span className="text-white">{m.display_name}</span>
            {m.tipo === 'lider' && (
              <span className="text-[10px] font-bold text-green-400">L</span>
            )}
          </div>
        ))}
        {membros.length > 7 && (
          <span className="self-center text-xs text-zinc-500">
            +{membros.length - 7}
          </span>
        )}
      </div>

      <Link
        to="/conta"
        className="inline-block text-xs text-green-400 hover:text-green-300 hover:underline"
      >
        Gerenciar equipe →
      </Link>
    </div>
  )
}
