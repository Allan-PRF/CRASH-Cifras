import { useEffect, useState } from 'react'
import { maxColsFromContentWidth } from '../lib/teleprompterMaxCols'

/**
 * Recalcula maxCols quando a largura do container ou a fonte mudam.
 * NÃO deve ser ligado a scroll — só ResizeObserver / resize / fonte.
 *
 * @param {() => number} getContentWidthPx
 * @param {number|null|undefined} fonteLetraPx
 * @param {{ enabled?: boolean, deps?: unknown[] }} [opts]
 * @returns {number|null}
 */
export function useContentMaxCols(getContentWidthPx, fonteLetraPx, opts = {}) {
  const { enabled = true, deps = [] } = opts
  const [maxCols, setMaxCols] = useState(null)

  useEffect(() => {
    if (!enabled || !fonteLetraPx || typeof getContentWidthPx !== 'function') {
      setMaxCols(null)
      return undefined
    }

    let lastW = -1
    let ro = null

    const update = () => {
      const w = Number(getContentWidthPx()) || 0
      if (w <= 0) return
      if (Math.abs(w - lastW) < 1 && lastW >= 0) return
      lastW = w
      setMaxCols(maxColsFromContentWidth(w, fonteLetraPx).maxCols)
    }

    update()

    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update)
      // Observa document body como sensor de layout (viewport/rotação); a largura
      // lida vem do getContentWidthPx (container real do teleprompter).
      ro.observe(document.documentElement)
    }
    window.addEventListener('resize', update)

    return () => {
      window.removeEventListener('resize', update)
      ro?.disconnect()
    }
    // deps extras (ex.: orientação) forçam reattach / re-medida do container certo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getContentWidthPx, fonteLetraPx, enabled, ...deps])

  return maxCols
}
