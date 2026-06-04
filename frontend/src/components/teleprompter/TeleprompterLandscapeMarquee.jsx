import { useEffect, useRef, useState } from 'react'
import { LinhaCifraLinha } from '../cifra/LinhaCifra'
import { LANDSCAPE_PREVIEW_FONT_SCALE } from '../../lib/teleprompterLandscapeMarquee'

/** Faixa abaixo do mini player (top 70px + ~134px altura) e acima do card bíblico. */
const LANDSCAPE_MARQUEE_TOP = 250
const LANDSCAPE_MARQUEE_BOTTOM = 100

/**
 * Letreiro horizontal (landscape): fila dupla por coluna.
 * Superior = próxima linha (menor, 60% opacidade); inferior = linha atual (destaque).
 * Ambas rolam juntas (translateX); ao sair, a superior vira inferior na coluna seguinte.
 */
export function TeleprompterLandscapeMarquee({
  blocks,
  showChords,
  showGrades,
  fonteLetra,
  tomGraus,
  onViewportWidth,
  onTrackRef,
  onClick,
}) {
  const viewportRef = useRef(null)
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 800,
  )

  const fontePreview = Math.round(fonteLetra * LANDSCAPE_PREVIEW_FONT_SCALE)

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return undefined

    const report = () => {
      const w = Math.round(el.clientWidth)
      if (w > 0) {
        setViewportWidth(w)
        onViewportWidth?.(w)
      }
    }

    report()
    const ro = new ResizeObserver(report)
    ro.observe(el)
    return () => ro.disconnect()
  }, [onViewportWidth])

  const lead = viewportWidth
  const trackWidth =
    lead + blocks.reduce((sum, b) => sum + b.width, 0) + viewportWidth

  return (
    <main
      onClick={onClick}
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
      aria-label="Letreiro landscape"
    >
      <div
        ref={viewportRef}
        className="pointer-events-auto absolute left-0 right-0 overflow-hidden"
        style={{
          top: LANDSCAPE_MARQUEE_TOP,
          bottom: LANDSCAPE_MARQUEE_BOTTOM,
        }}
      >
        <div
          ref={onTrackRef}
          className="pointer-events-auto absolute left-0 top-1/2 flex -translate-y-1/2 flex-nowrap will-change-transform"
          style={{ transform: 'translate3d(0px, -50%, 0)' }}
        >
          <div aria-hidden style={{ width: lead, flexShrink: 0 }} />
          {blocks.map((block) => (
            <div
              key={block.key}
              className="flex shrink-0 flex-col items-start justify-end gap-3 px-6"
              style={{ width: block.width }}
            >
              <div className="w-full opacity-60">
                {block.nextLine ? (
                  <LinhaCifraLinha
                    line={block.nextLine}
                    tomOriginal={tomGraus}
                    mostrarAcordes={showChords}
                    mostrarGrau={showGrades}
                    fonteLetra={fontePreview}
                  />
                ) : (
                  <div aria-hidden className="min-h-[1px]" />
                )}
              </div>
              <div className="w-full opacity-100">
                <LinhaCifraLinha
                  line={block.line}
                  tomOriginal={tomGraus}
                  mostrarAcordes={showChords}
                  mostrarGrau={showGrades}
                  fonteLetra={fonteLetra}
                />
              </div>
            </div>
          ))}
          <div aria-hidden style={{ width: viewportWidth, flexShrink: 0 }} />
        </div>
      </div>
      <span className="sr-only">
        Letreiro duplo {blocks.length} colunas, largura {trackWidth}px
      </span>
    </main>
  )
}
