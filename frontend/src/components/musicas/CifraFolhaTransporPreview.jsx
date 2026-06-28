import { useEffect, useRef, useState } from 'react'
import { TranspositorTom } from '../cifra/TranspositorTom'
import { getTomExibido, semitonesBetween } from '../../lib/transpose'

/**
 * Transposição só visual na folha — popover com TranspositorTom (maiores + menores).
 */
export function CifraFolhaTransporPreview({
  tomOriginal,
  offsetVisual,
  onOffsetVisualChange,
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const tomExibido = tomOriginal ? getTomExibido(tomOriginal, offsetVisual) : null
  const desabilitado = !tomOriginal

  function fechar() {
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return

    function onPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        fechar()
      }
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') fechar()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function handleSelectTom(novoTom) {
    if (!tomOriginal || !novoTom) {
      onOffsetVisualChange(0)
      fechar()
      return
    }
    if (novoTom === tomOriginal) {
      onOffsetVisualChange(0)
    } else {
      const st = semitonesBetween(tomOriginal, novoTom)
      onOffsetVisualChange(st || 0)
    }
    fechar()
  }

  return (
    <div
      ref={rootRef}
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-[var(--crash-borda)]/80 bg-white/[0.03] px-3 py-2.5"
      role="group"
      aria-label="Transposição visual da folha"
    >
      <span className="text-xs font-medium uppercase tracking-wider text-[var(--crash-texto-sec)]">
        Ver em
      </span>

      <div className="relative">
        <button
          type="button"
          disabled={desabilitado}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--crash-borda)] bg-black px-3 py-1.5 text-sm font-semibold text-white transition hover:border-[var(--crash-cifra)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="text-[var(--crash-cifra)]">{tomExibido || '—'}</span>
          <span
            className={`text-xs text-[var(--crash-texto-sec)] transition ${open ? 'rotate-180' : ''}`}
            aria-hidden
          >
            ▼
          </span>
        </button>

        {open && !desabilitado && (
          <div
            role="dialog"
            aria-label="Selecionar tom para visualização"
            className="absolute left-0 z-50 mt-1 max-h-[min(70svh,28rem)] w-[min(100vw-2rem,22rem)] overflow-y-auto rounded-xl border border-[var(--crash-cifra)]/40 bg-black p-4 shadow-2xl shadow-black/80"
          >
            <TranspositorTom
              tomAtual={tomExibido}
              onSelectTom={handleSelectTom}
              compacto
            />
          </div>
        )}
      </div>

      {offsetVisual !== 0 ? (
        <button
          type="button"
          onClick={() => onOffsetVisualChange(0)}
          className="rounded-lg border border-[var(--crash-borda)] px-2.5 py-1 text-xs font-medium text-white transition hover:border-[var(--crash-cifra)]"
        >
          Original
        </button>
      ) : null}

      {desabilitado ? (
        <span className="text-xs text-[var(--crash-texto-sec)]">
          Tom de referência indisponível para esta música.
        </span>
      ) : null}
    </div>
  )
}
