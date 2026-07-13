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

/**
 * Rail de itens em colunas monoespaçadas.
 * - Teleprompter (`useChUnits`): `left`/`minWidth` em `ch` = métrica CSS do mesmo elemento
 *   (alinhamento idêntico desktop↔mobile; scroll fica no container pai).
 * - Editor/preview: `pos * charWidthPx` (canvas) como antes.
 */
export const LinhaPosicionada = memo(function LinhaPosicionada({
  items,
  fonteLetra,
  charWidthPx,
  color,
  fontWeight = 700,
  minCols = 0,
  lineHeightRatio = 1.25,
  useChUnits = false,
}) {
  if (!items.length) return null

  const widthCols = Math.max(
    minCols,
    ...items.map((item) => item.pos + (item.text?.length || 0)),
    0,
  )

  return (
    <div
      className={`relative m-0 max-w-none ${useChUnits ? 'overflow-x-visible' : 'max-w-full overflow-x-auto'}`}
      style={{
        ...estiloMono(fonteLetra, fontWeight, lineHeightRatio),
        minHeight: `${fonteLetra * lineHeightRatio}px`,
        minWidth: widthCols > 0
          ? useChUnits
            ? `${widthCols}ch`
            : widthCols * charWidthPx
          : undefined,
        color,
      }}
    >
      {items.map((item, i) => (
        <span
          key={`${item.pos}-${item.text}-${i}`}
          className="absolute top-0 whitespace-pre"
          style={{
            left: useChUnits ? `${item.pos}ch` : item.pos * charWidthPx,
          }}
        >
          {item.text}
        </span>
      ))}
    </div>
  )
})
