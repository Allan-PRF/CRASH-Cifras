import { memo } from 'react'
import { MONO } from '../../lib/monoCharWidth'

export function estiloMono(fonteLetra, fontWeight = 400, lineHeightRatio = 1.25) {
  return {
    fontFamily: MONO,
    fontSize: fonteLetra,
    fontWeight,
    letterSpacing: 0,
    fontVariantNumeric: 'tabular-nums',
    lineHeight: lineHeightRatio,
  }
}

/** ALINHAMENTO CIFRA CLUB - NÃO ALTERAR — `pos` × largura monospace. */
export const LinhaPosicionada = memo(function LinhaPosicionada({
  items,
  fonteLetra,
  charWidthPx,
  color,
  fontWeight = 700,
  minCols = 0,
  lineHeightRatio = 1.25,
}) {
  if (!items.length) return null

  const widthCols = Math.max(
    minCols,
    ...items.map((item) => item.pos + (item.text?.length || 0)),
    0,
  )

  return (
    <div
      className="relative m-0 max-w-full overflow-x-auto"
      style={{
        ...estiloMono(fonteLetra, fontWeight, lineHeightRatio),
        minHeight: `${fonteLetra * lineHeightRatio}px`,
        minWidth: widthCols > 0 ? widthCols * charWidthPx : undefined,
        color,
      }}
    >
      {items.map((item, i) => (
        <span
          key={`${item.pos}-${item.text}-${i}`}
          className="absolute top-0 whitespace-pre"
          style={{ left: item.pos * charWidthPx }}
        >
          {item.text}
        </span>
      ))}
    </div>
  )
})
