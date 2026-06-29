import { btnCifraOutlineClassName } from './inputClasses'

export function InfoModal({ open, title, message, closeLabel = 'Entendi', onClose }) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--crash-cifra)]/40 bg-[var(--crash-fundo-card)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="info-modal-title" className="text-lg font-bold text-[var(--crash-cifra)]">
          {title}
        </h2>
        {message && (
          <p className="mt-3 text-sm leading-relaxed text-[var(--crash-texto-sec)]">{message}</p>
        )}
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className={btnCifraOutlineClassName}>
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
