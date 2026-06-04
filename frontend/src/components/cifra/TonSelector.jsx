import { TranspositorTom } from './TranspositorTom'
import { btnSecondaryClassName } from '../ui/inputClasses'

export function TonSelector({ tomAtual, onSelect, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transpor-tom-title"
    >
      <div className="max-h-[90svh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--crash-borda)] bg-[var(--crash-fundo-card)] p-5">
        <div className="flex items-center justify-between">
          <h2 id="transpor-tom-title" className="text-lg font-bold text-white">
            Transpor tom
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--crash-texto-sec)] hover:text-white"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="mt-4">
          <TranspositorTom
            tomAtual={tomAtual}
            onSelectTom={(tom) => {
              onSelect(tom)
              onClose()
            }}
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          className={`mt-4 w-full ${btnSecondaryClassName}`}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
