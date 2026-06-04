import { memo, useMemo } from 'react'
import {
  alignChordsToLyricLine,
  isCompactFixedChordPos,
  normalizeChordLine,
} from '@crash-cifras/shared/chord-schema'
import {
  buildGrauLineFromChords,
  limparLetraDeColchetesAcorde,
} from '../../lib/graus'
import { MONO, measureMonoCharWidth } from '../../lib/monoCharWidth'
import { tema } from '../../lib/tema'

// ALINHAMENTO CIFRA CLUB - NÃO ALTERAR
// `pos` = coluna monoespaçada extraída pelo parser do Cifra Club (backend/lib/cifraClub.js).
// Renderização: position absolute + left = pos × largura do caractere monospace.

function estiloMono(fonteLetra, fontWeight = 400) {
  return {
    fontFamily: MONO,
    fontSize: fonteLetra,
    fontWeight,
    letterSpacing: 0,
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1.25,
  }
}

/** ALINHAMENTO CIFRA CLUB - NÃO ALTERAR */
const LinhaPosicionada = memo(function LinhaPosicionada({
  items,
  fonteLetra,
  charWidthPx,
  color,
  fontWeight = 700,
  minCols = 0,
  visualizacao = false,
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
        ...estiloMono(fonteLetra, fontWeight),
        minHeight: `${fonteLetra * 1.25}px`,
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

export const LinhaCifraLinha = memo(function LinhaCifraLinha({
  line,
  tomOriginal,
  mostrarAcordes = true,
  mostrarGrau = true,
  fonteLetra = 36,
  destaque = false,
  visualizacao = false,
}) {
  const { chords: rawChords, lyricLine: rawLyric, chordLine: rawChordLine } = useMemo(
    () => normalizeChordLine(line),
    [line],
  )

  const { chords, chordLine } = useMemo(() => {
    if (
      isCompactFixedChordPos(rawChords, rawLyric, rawChordLine)
    ) {
      const aligned = alignChordsToLyricLine({
        chordLine: rawChordLine,
        lyricLine: rawLyric,
        chords: rawChords,
      })
      return { chords: aligned.chords, chordLine: aligned.chordLine }
    }
    return { chords: rawChords, chordLine: rawChordLine }
  }, [rawChords, rawLyric, rawChordLine])

  const lyricLine = useMemo(
    () => limparLetraDeColchetesAcorde(rawLyric),
    [rawLyric],
  )

  const fonteAcorde = visualizacao ? 14 : fonteLetra
  const fonteLetraLinha = visualizacao ? 16 : fonteLetra
  const fonteGrau = visualizacao ? 12 : fonteLetra

  const chordCharWidthPx = useMemo(
    () => measureMonoCharWidth(fonteAcorde, tema.teleprompter.cifra.fontWeight),
    [fonteAcorde],
  )

  const lyricCharWidthPx = useMemo(
    () => measureMonoCharWidth(fonteLetraLinha, destaque ? 600 : 400),
    [fonteLetraLinha, destaque],
  )

  const grauCharWidthPx = useMemo(
    () => measureMonoCharWidth(fonteGrau, tema.teleprompter.grau.fontWeight),
    [fonteGrau],
  )

  const chordItems = useMemo(
    () => chords.map(({ pos, chord }) => ({ pos, text: chord })),
    [chords],
  )

  const grauItems = useMemo(() => {
    if (!mostrarGrau || !chords.length) return []
    return buildGrauLineFromChords(chords, tomOriginal).map(({ pos, grau }) => ({
      pos,
      text: grau,
    }))
  }, [chords, tomOriginal, mostrarGrau])

  const minCols = useMemo(() => {
    const fromChords = chords.reduce(
      (max, { pos, chord }) => Math.max(max, pos + (chord?.length || 0)),
      0,
    )
    return Math.max(lyricLine.length, fromChords)
  }, [chords, lyricLine])

  const temConteudo =
    (mostrarAcordes && chords.length > 0) || lyricLine.trim() || (mostrarGrau && chords.length > 0)
  if (!temConteudo) return null

  const monoLetra = estiloMono(fonteLetraLinha, destaque ? 600 : 400)

  return (
    <div
      className={`max-w-full font-mono ${visualizacao ? 'mb-0 overflow-x-hidden' : 'mb-1 overflow-x-auto'}`}
    >
      {mostrarAcordes && (
        <LinhaPosicionada
          items={chordItems}
          fonteLetra={fonteAcorde}
          charWidthPx={chordCharWidthPx}
          color={tema.cores.cifra}
          fontWeight={tema.teleprompter.cifra.fontWeight}
          minCols={minCols}
          visualizacao={visualizacao}
        />
      )}
      <p
        className={`m-0 max-w-full whitespace-pre-wrap ${visualizacao ? 'text-base leading-snug' : ''}`}
        style={{
          ...monoLetra,
          color: destaque ? tema.cores.cifra : tema.cores.letra,
          minWidth:
            !visualizacao && minCols > 0 ? minCols * lyricCharWidthPx : undefined,
        }}
      >
        {lyricLine.length > 0 ? lyricLine : '\u00A0'}
      </p>
      {mostrarGrau && grauItems.length > 0 && (
        <LinhaPosicionada
          items={grauItems}
          fonteLetra={fonteGrau}
          charWidthPx={grauCharWidthPx}
          color={tema.cores.grau}
          fontWeight={tema.teleprompter.grau.fontWeight}
          minCols={minCols}
          visualizacao={visualizacao}
        />
      )}
    </div>
  )
})

/** @deprecated Use LinhaCifraLinha — mantido para compatibilidade */
export function LinhaCifra(props) {
  return (
    <LinhaCifraLinha
      line={{ segments: [props.segment] }}
      tomOriginal={props.tomOriginal}
      mostrarGrau={props.mostrarGrau}
      fonteLetra={props.fonteLetra}
      destaque={props.destaque}
    />
  )
}

const LinhaComRef = memo(function LinhaComRef({
  line,
  lineKey,
  tomOriginal,
  mostrarAcordes,
  mostrarGrau,
  fonteLetra,
  visualizacao,
  onLineRef,
}) {
  return (
    <div
      ref={(node) => onLineRef?.(lineKey, node)}
      data-teleprompter-line={lineKey}
      className={visualizacao ? 'py-0' : 'py-1'}
    >
      <LinhaCifraLinha
        line={line}
        tomOriginal={tomOriginal}
        mostrarAcordes={mostrarAcordes}
        mostrarGrau={mostrarGrau}
        fonteLetra={fonteLetra}
        visualizacao={visualizacao}
      />
    </div>
  )
})

export const BlocoSecao = memo(function BlocoSecao({
  linhas,
  tomOriginal,
  mostrarAcordes = true,
  mostrarGrau,
  fonteLetra,
  visualizacao = false,
  sectionKey = '',
  lineGapClassName,
  onLineRef,
}) {
  const gapClass = lineGapClassName ?? (visualizacao ? 'space-y-0.5' : 'space-y-2')
  if (!linhas?.lines?.length) {
    return (
      <p className="text-sm text-[var(--crash-texto-sec)]">Seção vazia</p>
    )
  }

  return (
    <div className={`${gapClass} max-w-full ${visualizacao ? 'overflow-x-auto' : 'overflow-x-hidden'}`}>
      {linhas.lines.map((line, li) => {
        const lineKey = `${sectionKey}-${li}`
        const normalized = normalizeChordLine(line)
        const temConteudo =
          normalized.chords.length > 0 || normalized.lyricLine.trim()
        if (!temConteudo) return null

        return (
          <LinhaComRef
            key={li}
            line={line}
            lineKey={lineKey}
            tomOriginal={tomOriginal}
            mostrarAcordes={mostrarAcordes}
            mostrarGrau={mostrarGrau}
            fonteLetra={fonteLetra}
            visualizacao={visualizacao}
            onLineRef={onLineRef}
          />
        )
      })}
    </div>
  )
})
