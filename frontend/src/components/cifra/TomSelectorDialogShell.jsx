import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Modal centralizado para seleção de tom no mobile — evita corte por overflow dos pais.
 */
export function TomSelectorDialogShell({ open, onClose, ariaLabel, children, borderClassName = 'border-[var(--crash-cifra)]/50' }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      data-transpor-tom-dialog
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        data-transpor-tom-dialog
        className={`max-h-[min(90dvh,36rem)] w-full max-w-[22rem] overflow-y-auto overscroll-contain rounded-xl border-2 bg-black p-3 shadow-2xl shadow-black ${borderClassName}`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
