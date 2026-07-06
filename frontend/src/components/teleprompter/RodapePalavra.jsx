import {
  RODAPE_VERSICULO_ALTURA,
  TELEPROMPTER_ANOTACAO_BOTTOM,
  TELEPROMPTER_ANOTACAO_ICON_ALTURA,
  TELEPROMPTER_ANOTACAO_RIGHT,
  TELEPROMPTER_BARRA_INFERIOR_ALTURA,
  TELEPROMPTER_VERSICULO_LANDSCAPE_BOTTOM,
  TELEPROMPTER_VERSICULO_LANDSCAPE_MAX_WIDTH,
  TELEPROMPTER_VERSICULO_MAX_HEIGHT,
  TELEPROMPTER_VERSICULO_MAX_WIDTH,
  TELEPROMPTER_VERSICULO_RIGHT,
  TELEPROMPTER_VERSICULO_TOP,
} from '../../lib/teleprompterColunaDireita'

export {
  RODAPE_VERSICULO_ALTURA,
  TELEPROMPTER_ANOTACAO_BOTTOM,
  TELEPROMPTER_ANOTACAO_ICON_ALTURA,
  TELEPROMPTER_ANOTACAO_RIGHT,
  TELEPROMPTER_BARRA_INFERIOR_ALTURA,
  TELEPROMPTER_VERSICULO_RIGHT,
  TELEPROMPTER_VERSICULO_TOP,
}

export function RodapePalavra({ versiculo, visivel, layout = 'portrait', onDismiss }) {
  if (!visivel || !versiculo) return null

  const referencia = versiculo.referencia?.trim() || '—'
  const isLandscape = layout === 'landscape'

  const posStyle = isLandscape
    ? {
        left: '50%',
        right: 'auto',
        top: 'auto',
        bottom:
          TELEPROMPTER_BARRA_INFERIOR_ALTURA + TELEPROMPTER_VERSICULO_LANDSCAPE_BOTTOM,
        transform: 'translateX(-50%)',
        maxWidth: `min(90vw, ${TELEPROMPTER_VERSICULO_LANDSCAPE_MAX_WIDTH}px)`,
        maxHeight: 'min(28vh, 160px)',
        width: 'max-content',
      }
    : {
        top: TELEPROMPTER_VERSICULO_TOP,
        right: TELEPROMPTER_VERSICULO_RIGHT,
        maxWidth: TELEPROMPTER_VERSICULO_MAX_WIDTH,
        maxHeight: TELEPROMPTER_VERSICULO_MAX_HEIGHT,
        width: 'auto',
      }

  return (
    <footer
      data-teleprompter-versiculo
      role="button"
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation()
        onDismiss?.()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          event.stopPropagation()
          onDismiss?.()
        }
      }}
      className="fixed z-40 flex max-h-[min(50vh,320px)] cursor-pointer flex-col overflow-hidden rounded-xl border border-[var(--crash-cifra)]/50 bg-black/80 p-3 text-left shadow-2xl backdrop-blur-md transition hover:border-[var(--crash-cifra)]/70"
      style={posStyle}
      aria-live="polite"
      aria-label={`Versículo ${referencia}. Toque para fechar.`}
    >
      <p className="shrink-0 text-xs font-bold leading-snug text-[var(--crash-cifra)]">
        📖 {referencia}
      </p>
      <div className="mt-1.5 min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {versiculo.texto?.trim() ? (
          <p className="text-sm leading-snug italic text-[var(--crash-versiculo-texto,#E5E7EB)]">
            “{versiculo.texto.trim()}”
          </p>
        ) : null}
        {versiculo.palavra?.trim() ? (
          <p className="mt-1.5 text-xs leading-snug text-white/90">
            ✨ {versiculo.palavra.trim()}
          </p>
        ) : null}
      </div>
    </footer>
  )
}
