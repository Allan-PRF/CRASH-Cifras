/** Fonte monoespaçada da cifra (letra, acorde, grau) — não usar na UI geral. */
export const MONO =
  '"JetBrains Mono", ui-monospace, Consolas, "Liberation Mono", "Courier New", monospace'

const FONT_LOAD_SPECS = [
  '400 16px "JetBrains Mono"',
  '600 16px "JetBrains Mono"',
  '700 16px "JetBrains Mono"',
]

let loadPromise = null

/** Carrega JetBrains Mono (400/600/700) antes de medir ou exibir a cifra. */
export function loadCifraMonoFont() {
  if (typeof document === 'undefined') return Promise.resolve()
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    try {
      if (document.fonts?.load) {
        await Promise.allSettled(FONT_LOAD_SPECS.map((spec) => document.fonts.load(spec)))
      }
      if (document.fonts?.ready) {
        await document.fonts.ready
      }
    } catch {
      /* fallback: stack monospace do sistema */
    }
  })()

  return loadPromise
}

export function isCifraMonoFontReady() {
  if (typeof document === 'undefined') return true
  try {
    return (
      document.fonts.check('400 16px "JetBrains Mono"') &&
      document.fonts.check('700 16px "JetBrains Mono"')
    )
  } catch {
    return false
  }
}

function monoFamilyForCanvas() {
  return isCifraMonoFontReady() ? '"JetBrains Mono", monospace' : MONO
}

/** Fallback: ~9.6px @ font-size 16px (400), ~10px @ 700 bold */
export function measureMonoCharWidth(fontSizePx, fontWeight = 400) {
  const fallback = fontSizePx * 0.6
  if (typeof document === 'undefined') return fallback

  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return fallback
    ctx.font = `${fontWeight} ${fontSizePx}px ${monoFamilyForCanvas()}`
    const w = ctx.measureText('0').width
    return w > 0 ? w : fallback
  } catch {
    return fallback
  }
}
