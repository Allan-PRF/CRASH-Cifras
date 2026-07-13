import { btnCifraOutlineClassName } from '../ui/inputClasses'

/**
 * Publicação explícita no acervo (não roda no Salvar da cópia pessoal).
 */
export function CompartilharAcervoCard({ disabled, sharing, onCompartilhar }) {
  return (
    <div className="rounded-xl border border-[var(--crash-cifra)]/35 bg-[var(--crash-cifra)]/5 p-4">
      <h3 className="text-sm font-semibold text-[var(--crash-cifra)]">
        Compartilhar com a comunidade
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--crash-texto-sec)]">
        Envia a cifra atual desta tela como versão de correção no acervo da comunidade —
        só quando você decidir que está pronta. Não substitui o “Salvar minha cópia”.
      </p>
      <button
        type="button"
        onClick={onCompartilhar}
        disabled={disabled || sharing}
        className={`mt-3 w-full ${btnCifraOutlineClassName}`}
      >
        {sharing ? 'Compartilhando…' : 'Compartilhar com a comunidade'}
      </button>
    </div>
  )
}
