import { btnCifraConfirmClassName, btnSecondaryClassName } from '../ui/inputClasses'

/**
 * YouTube do publish aponta para entrada com título/artista divergente.
 * Backend exige confirmar_mesmo_link para gravar.
 */
export function ConfirmPublishTituloModal({
  open,
  entradaRotulo,
  copiaRotulo,
  onCorrigirLink,
  onPublicarMesmoAssim,
  onClose,
  confirming = false,
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-publish-titulo-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-[var(--crash-fundo-card)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-publish-titulo-title" className="text-lg font-bold text-white">
          Link aponta para outra música?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--crash-texto-sec)]">
          O link aponta para{' '}
          <span className="font-semibold text-white">«{entradaRotulo || '—'}»</span>, mas
          sua música chama{' '}
          <span className="font-semibold text-white">«{copiaRotulo || '—'}»</span>.
          Publicar mesmo assim ou corrigir o link?
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            onClick={onCorrigirLink}
            disabled={confirming}
            className={btnSecondaryClassName}
          >
            Corrigir o link
          </button>
          <button
            type="button"
            onClick={onPublicarMesmoAssim}
            disabled={confirming}
            className={btnCifraConfirmClassName}
          >
            {confirming ? 'Publicando…' : 'É a mesma música, publicar'}
          </button>
        </div>
      </div>
    </div>
  )
}
