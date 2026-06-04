import {
  TELEPROMPTER_ANOTACAO_BOTTOM,
  TELEPROMPTER_ANOTACAO_ICON_ALTURA,
  TELEPROMPTER_ANOTACAO_RIGHT,
} from '../../lib/teleprompterColunaDireita'

/** Painel discreto de leitura (teleprompter) — só abre ao clicar no ícone. */
export function AnotacaoPainelLeitura({ open, conteudo, onClose }) {
  if (!open) return null

  const texto = String(conteudo || '').trim()

  return (
    <>
      <button
        type="button"
        aria-label="Fechar anotações"
        className="fixed inset-0 z-[55] bg-black/50"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="anotacao-painel-titulo"
        className="fixed z-[60] max-h-[min(40vh,18rem)] w-[min(calc(100vw-6rem),22rem)] overflow-y-auto rounded-xl border border-white/15 bg-black/90 p-4 text-sm text-white shadow-2xl backdrop-blur-md"
        style={{
          bottom:
            TELEPROMPTER_ANOTACAO_BOTTOM + TELEPROMPTER_ANOTACAO_ICON_ALTURA + 8,
          right: TELEPROMPTER_ANOTACAO_RIGHT,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 id="anotacao-painel-titulo" className="text-sm font-semibold text-white">
            📝 Anotações
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md px-2 py-0.5 text-[var(--crash-texto-sec)] hover:bg-white/10 hover:text-white"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <p className="mt-3 whitespace-pre-wrap leading-relaxed text-white/95">
          {texto || (
            <span className="text-[var(--crash-texto-sec)]">Nenhuma anotação nesta música.</span>
          )}
        </p>
      </aside>
    </>
  )
}
