import { useCallback, useEffect, useRef, useState } from 'react'

const SWIPE_THRESHOLD = 48

export function CifraSecaoCarousel({
  secoes,
  renderSlide,
  activeIndex: controlledIndex,
  onActiveIndexChange,
}) {
  const [internalIndex, setInternalIndex] = useState(0)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

  const index =
    controlledIndex != null ? controlledIndex : internalIndex

  const setIndex = useCallback(
    (next) => {
      const clamped = Math.max(0, Math.min(secoes.length - 1, next))
      if (controlledIndex == null) setInternalIndex(clamped)
      onActiveIndexChange?.(clamped)
    },
    [controlledIndex, onActiveIndexChange, secoes.length],
  )

  useEffect(() => {
    if (index >= secoes.length && secoes.length > 0) {
      setIndex(secoes.length - 1)
    }
  }, [index, secoes.length, setIndex])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'ArrowLeft') setIndex(index - 1)
      if (e.key === 'ArrowRight') setIndex(index + 1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [index, setIndex])

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

  return (
    <div className="relative select-none">
      {secoes.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Seção anterior"
            disabled={!canPrev}
            onClick={() => setIndex(index - 1)}
            className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-[var(--crash-borda)] bg-black/80 p-2 text-white transition hover:bg-black disabled:opacity-25 sm:flex"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Próxima seção"
            disabled={!canNext}
            onClick={() => setIndex(index + 1)}
            className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-[var(--crash-borda)] bg-black/80 p-2 text-white transition hover:bg-black disabled:opacity-25 sm:flex"
          >
            ›
          </button>
        </>
      )}

      <div
        className="overflow-hidden touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {secoes.map((sec, i) => (
            <div key={sec.id || i} className="w-full shrink-0 px-0.5">
              {renderSlide(sec, i)}
            </div>
          ))}
        </div>
      </div>

      {secoes.length > 1 && (
        <div
          className="mt-4 flex items-center justify-center gap-1.5"
          role="tablist"
          aria-label="Seções da música"
        >
          {secoes.map((sec, i) => (
            <button
              key={sec.id || i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={sec.nome || `Seção ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === index
                  ? 'w-6 bg-[var(--crash-cifra)]'
                  : 'w-2 bg-[var(--crash-borda)] hover:bg-[var(--crash-texto-sec)]'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
