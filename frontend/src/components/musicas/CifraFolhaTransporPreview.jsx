import { getTomExibido } from '../../lib/transpose'

/**
 * Controle de transposição só visual na folha de edição (não persiste no banco).
 */
export function CifraFolhaTransporPreview({
  tomOriginal,
  offsetVisual,
  onOffsetVisualChange,
}) {
  const tomExibido = tomOriginal ? getTomExibido(tomOriginal, offsetVisual) : null
  const desabilitado = !tomOriginal

  function ajustarSemitom(delta) {
    onOffsetVisualChange(offsetVisual + delta)
  }

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-[var(--crash-borda)]/80 bg-white/[0.03] px-3 py-2.5"
      role="group"
      aria-label="Transposição visual da folha"
    >
      <span className="text-xs font-medium uppercase tracking-wider text-[var(--crash-texto-sec)]">
        Ver em
      </span>
      <span className="min-w-[2.5rem] text-sm font-semibold text-[var(--crash-cifra)]">
        {tomExibido || '—'}
      </span>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={desabilitado}
          onClick={() => ajustarSemitom(-1)}
          className="min-w-9 rounded-lg border border-[var(--crash-borda)] px-2 py-1.5 text-base font-bold text-white transition hover:border-[var(--crash-cifra)] disabled:opacity-40"
          title="Um semitom abaixo"
          aria-label="Um semitom abaixo"
        >
          ←
        </button>
        <span className="text-[10px] text-[var(--crash-texto-sec)]">1 st</span>
        <button
          type="button"
          disabled={desabilitado}
          onClick={() => ajustarSemitom(1)}
          className="min-w-9 rounded-lg border border-[var(--crash-borda)] px-2 py-1.5 text-base font-bold text-white transition hover:border-[var(--crash-cifra)] disabled:opacity-40"
          title="Um semitom acima"
          aria-label="Um semitom acima"
        >
          →
        </button>
      </div>

      {offsetVisual !== 0 ? (
        <button
          type="button"
          onClick={() => onOffsetVisualChange(0)}
          className="rounded-lg border border-[var(--crash-borda)] px-2.5 py-1 text-xs font-medium text-white transition hover:border-[var(--crash-cifra)]"
        >
          Original
        </button>
      ) : null}

      {desabilitado ? (
        <span className="text-xs text-[var(--crash-texto-sec)]">
          Defina o tom original acima para visualizar.
        </span>
      ) : null}
    </div>
  )
}
