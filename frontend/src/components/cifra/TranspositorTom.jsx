import { TONS_MAIORES, TONS_MENORES } from '../../lib/tons'
import { transposeKey } from '../../lib/transpose'

function TomButton({ tom, tomAtual, onClick }) {
  const ativo = tom === tomAtual
  return (
    <button
      type="button"
      onClick={() => onClick(tom)}
      className={`rounded-lg border py-2 text-sm font-semibold transition ${
        ativo
          ? 'border-[var(--crash-cifra)] bg-[var(--crash-cifra)] text-black'
          : 'border-[var(--crash-borda)] text-white hover:border-[var(--crash-cifra)]'
      }`}
    >
      {tom}
    </button>
  )
}

/**
 * Grade completa de tons + ajuste por semitom.
 * @param {string|null} tomAtual
 * @param {(tom: string) => void} onSelectTom
 * @param {boolean} [permitirVazio]
 * @param {(v: string|null) => void} [onClear]
 */
export function TranspositorTom({
  tomAtual,
  onSelectTom,
  permitirVazio = false,
  onClear,
  compacto = false,
}) {
  function semitom(delta) {
    if (!tomAtual) return
    const next = transposeKey(tomAtual, delta)
    if (next) onSelectTom(next)
  }

  return (
    <div className="space-y-4">
      {!compacto && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {tomAtual ? (
            <p className="text-sm text-[var(--crash-cifra)]">
              Tom: <span className="font-bold">{tomAtual}</span>
            </p>
          ) : (
            <p className="text-sm text-[var(--crash-texto-sec)]">Nenhum tom definido</p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!tomAtual}
              onClick={() => semitom(-1)}
              className="min-w-10 rounded-lg border border-[var(--crash-borda)] px-3 py-2 text-lg font-bold text-white transition hover:border-[var(--crash-cifra)] disabled:opacity-40"
              title="½ tom abaixo"
              aria-label="Meio tom abaixo"
            >
              ←
            </button>
            <span className="text-xs text-[var(--crash-texto-sec)]">½ tom</span>
            <button
              type="button"
              disabled={!tomAtual}
              onClick={() => semitom(1)}
              className="min-w-10 rounded-lg border border-[var(--crash-borda)] px-3 py-2 text-lg font-bold text-white transition hover:border-[var(--crash-cifra)] disabled:opacity-40"
              title="½ tom acima"
              aria-label="Meio tom acima"
            >
              →
            </button>
          </div>
        </div>
      )}

      {compacto && (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={!tomAtual}
            onClick={() => semitom(-1)}
            className="min-w-9 rounded-lg border border-[var(--crash-borda)] px-2 py-1.5 text-base font-bold text-white transition hover:border-[var(--crash-cifra)] disabled:opacity-40"
            title="½ tom abaixo"
            aria-label="Meio tom abaixo"
          >
            ←
          </button>
          <span className="text-xs text-[var(--crash-texto-sec)]">½ tom</span>
          <button
            type="button"
            disabled={!tomAtual}
            onClick={() => semitom(1)}
            className="min-w-9 rounded-lg border border-[var(--crash-borda)] px-2 py-1.5 text-base font-bold text-white transition hover:border-[var(--crash-cifra)] disabled:opacity-40"
            title="½ tom acima"
            aria-label="Meio tom acima"
          >
            →
          </button>
        </div>
      )}

      {permitirVazio && (
        <button
          type="button"
          onClick={() => onClear?.(null)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
            !tomAtual
              ? 'border-[var(--crash-cifra)] bg-[var(--crash-cifra)]/15 text-white'
              : 'border-[var(--crash-borda)] text-[var(--crash-texto-sec)] hover:border-[var(--crash-cifra)]'
          }`}
        >
          Sem tom
        </button>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--crash-texto-sec)]">
          Maiores
        </p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {TONS_MAIORES.map((tom) => (
            <TomButton
              key={tom}
              tom={tom}
              tomAtual={tomAtual}
              onClick={onSelectTom}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--crash-texto-sec)]">
          Menores
        </p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {TONS_MENORES.map((tom) => (
            <TomButton
              key={tom}
              tom={tom}
              tomAtual={tomAtual}
              onClick={onSelectTom}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
