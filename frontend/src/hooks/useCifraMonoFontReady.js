import { useEffect, useState } from 'react'
import { isCifraMonoFontReady, loadCifraMonoFont } from '../lib/monoCharWidth'

/** Re-renderiza quando JetBrains Mono estiver pronta (remede charWidthPx). */
export function useCifraMonoFontReady() {
  const [ready, setReady] = useState(() => isCifraMonoFontReady())

  useEffect(() => {
    if (ready) return undefined

    let cancelled = false
    loadCifraMonoFont().then(() => {
      if (!cancelled) setReady(isCifraMonoFontReady())
    })

    return () => {
      cancelled = true
    }
  }, [ready])

  return ready
}
