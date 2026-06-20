import { useEffect, useId, useRef, useState } from 'react'

/**
 * Ícone ℹ️ discreto — tooltip de uma frase ao toque/clique (PARTE 9.3 do adendo).
 */
export function InfoTooltip({ text, label = 'Mais informações' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const tooltipId = useId()

  useEffect(() => {
    if (!open) return undefined
    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!text?.trim()) return null

  return (
    <span ref={rootRef} className="relative inline-flex shrink-0 align-middle">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          event.preventDefault()
          setOpen((value) => !value)
        }}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs text-[var(--crash-texto-sec)] transition hover:bg-white/10 hover:text-[var(--crash-cifra)]"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
      >
        ℹ️
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute left-1/2 top-full z-[80] mt-2 w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-amber-600/30 bg-amber-950/95 px-3 py-2 text-left text-xs leading-relaxed text-amber-50 shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  )
}
