/** Ícone 📝 com tooltip de preview (playlist, tabela do ministro). */
export function AnotacaoIndicador({ conteudo, className = '' }) {
  const text = String(conteudo || '').trim()
  if (!text) return null

  const preview = text.length > 220 ? `${text.slice(0, 220)}…` : text

  return (
    <span
      className={`group relative inline-flex shrink-0 align-middle ${className}`}
      role="img"
      aria-label="Música com anotações"
    >
      <span className="cursor-default text-sm leading-none opacity-90 transition group-hover:opacity-100">
        📝
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-max max-w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-white/10 bg-black/95 px-3 py-2 text-left text-xs font-normal normal-case tracking-normal text-white shadow-lg group-hover:block"
      >
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--crash-cifra)]">
          Anotação
        </span>
        <span className="block whitespace-pre-wrap">{preview}</span>
      </span>
    </span>
  )
}
