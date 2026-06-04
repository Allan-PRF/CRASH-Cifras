const MONO =
  'ui-monospace, Consolas, "Liberation Mono", "Courier New", monospace'

/** Fallback: ~9.6px @ font-size 16px (400), ~10px @ 700 bold */
export function measureMonoCharWidth(fontSizePx, fontWeight = 400) {
  const fallback = fontSizePx * 0.6
  if (typeof document === 'undefined') return fallback

  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return fallback
    ctx.font = `${fontWeight} ${fontSizePx}px ${MONO}`
    const w = ctx.measureText('0').width
    return w > 0 ? w : fallback
  } catch {
    return fallback
  }
}

export { MONO }
