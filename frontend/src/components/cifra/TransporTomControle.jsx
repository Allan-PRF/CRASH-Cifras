import { useEffect, useRef, useState } from 'react'
import { TranspositorTom } from './TranspositorTom'
import { TomSelectorDialogShell } from './TomSelectorDialogShell'
import { getTomExibido, semitonesBetween } from '../../lib/transpose'
import { useIsMobile } from '../../hooks/useIsMobile'

/**
 * Seletor de tom com popover — folha de edição ou teleprompter (só visual, não persiste).
 * @param {'folha'|'teleprompter'} variant
 */
export function TransporTomControle({
  tomOriginal,
  offsetVisual,
  onOffsetVisualChange,
  tomDestino = null,
  onTomDestinoChange,
  onAplicarTom,
  variant = 'teleprompter',
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const isMobile = useIsMobile()
  const tomExibido = tomOriginal
    ? getTomExibido(tomOriginal, offsetVisual, tomDestino)
    : null
  const desabilitado = !tomOriginal
  const isFolha = variant === 'folha'
  const isTeleprompter = variant === 'teleprompter'
  const mobileModal = isMobile
  const podeAplicarTom =
    isFolha &&
    Boolean(onAplicarTom) &&
    Boolean(tomDestino) &&
    tomDestino !== tomOriginal

  function fechar() {
    setOpen(false)
  }

  function resetarTom() {
    onTomDestinoChange?.(null)
    onOffsetVisualChange(0)
  }

  useEffect(() => {
    if (!open || mobileModal) return

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
  }, [open, mobileModal])

  function handleSelectTom(novoTom) {
    if (!tomOriginal || !novoTom) {
      resetarTom()
      fechar()
      return
    }
    if (novoTom === tomOriginal) {
      resetarTom()
    } else {
      const st = semitonesBetween(tomOriginal, novoTom)
      onTomDestinoChange?.(novoTom)
      onOffsetVisualChange(st || 0)
    }
    fechar()
  }

  function handleTriggerClick(e) {
    e.stopPropagation()
    if (desabilitado) return
    setOpen((v) => !v)
  }

  const triggerClass = isTeleprompter
    ? 'inline-flex min-h-10 items-center gap-1.5 rounded-lg border-2 border-[var(--crash-cifra)] bg-[var(--crash-cifra)]/15 px-3 py-1.5 text-sm font-bold text-[var(--crash-cifra)] shadow-sm transition hover:bg-[var(--crash-cifra)]/25 disabled:cursor-not-allowed disabled:opacity-40'
    : 'inline-flex items-center gap-2 rounded-lg border border-[var(--crash-borda)] bg-black px-3 py-1.5 text-sm font-semibold text-white transition hover:border-[var(--crash-cifra)] disabled:cursor-not-allowed disabled:opacity-40'

  const popoverClass = isTeleprompter
    ? 'absolute right-0 z-[80] mt-1 max-h-[min(70svh,28rem)] w-[min(calc(100vw-1rem),22rem)] overflow-y-auto rounded-xl border-2 border-[var(--crash-cifra)]/50 bg-black p-4 shadow-2xl shadow-black'
    : 'absolute left-0 z-50 mt-1 max-h-[min(70svh,28rem)] w-[min(100vw-2rem,22rem)] overflow-y-auto rounded-xl border border-[var(--crash-cifra)]/40 bg-black p-4 shadow-2xl shadow-black/80'

  function renderPopover() {
    if (!open || desabilitado) return null

    const grade = (
      <TranspositorTom
        tomAtual={tomExibido}
        onSelectTom={handleSelectTom}
        compacto
        mobileCompact={mobileModal}
      />
    )

    if (mobileModal) {
      return (
        <TomSelectorDialogShell open={open} onClose={fechar} ariaLabel="Selecionar tom de execução">
          {grade}
        </TomSelectorDialogShell>
      )
    }

    return (
      <div
        role="dialog"
        aria-label="Selecionar tom de execução"
        data-transpor-tom-dialog
        className={popoverClass}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {grade}
      </div>
    )
  }

  const originalButtonClass = isTeleprompter
    ? 'rounded-lg border border-[var(--crash-cifra)]/60 bg-black/80 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:border-[var(--crash-cifra)] hover:text-[var(--crash-cifra)]'
    : 'rounded-lg border border-[var(--crash-borda)] px-2.5 py-1 text-xs font-medium text-white transition hover:border-[var(--crash-cifra)]'

  const content = (
    <>
      {isFolha && (
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--crash-texto-sec)]">
          Ver em
        </span>
      )}

      <div className="relative">
        <button
          type="button"
          disabled={desabilitado}
          onClick={handleTriggerClick}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={
            tomExibido
              ? `Tom de execução: ${tomExibido}. Clique para transpor`
              : 'Tom indisponível'
          }
          className={triggerClass}
        >
          {isTeleprompter && (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-white/80">
              Tom
            </span>
          )}
          <span className={isTeleprompter ? 'text-base' : 'text-[var(--crash-cifra)]'}>
            {tomExibido || '—'}
          </span>
          <span
            className={`text-xs text-white/70 transition ${open ? 'rotate-180' : ''}`}
            aria-hidden
          >
            ▼
          </span>
        </button>

        {renderPopover()}
      </div>

      {offsetVisual !== 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            resetarTom()
          }}
          className={originalButtonClass}
        >
          Original
        </button>
      )}

      {podeAplicarTom && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onAplicarTom()
          }}
          className="rounded-lg bg-[var(--crash-cifra)] px-3 py-1.5 text-xs font-semibold text-black transition hover:opacity-90"
        >
          Aplicar tom
        </button>
      )}

      {desabilitado && isFolha && (
        <span className="text-xs text-[var(--crash-texto-sec)]">
          Tom de referência indisponível para esta música.
        </span>
      )}
    </>
  )

  if (isFolha) {
    return (
      <div
        ref={rootRef}
        className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-[var(--crash-borda)]/80 bg-white/[0.03] px-3 py-2.5 ${className}`}
        role="group"
        aria-label="Transposição visual da folha"
      >
        {content}
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className={`flex shrink-0 items-center gap-2 ${className}`}
      role="group"
      aria-label="Transposição de execução"
    >
      {content}
    </div>
  )
}
