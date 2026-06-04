import { equivalentePorNivel } from '../../lib/timbreLocal'

export function TimbreCard({ timbre, nivelTeclado, onClose }) {
  if (!timbre) return null

  return (
    <aside className="fixed right-4 top-20 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-[var(--crash-cifra)]/50 bg-black/95 p-4 text-white shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--crash-cifra)]">
            🎛️ {timbre.nome}
          </p>
          <h2 className="mt-1 text-lg font-bold">{timbre.timbre_nome}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-2 py-1 text-[var(--crash-texto-sec)] hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <p>🎹 {timbre.familia_timbre}</p>
        <p>🎚️ {timbre.efeitos?.join(' + ') || 'Sem efeito sugerido'}</p>
        <p>🦶 {timbre.pedal}</p>
        <p>🖐️ {timbre.toque} · {timbre.dinamica}</p>
      </div>

      <p className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-[var(--crash-texto-sec)]">
        Sugestão: {equivalentePorNivel(timbre, nivelTeclado)}
      </p>
    </aside>
  )
}
