/** Escala de fonte por modo — alvo ~21px no passo default (legibilidade estilo Cifra Club). */
export const TELEPROMPTER_MOBILE_FONT_SCALE = {
  portrait: 0.62,
  fixo: 21 / 38,
  landscape: 0.4,
}

export const TELEPROMPTER_MOBILE_LINE_HEIGHT = 1.85

/** Largura de referência para ajuste proporcional (iPhone ~390px). */
const MOBILE_FONT_REF_WIDTH = 390

/** Faixa do letreiro landscape — desktop mantém 250/100 em TeleprompterLandscapeMarquee. */
export const TELEPROMPTER_HEADER_ALTURA_MOBILE = 88
export const LANDSCAPE_MARQUEE_TOP_MOBILE = TELEPROMPTER_HEADER_ALTURA_MOBILE
export const LANDSCAPE_MARQUEE_BOTTOM_MOBILE = 96

/**
 * Reduz fonte só no mobile; desktop retorna basePx sem alteração.
 * Acorde/letra/grau recebem o mesmo valor → alinhamento Cifra Club preservado.
 */
export function scaleTeleprompterFont(basePx, orientacao, isMobile) {
  if (!isMobile || !basePx) return basePx

  const scale =
    TELEPROMPTER_MOBILE_FONT_SCALE[orientacao] ??
    TELEPROMPTER_MOBILE_FONT_SCALE.portrait

  let scaled = basePx * scale

  if (typeof window !== 'undefined') {
    // Celular deitado: usar o lado curto, não a largura “larga” (vira desktop).
    const shortSide = Math.min(window.innerWidth, window.innerHeight)
    const vwFactor = Math.min(
      1.12,
      Math.max(0.88, shortSide / MOBILE_FONT_REF_WIDTH),
    )
    scaled *= vwFactor
  }

  return Math.max(12, Math.round(scaled))
}

export function teleprompterLineHeightRatio(isMobile) {
  return isMobile ? TELEPROMPTER_MOBILE_LINE_HEIGHT : 1.25
}
