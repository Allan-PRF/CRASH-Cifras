/**
 * Largura-alvo (colunas monoespaçadas) do teleprompter na viewport mais estreita.
 * Espelha Teleprompter.jsx (px-4) + teleprompterMobile.js + portrait default M (~21px).
 */

import { TELEPROMPTER_MOBILE_FONT_SCALE } from './teleprompterMobile.js'
import { measureMonoCharWidth } from './monoCharWidth.js'
import { tema } from './tema.js'

/** Menor largura prática de celular usada como referência de “mais estreito”. */
export const TELEPROMPTER_NARROW_VIEWPORT_PX = 320

/** Tailwind `px-4` no contentRef do teleprompter (Teleprompter.jsx). */
export const TELEPROMPTER_CONTENT_PAD_X_PX = 16

/**
 * Folga de colunas no maxCols (canvas vs unidade CSS `ch` / subpixel).
 * 1 é barato e evita corte na borda após aumento de fonte.
 */
export const TELEPROMPTER_MAX_COLS_SAFETY = 1

/** Portrait defaultFontIndex=1 → value 34 (LAYOUT_POR_ORIENTACAO.portrait). */
export const TELEPROMPTER_PORTRAIT_DEFAULT_FONT_BASE_PX = 34

/** Mesma referência de proporcionalidade de teleprompterMobile.js */
const MOBILE_FONT_REF_WIDTH = 390

/**
 * Fonte efetiva da letra no teleprompter mobile portrait (mesma fórmula de scaleTeleprompterFont).
 * @param {number} [viewportWidthPx]
 * @param {number} [fonteBasePx]
 */
export function teleprompterFonteLetraPx(
  viewportWidthPx = TELEPROMPTER_NARROW_VIEWPORT_PX,
  fonteBasePx = TELEPROMPTER_PORTRAIT_DEFAULT_FONT_BASE_PX,
) {
  const scale = TELEPROMPTER_MOBILE_FONT_SCALE.portrait
  let scaled = fonteBasePx * scale
  const vwFactor = Math.min(1.12, Math.max(0.88, viewportWidthPx / MOBILE_FONT_REF_WIDTH))
  scaled *= vwFactor
  return Math.max(12, Math.round(scaled))
}

/**
 * Número EXATO de colunas monoespaçadas que cabem na viewport mais estreita.
 * Usa medida real de JetBrains Mono (peso do acorde/letra no teleprompter).
 *
 * @param {{
 *   viewportWidthPx?: number,
 *   measureCharWidth?: (fontSizePx: number, fontWeight?: number) => number,
 * }} [opts]
 * @returns {{ maxCols: number, fonteLetraPx: number, charWidthPx: number, usableWidthPx: number }}
 */
export function getTeleprompterMaxCols(opts = {}) {
  const viewportWidthPx = opts.viewportWidthPx ?? TELEPROMPTER_NARROW_VIEWPORT_PX
  const measure =
    opts.measureCharWidth ??
    ((fontSizePx, fontWeight) => measureMonoCharWidth(fontSizePx, fontWeight))

  const fonteLetraPx = teleprompterFonteLetraPx(viewportWidthPx)
  const fontWeight = tema.teleprompter.cifra.fontWeight
  const charWidthPx = measure(fonteLetraPx, fontWeight)
  const usableWidthPx = Math.max(
    0,
    viewportWidthPx - 2 * TELEPROMPTER_CONTENT_PAD_X_PX,
  )
  const raw = Math.floor(usableWidthPx / charWidthPx)
  const maxCols = Math.max(1, raw - TELEPROMPTER_MAX_COLS_SAFETY)

  return { maxCols, fonteLetraPx, charWidthPx, usableWidthPx }
}

/**
 * Colunas monoespaçadas que cabem numa largura de conteúdo já medida (px),
 * com a fonte efetiva do teleprompter (não a fórmula de importação).
 *
 * @param {number} contentWidthPx
 * @param {number} fonteLetraPx
 * @param {{
 *   measureCharWidth?: (fontSizePx: number, fontWeight?: number) => number,
 *   fontWeight?: number | string,
 *   safetyCols?: number,
 * }} [opts]
 */
export function maxColsFromContentWidth(contentWidthPx, fonteLetraPx, opts = {}) {
  const measure =
    opts.measureCharWidth ??
    ((fontSizePx, fontWeight) => measureMonoCharWidth(fontSizePx, fontWeight))
  const fontWeight = opts.fontWeight ?? tema.teleprompter.cifra.fontWeight
  const safety =
    opts.safetyCols != null ? opts.safetyCols : TELEPROMPTER_MAX_COLS_SAFETY
  const charWidthPx = measure(fonteLetraPx, fontWeight)
  const usableWidthPx = Math.max(0, Number(contentWidthPx) || 0)
  const raw = Math.floor(usableWidthPx / Math.max(charWidthPx, 0.001))
  return {
    maxCols: Math.max(1, raw - safety),
    fonteLetraPx,
    charWidthPx,
    usableWidthPx,
  }
}
