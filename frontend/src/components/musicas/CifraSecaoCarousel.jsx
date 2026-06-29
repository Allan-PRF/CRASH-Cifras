import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { FUNCIONALIDADE_TOOLTIPS } from '../../lib/funcionalidadeTooltips'
import { InfoTooltip } from '../ui/InfoTooltip'

const SWIPE_THRESHOLD = 48
const SLIDE_MIN_HEIGHT = '7rem'
const HEIGHT_TRANSITION_MS = 300
const FADE_TRANSITION_MS = 220

const navButtonClassDefault =
  'absolute inset-y-0 z-10 hidden items-center sm:flex'

const navButtonInnerClassDefault =
  'rounded-full border border-[var(--crash-borda)] bg-black/80 p-2 text-white transition hover:bg-black disabled:opacity-25'

const navButtonClassTeleprompter =
  'absolute inset-y-0 z-10 flex items-center'

const navButtonInnerClassTeleprompter =
  'rounded-full border-2 border-[var(--crash-cifra)] bg-black/90 px-3 py-2 text-xl font-bold text-[var(--crash-cifra)] shadow-lg transition hover:bg-[var(--crash-cifra)]/15 disabled:opacity-25'

export function CifraSecaoCarousel({
  secoes,
  renderSlide,
  activeIndex: controlledIndex,
  onActiveIndexChange,
  variant = 'default',
  disableKeyboard = false,
}) {
  const isTeleprompter = variant === 'teleprompter'
  const [internalIndex, setInternalIndex] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(null)
  const [slideVisible, setSlideVisible] = useState(true)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const activeSlideRef = useRef(null)
  const fadeTimerRef = useRef(null)

  const index =
    controlledIndex != null ? controlledIndex : internalIndex

  const setIndex = useCallback(
    (next) => {
      const clamped = Math.max(0, Math.min(secoes.length - 1, next))
      if (clamped === index) return
      if (controlledIndex == null) setInternalIndex(clamped)
      onActiveIndexChange?.(clamped)
    },
    [controlledIndex, index, onActiveIndexChange, secoes.length],
  )

  useEffect(() => {
    if (index >= secoes.length && secoes.length > 0) {
      setIndex(secoes.length - 1)
    }
  }, [index, secoes.length, setIndex])

  useEffect(() => {
    if (disableKeyboard) return undefined

    function onKeyDown(e) {
      if (e.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return
      if (e.key === 'ArrowLeft') setIndex(index - 1)
      if (e.key === 'ArrowRight') setIndex(index + 1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [disableKeyboard, index, setIndex])

  useEffect(() => {
    setSlideVisible(false)
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    fadeTimerRef.current = setTimeout(() => {
      setSlideVisible(true)
    }, 40)
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    }
  }, [index])

  useLayoutEffect(() => {
    const el = activeSlideRef.current
    if (!el) return undefined

    function syncHeight() {
      setViewportHeight(el.offsetHeight)
    }

    syncHeight()
    const ro = new ResizeObserver(syncHeight)
    ro.observe(el)
    return () => ro.disconnect()
  }, [index, secoes])

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e) {
    if (touchStartX.current == null || touchStartY.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    touchStartX.current = null
    touchStartY.current = null
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return
    if (dx > 0) setIndex(index - 1)
    else setIndex(index + 1)
  }

  if (!secoes.length) return null

  const canPrev = index > 0
  const canNext = index < secoes.length - 1
  const multi = secoes.length > 1
  const navButtonClass = isTeleprompter ? navButtonClassTeleprompter : navButtonClassDefault
  const navButtonInnerClass = isTeleprompter
    ? navButtonInnerClassTeleprompter
    : navButtonInnerClassDefault
  const slideMinHeight = isTeleprompter ? 'min(50svh, 24rem)' : SLIDE_MIN_HEIGHT
  const horizontalPad = isTeleprompter
    ? multi
      ? 'px-11 sm:px-14'
      : ''
    : multi
      ? 'sm:px-9'
      : ''

  return (
    <div className={`select-none ${isTeleprompter ? 'w-full' : ''}`}>
      <div
        className={`relative overflow-x-hidden touch-pan-y ${horizontalPad}`}
        style={{
          minHeight: slideMinHeight,
          height: viewportHeight != null ? viewportHeight : 'auto',
          transition: `height ${HEIGHT_TRANSITION_MS}ms ease-out`,
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {multi && (
          <>
            <button
              type="button"
              aria-label="Seção anterior"
              disabled={!canPrev}
              onClick={() => setIndex(index - 1)}
              className={`${navButtonClass} ${isTeleprompter ? 'left-0' : 'left-0 pl-0.5'}`}
            >
              <span className={navButtonInnerClass} aria-hidden>
                ‹
              </span>
            </button>
            <button
              type="button"
              aria-label="Próxima seção"
              disabled={!canNext}
              onClick={() => setIndex(index + 1)}
              className={`${navButtonClass} ${isTeleprompter ? 'right-0' : 'right-0 pr-0.5'}`}
            >
              <span className={navButtonInnerClass} aria-hidden>
                ›
              </span>
            </button>
          </>
        )}

        <div className="grid [&>*]:col-start-1 [&>*]:row-start-1">
          {secoes.map((sec, i) => {
            const isActive = i === index
            return (
              <div
                key={sec.id || i}
                ref={isActive ? activeSlideRef : undefined}
                aria-hidden={!isActive}
                className={`w-full px-0.5 ${
                  isActive
                    ? 'relative z-[1]'
                    : 'pointer-events-none invisible absolute inset-x-0 top-0 opacity-0'
                }`}
                style={
                  isActive
                    ? {
                        opacity: slideVisible ? 1 : 0,
                        transition: `opacity ${FADE_TRANSITION_MS}ms ease-out`,
                      }
                    : undefined
                }
              >
                {renderSlide(sec, i)}
              </div>
            )
          })}
        </div>
      </div>

      {multi && (
        <div
          className={`flex items-center justify-center gap-1.5 ${isTeleprompter ? 'mt-6' : 'mt-4'}`}
          role="tablist"
          aria-label="Seções da música"
        >
          {!isTeleprompter && (
            <InfoTooltip
              text={FUNCIONALIDADE_TOOLTIPS.barraBlocos}
              label="Sobre a barra de seções"
            />
          )}
          {secoes.map((sec, i) => (
            <button
              key={sec.id || i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={sec.nome || `Seção ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`rounded-full transition-all ${
                isTeleprompter
                  ? i === index
                    ? 'h-2.5 w-8 bg-[var(--crash-cifra)]'
                    : 'h-2.5 w-2.5 bg-white/25 hover:bg-white/40'
                  : i === index
                    ? 'h-2 w-6 bg-[var(--crash-cifra)]'
                    : 'h-2 w-2 bg-[var(--crash-borda)] hover:bg-[var(--crash-texto-sec)]'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
