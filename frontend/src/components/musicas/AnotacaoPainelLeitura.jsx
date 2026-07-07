import {
  TELEPROMPTER_ANOTACAO_BOTTOM,
  TELEPROMPTER_ANOTACAO_BOTTOM_MOBILE,
  TELEPROMPTER_ANOTACAO_ICON_ALTURA,
  TELEPROMPTER_ANOTACAO_RIGHT,
} from '../../lib/teleprompterColunaDireita'
import { useIsMobile } from '../../hooks/useIsMobile'

function SecaoAnotacao({ titulo, texto }) {
  const trimmed = String(texto || '').trim()
  if (!trimmed) return null

  return (
    <section className="mt-3 first:mt-0">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--crash-cifra)]">
        {titulo}
      </h3>
      <p className="mt-1.5 whitespace-pre-wrap leading-relaxed text-white/95">{trimmed}</p>
    </section>
  )
}

/** Painel discreto de leitura (teleprompter) — só abre ao clicar no ícone. */
export function AnotacaoPainelLeitura({
  open,
  conteudo,
  conteudoEvento = '',
  conteudoPasta = '',
  onClose,
}) {
  const isMobile = useIsMobile()
  const anotacaoBottom = isMobile
    ? TELEPROMPTER_ANOTACAO_BOTTOM_MOBILE
    : TELEPROMPTER_ANOTACAO_BOTTOM

  if (!open) return null

  const evento = String(conteudoEvento || '').trim()
  const pasta = String(conteudoPasta ?? conteudo ?? '').trim()
  const temConteudo = Boolean(evento || pasta)

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
          bottom: anotacaoBottom + TELEPROMPTER_ANOTACAO_ICON_ALTURA + 8,
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
        {temConteudo ? (
          <div className="mt-3">
            <SecaoAnotacao titulo="Nota deste evento" texto={evento} />
            <SecaoAnotacao titulo="Anotação da pasta" texto={pasta} />
          </div>
        ) : (
          <p className="mt-3 whitespace-pre-wrap leading-relaxed text-[var(--crash-texto-sec)]">
            Nenhuma anotação nesta música.
          </p>
        )}
      </aside>
    </>
  )
}
