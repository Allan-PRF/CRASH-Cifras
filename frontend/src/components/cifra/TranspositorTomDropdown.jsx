import { useEffect, useRef, useState } from 'react'
import { inputOrangeClassName } from '../ui/inputClasses'
import { TranspositorTom } from './TranspositorTom'
import { TomSelectorDialogShell } from './TomSelectorDialogShell'
import { useIsMobile } from '../../hooks/useIsMobile'

/**
 * Transpositor compacto: botão inline + popover flutuante.
 * @param {string|null} tomAtual
 * @param {(novoTom: string|null, opts: { transporAcordes: boolean }) => void} onApplyTom
 * @param {boolean} [perguntarTransporAcordes]
 * @param {string|null} [triggerLabel] — rótulo do botão (ex.: "Trocar o tom"); omitir mostra "Tom: X"
 */
export function TranspositorTomDropdown({
  tomAtual,
  onApplyTom,
  perguntarTransporAcordes = false,
  triggerLabel = null,
  openTrigger = 0,
}) {
  const [open, setOpen] = useState(false)
  const [pendingTom, setPendingTom] = useState(null)
  const rootRef = useRef(null)
  const isMobile = useIsMobile()

  function fechar() {
    setOpen(false)
    setPendingTom(null)
  }

  useEffect(() => {
    if (openTrigger > 0) setOpen(true)
  }, [openTrigger])

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

  function aplicar(novoTom, transporAcordes) {
    onApplyTom(novoTom, { transporAcordes })
    fechar()
  }

  function handleSelectTom(novoTom) {
    if (novoTom === tomAtual) {
      fechar()
      return
    }

    const precisaConfirmar =
      perguntarTransporAcordes && tomAtual && novoTom

    if (precisaConfirmar) {
      setPendingTom(novoTom)
      return
    }

    aplicar(novoTom, false)
  }

  function handleClear() {
    if (!tomAtual) {
      fechar()
      return
    }
    aplicar(null, false)
  }

  const labelTom = tomAtual || '—'

  const popoverClass =
    'absolute left-0 right-0 z-50 mt-1 max-h-[min(70svh,28rem)] overflow-y-auto rounded-xl border border-orange-500 bg-black p-4 shadow-2xl shadow-black/80 sm:left-0 sm:right-auto sm:w-[min(100vw-2rem,22rem)]'

  function renderDialogContent() {
    if (pendingTom) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-white">Transpor acordes automaticamente?</p>
          <p className="text-xs text-[var(--crash-texto-sec)]">
            {tomAtual} → <span className="text-[var(--crash-cifra)]">{pendingTom}</span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => aplicar(pendingTom, true)}
              className="flex-1 rounded-lg bg-[var(--crash-cifra)] px-3 py-2 text-sm font-semibold text-black transition hover:opacity-90"
            >
              Sim
            </button>
            <button
              type="button"
              onClick={() => aplicar(pendingTom, false)}
              className="flex-1 rounded-lg border border-[var(--crash-borda)] px-3 py-2 text-sm font-medium text-white transition hover:border-[var(--crash-cifra)]"
            >
              Não
            </button>
          </div>
          <button
            type="button"
            onClick={() => setPendingTom(null)}
            className="w-full text-xs text-[var(--crash-texto-sec)] hover:text-white"
          >
            ← Voltar
          </button>
        </div>
      )
    }

    return (
      <TranspositorTom
        tomAtual={tomAtual}
        onSelectTom={handleSelectTom}
        permitirVazio
        onClear={handleClear}
        compacto
        mobileCompact={isMobile}
      />
    )
  }

  function renderPopover() {
    if (!open) return null

    if (isMobile) {
      return (
        <TomSelectorDialogShell
          open={open}
          onClose={fechar}
          ariaLabel="Selecionar tom original"
          borderClassName="border-orange-500/80"
        >
          {renderDialogContent()}
        </TomSelectorDialogShell>
      )
    }

    return (
      <div
        role="dialog"
        aria-label="Selecionar tom"
        data-transpor-tom-dialog
        className={popoverClass}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {renderDialogContent()}
      </div>
    )
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setPendingTom(null)
          setOpen((v) => !v)
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`${inputOrangeClassName} flex items-center justify-between gap-2 text-left hover:border-orange-400`}
      >
        {triggerLabel ? (
          <span className="font-medium text-white">{triggerLabel}</span>
        ) : (
          <span>
            Tom:{' '}
            <span className="font-semibold text-[var(--crash-cifra)]">{labelTom}</span>
          </span>
        )}
        <span
          className={`text-xs text-[var(--crash-texto-sec)] transition ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          ▼
        </span>
      </button>

      {renderPopover()}
    </div>
  )
}
