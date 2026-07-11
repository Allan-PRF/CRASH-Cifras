import { useEffect, useRef, useState } from 'react'
import { TranspositorTom } from './TranspositorTom'
import { TomSelectorDialogShell } from './TomSelectorDialogShell'
import { getTomExibido, semitonesBetween } from '../../lib/transpose'
import { useIsMobile } from '../../hooks/useIsMobile'
import { btnCifraOutlineClassName } from '../ui/inputClasses'

/**
 * Controle único na edição: preview (Ver em) + Aplicar tom + correção de referência.
 */
export function TomEdicaoUnificado({
  tomOriginal,
  offsetVisual,
  onOffsetVisualChange,
  tomDestino,
  onTomDestinoChange,
  onAplicarTom,
  onCorrigirReferencia,
  openTrigger = 0,
  referenciaModeTrigger = 0,
}) {
  const [open, setOpen] = useState(false)
  const [modo, setModo] = useState('preview')
  const rootRef = useRef(null)
  const isMobile = useIsMobile()
  const desabilitado = !tomOriginal

  const tomExibido = tomOriginal
    ? getTomExibido(tomOriginal, offsetVisual, tomDestino)
    : null

  const podeAplicarTom =
    Boolean(onAplicarTom) && Boolean(tomDestino) && tomDestino !== tomOriginal

  function fechar() {
    setOpen(false)
    setModo('preview')
  }

  function resetarPreview() {
    onTomDestinoChange?.(null)
    onOffsetVisualChange?.(0)
  }

  useEffect(() => {
    if (openTrigger > 0) {
      setModo('preview')
      setOpen(true)
    }
  }, [openTrigger])

  useEffect(() => {
    if (referenciaModeTrigger > 0) {
      setModo('referencia')
      setOpen(true)
    }
  }, [referenciaModeTrigger])

  useEffect(() => {
    if (!open || isMobile) return

    function onPointerDown(e) {
      if (e.target.closest?.('[data-transpor-tom-dialog]')) return
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        fechar()
      }
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') fechar()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, isMobile])

  function handleSelectPreview(novoTom) {
    if (!tomOriginal || !novoTom) {
      resetarPreview()
      fechar()
      return
    }
    if (novoTom === tomOriginal) {
      resetarPreview()
    } else {
      const st = semitonesBetween(tomOriginal, novoTom)
      onTomDestinoChange?.(novoTom)
      onOffsetVisualChange?.(st || 0)
    }
    fechar()
  }

  function handleSelectReferencia(novoTom) {
    if (!novoTom) return
    onCorrigirReferencia?.(novoTom)
    fechar()
  }

  const popoverClass =
    'absolute right-0 z-50 mt-1 max-h-[min(70svh,32rem)] w-[min(100vw-2rem,22rem)] overflow-y-auto rounded-xl border border-orange-500/80 bg-black p-4 shadow-2xl shadow-black/80'

  function renderGrade() {
    if (modo === 'referencia') {
      return (
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-[var(--crash-texto-sec)]">
            Corrigir tom de referência (não reescreve acordes)
          </p>
          <TranspositorTom
            tomAtual={tomOriginal}
            onSelectTom={handleSelectReferencia}
            compacto
            mobileCompact={isMobile}
          />
          <button
            type="button"
            onClick={() => setModo('preview')}
            className="w-full text-xs text-[var(--crash-texto-sec)] hover:text-white"
          >
            ← Voltar ao preview
          </button>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        <TranspositorTom
          tomAtual={tomExibido}
          onSelectTom={handleSelectPreview}
          compacto
          mobileCompact={isMobile}
        />

        {(offsetVisual !== 0 || podeAplicarTom) && (
          <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
            {offsetVisual !== 0 && (
              <button
                type="button"
                onClick={() => {
                  resetarPreview()
                }}
                className="rounded-lg border border-[var(--crash-borda)] px-2.5 py-1 text-xs font-medium text-white transition hover:border-[var(--crash-cifra)]"
              >
                Original
              </button>
            )}
            {podeAplicarTom && (
              <button
                type="button"
                onClick={() => {
                  onAplicarTom()
                  fechar()
                }}
                className="rounded-lg bg-[var(--crash-cifra)] px-3 py-1.5 text-xs font-semibold text-black transition hover:opacity-90"
              >
                Aplicar tom
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setModo('referencia')}
          className="w-full border-t border-white/10 pt-3 text-left text-xs text-[var(--crash-texto-sec)] underline-offset-2 hover:text-white hover:underline"
        >
          Corrigir tom de referência (não reescreve acordes)
        </button>
      </div>
    )
  }

  function renderPopover() {
    if (!open || desabilitado) return null

    if (isMobile) {
      return (
        <TomSelectorDialogShell
          open={open}
          onClose={fechar}
          ariaLabel={modo === 'referencia' ? 'Corrigir tom de referência' : 'Selecionar tom'}
          borderClassName="border-orange-500/80"
        >
          {renderGrade()}
        </TomSelectorDialogShell>
      )
    }

    return (
      <div
        role="dialog"
        aria-label="Tom da edição"
        data-transpor-tom-dialog
        className={popoverClass}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {renderGrade()}
      </div>
    )
  }

  const labelTom = tomExibido || tomOriginal || '—'

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        disabled={desabilitado}
        onClick={() => {
          setModo('preview')
          setOpen((v) => !v)
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`${btnCifraOutlineClassName} inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:px-3 sm:text-sm`}
      >
        <span>
          Tom:{' '}
          <span className="font-semibold text-[var(--crash-cifra)]">{labelTom}</span>
        </span>
        <span
          className={`text-[10px] text-[var(--crash-texto-sec)] transition ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          ▼
        </span>
      </button>

      {renderPopover()}
    </div>
  )
}
