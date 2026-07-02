import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { btnPrimaryClassName, btnSecondaryClassName } from '../ui/inputClasses'
import { copiarMusica } from '../../services/musicas'

const MOBILE_MAX_WIDTH = 639
const POPOVER_WIDTH = 288
const VIEWPORT_PAD = 12

function useIsMobile() {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`)
    const update = () => setMobile(mq.matches)
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return mobile
}

function computePopoverStyle(anchorEl) {
  if (!anchorEl) {
    return {
      top: VIEWPORT_PAD,
      left: VIEWPORT_PAD,
      width: Math.min(POPOVER_WIDTH, window.innerWidth - VIEWPORT_PAD * 2),
      maxHeight: window.innerHeight - VIEWPORT_PAD * 2,
    }
  }

  const rect = anchorEl.getBoundingClientRect()
  const width = Math.min(POPOVER_WIDTH, window.innerWidth - VIEWPORT_PAD * 2)
  const maxHeight = Math.min(320, window.innerHeight - VIEWPORT_PAD * 2)

  let top = rect.bottom + 8
  if (top + maxHeight > window.innerHeight - VIEWPORT_PAD) {
    top = Math.max(VIEWPORT_PAD, rect.top - maxHeight - 8)
  }

  let left = rect.left
  if (left + width > window.innerWidth - VIEWPORT_PAD) {
    left = window.innerWidth - width - VIEWPORT_PAD
  }
  left = Math.max(VIEWPORT_PAD, left)

  return { top, left, width, maxHeight }
}

function ListaMinistros({ opcoes, onSelect }) {
  if (opcoes.length === 0) {
    return (
      <p className="px-3 py-4 text-sm text-[var(--crash-texto-sec)]">
        Crie outro ministro para compartilhar músicas entre pastas.
      </p>
    )
  }

  return (
    <ul className="max-h-[min(280px,50vh)] overflow-y-auto overscroll-contain py-1">
      {opcoes.map((m) => (
        <li key={m.id}>
          <button
            type="button"
            onClick={() => onSelect(m)}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-white transition hover:bg-[var(--crash-cifra)]/10"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--crash-cifra)]/15 text-xs font-bold text-[var(--crash-cifra)]">
              {m.nome.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 truncate font-medium">{m.nome}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function PainelConfirmacao({ musica, ministro, loading, error, onCancel, onConfirm }) {
  return (
    <div className="space-y-4 p-4">
      <p className="text-sm leading-relaxed text-white">
        Importar{' '}
        <span className="font-semibold text-[var(--crash-cifra)]">{musica.titulo}</span> para o
        ministro <span className="font-semibold">{ministro.nome}</span>?
      </p>
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className={`flex-1 ${btnSecondaryClassName}`}
        >
          Não
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`flex-1 ${btnPrimaryClassName}`}
        >
          {loading ? 'Copiando…' : 'Sim'}
        </button>
      </div>
    </div>
  )
}

export function CompartilharMusicaPopover({
  open,
  musica,
  anchorEl,
  ministros,
  ministroAtualId,
  onClose,
  onCopied,
}) {
  const isMobile = useIsMobile()
  const panelRef = useRef(null)
  const [step, setStep] = useState('list')
  const [ministroDestino, setMinistroDestino] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [popoverStyle, setPopoverStyle] = useState(null)

  const opcoes = useMemo(
    () => ministros.filter((m) => m.id !== ministroAtualId),
    [ministros, ministroAtualId],
  )

  const reposition = useCallback(() => {
    if (isMobile || !open) return
    setPopoverStyle(computePopoverStyle(anchorEl))
  }, [anchorEl, isMobile, open])

  useEffect(() => {
    if (!open) return
    setStep('list')
    setMinistroDestino(null)
    setLoading(false)
    setError('')
  }, [open, musica?.id])

  useLayoutEffect(() => {
    reposition()
  }, [reposition, step])

  useEffect(() => {
    if (!open || isMobile) return
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open, isMobile, reposition])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(t)
  }, [toast])

  async function handleConfirm() {
    if (!musica || !ministroDestino) return
    setLoading(true)
    setError('')
    try {
      const copia = await copiarMusica(musica.id, { ministroIdDestino: ministroDestino.id })
      onCopied?.(copia)
      setToast(`Música copiada para ${ministroDestino.nome}`)
      onClose()
    } catch (err) {
      setError(err.message || 'Não foi possível copiar a música.')
    } finally {
      setLoading(false)
    }
  }

  if (typeof document === 'undefined') return null

  const toastNode =
    toast &&
    createPortal(
      <div
        className="fixed bottom-6 left-1/2 z-[100] max-w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-[var(--crash-cifra)]/50 bg-zinc-900 px-4 py-3 text-center text-sm font-medium text-white shadow-xl"
        role="status"
      >
        {toast}
      </div>,
      document.body,
    )

  if (!open || !musica) {
    return toastNode
  }

  const panelClass =
    'rounded-xl border border-[var(--crash-borda)] bg-[var(--crash-fundo-card)] shadow-2xl shadow-black/60'

  const header = (
    <header className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
      <p id="compartilhar-popover-title" className="text-xs font-semibold uppercase tracking-wider text-[var(--crash-cifra)]">
        {step === 'list' ? 'Copiar para…' : 'Confirmar'}
      </p>
      <button
        type="button"
        onClick={onClose}
        className="rounded-md px-2 py-0.5 text-sm text-[var(--crash-texto-sec)] hover:bg-white/10 hover:text-white"
        aria-label="Fechar"
      >
        ✕
      </button>
    </header>
  )

  const body =
    step === 'list' ? (
      <ListaMinistros
        opcoes={opcoes}
        onSelect={(m) => {
          setMinistroDestino(m)
          setStep('confirm')
          setError('')
        }}
      />
    ) : (
      <PainelConfirmacao
        musica={musica}
        ministro={ministroDestino}
        loading={loading}
        error={error}
        onCancel={() => {
          setStep('list')
          setMinistroDestino(null)
          setError('')
        }}
        onConfirm={handleConfirm}
      />
    )

  const overlay = createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[70] bg-black/50"
        aria-label="Fechar"
        onClick={onClose}
      />
      {isMobile ? (
        <div
          ref={panelRef}
          className={`fixed inset-x-0 bottom-0 z-[71] ${panelClass} max-h-[min(70vh,520px)] overflow-hidden`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="compartilhar-popover-title"
        >
          <div className="mx-auto mb-2 mt-2 h-1 w-10 rounded-full bg-white/20" />
          {header}
          <div className="overflow-y-auto overscroll-contain">{body}</div>
        </div>
      ) : (
        <div
          ref={panelRef}
          className={`fixed z-[71] ${panelClass} overflow-hidden`}
          style={popoverStyle ?? undefined}
          role="dialog"
          aria-modal="true"
          aria-labelledby="compartilhar-popover-title"
          onClick={(e) => e.stopPropagation()}
        >
          {header}
          {body}
        </div>
      )}
    </>,
    document.body,
  )

  return (
    <>
      {overlay}
      {toastNode}
    </>
  )
}
