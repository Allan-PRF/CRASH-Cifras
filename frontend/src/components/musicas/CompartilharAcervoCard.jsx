import { FormField } from '../ui/FormField'
import { btnCifraOutlineClassName, inputClassName } from '../ui/inputClasses'

/**
 * Publicação explícita no acervo (não roda no Salvar da cópia pessoal).
 * - jaNoAcervo: envia correção/aceitação na versão já ligada
 * - senão: primeira publicação (exige YouTube para fonte_url do atalho)
 */
export function CompartilharAcervoCard({
  disabled,
  sharing,
  onCompartilhar,
  jaNoAcervo = false,
  precisaYoutube = false,
  youtubeUrl = '',
  onYoutubeUrlChange,
}) {
  return (
    <div className="rounded-xl border border-[var(--crash-cifra)]/35 bg-[var(--crash-cifra)]/5 p-4">
      <h3 className="text-sm font-semibold text-[var(--crash-cifra)]">
        {jaNoAcervo ? 'Compartilhar com a comunidade' : 'Salvar no acervo da comunidade'}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--crash-texto-sec)]">
        {jaNoAcervo
          ? 'Envia a cifra atual desta tela como versão de correção no acervo — só quando você decidir que está pronta. Não substitui o “Salvar minha cópia”.'
          : 'Publica esta cifra no acervo da comunidade usando o link do YouTube como chave. Quem importar o mesmo vídeo depois recebe o atalho, sem passar pelo motor.'}
      </p>
      {precisaYoutube ? (
        <div className="mt-3">
          <FormField
            label="Link do YouTube"
            hint="Obrigatório para o atalho da comunidade."
          >
            <input
              className={inputClassName}
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://www.youtube.com/watch?v=…"
              value={youtubeUrl}
              disabled={disabled || sharing}
              onChange={(e) => onYoutubeUrlChange?.(e.target.value)}
            />
          </FormField>
        </div>
      ) : null}
      <button
        type="button"
        onClick={onCompartilhar}
        disabled={disabled || sharing || (precisaYoutube && !String(youtubeUrl || '').trim())}
        className={`mt-3 w-full ${btnCifraOutlineClassName}`}
      >
        {sharing
          ? 'Compartilhando…'
          : jaNoAcervo
            ? 'Compartilhar com a comunidade'
            : 'Salvar no acervo da comunidade'}
      </button>
    </div>
  )
}
