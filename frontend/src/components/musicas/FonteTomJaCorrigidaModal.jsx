import { btnCifraConfirmClassName, btnSecondaryClassName } from '../ui/inputClasses'

/**
 * Fonte motor já corrigida — propagação bloqueada; cópia pessoal continua livre.
 */
export function FonteTomJaCorrigidaModal({
  open,
  onReportar,
  onSalvarCopia,
  onClose,
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fonte-ja-corrigida-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--crash-borda)] bg-[var(--crash-fundo-card)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="fonte-ja-corrigida-title" className="text-lg font-bold text-white">
          Tom já corrigido na fonte
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--crash-texto-sec)]">
          O tom desta música já foi corrigido na fonte. Se você acredita que ainda está
          errado, envie um reporte para a equipe corrigir.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onSalvarCopia} className={btnSecondaryClassName}>
            Salvar só na minha cópia
          </button>
          <button type="button" onClick={onReportar} className={btnCifraConfirmClassName}>
            Reportar tom errado
          </button>
        </div>
      </div>
    </div>
  )
}
