import { btnCifraConfirmClassName, btnSecondaryClassName } from '../ui/inputClasses'

/**
 * YouTube aponta para entrada soft-unpublished.
 * Confirmar reativa: anexa a nova versão e republica a mesma entrada.
 */
export function ConfirmPublishDespublicadaModal({
  open,
  entradaRotulo,
  onCancelar,
  onReativarEPublicar,
  confirming = false,
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-publish-despublicada-title"
      onClick={onCancelar}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-[var(--crash-fundo-card)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-publish-despublicada-title" className="text-lg font-bold text-white">
          Entrada despublicada
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--crash-texto-sec)]">
          «{entradaRotulo || '—'}» está despublicada — não aparece na busca nem no Explorar.
          O caminho recomendado: anexar esta cifra corrigida à mesma entrada e republicá-la.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-[var(--crash-texto-sec)]">
          Alternativa: na Curadoria, libere o YouTube dessa entrada (metadados) e publique
          como nova.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            onClick={onCancelar}
            disabled={confirming}
            className={btnSecondaryClassName}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onReativarEPublicar}
            disabled={confirming}
            className={btnCifraConfirmClassName}
          >
            {confirming ? 'Publicando…' : 'Anexar cifra e republicar'}
          </button>
        </div>
      </div>
    </div>
  )
}
