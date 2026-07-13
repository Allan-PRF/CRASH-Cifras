import { btnCifraConfirmClassName, btnSecondaryClassName } from '../ui/inputClasses'

/**
 * Aviso ao abrir edição com rascunho local mais novo que o salvo.
 */
export function RascunhoEdicaoModal({ open, onContinuar, onDescartar }) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rascunho-edicao-title"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--crash-cifra)]/40 bg-[var(--crash-fundo-card)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="rascunho-edicao-title"
          className="text-lg font-bold text-[var(--crash-cifra)]"
        >
          Edição não salva
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--crash-texto-sec)]">
          Você tem uma edição não salva desta música neste aparelho. Continuar de onde
          parou ou descartar o rascunho?
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onDescartar} className={btnSecondaryClassName}>
            Descartar
          </button>
          <button type="button" onClick={onContinuar} className={btnCifraConfirmClassName}>
            Continuar
          </button>
        </div>
      </div>
    </div>
  )
}
