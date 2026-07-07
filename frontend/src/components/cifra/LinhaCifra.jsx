import { memo, useMemo } from 'react'
import { useCifraMonoFontReady } from '../../hooks/useCifraMonoFontReady'
import {
  alignChordsToLyricLine,
  isCompactFixedChordPos,
  normalizeChordLine,
} from '@crash-cifras/shared/chord-schema'
import {
  buildGrauLineFromChords,
  limparLetraDeColchetesAcorde,
} from '../../lib/graus'
import { measureMonoCharWidth } from '../../lib/monoCharWidth'
import { tema } from '../../lib/tema'
import { estiloMono, LinhaPosicionada } from './LinhaPosicionada.jsx'

export { LinhaPosicionada } from './LinhaPosicionada.jsx'

export const LinhaCifraLinha = memo(function LinhaCifraLinha({
  line,
  tomOriginal,
  mostrarAcordes = true,
  mostrarGrau = true,
  fonteLetra = 36,
  destaque = false,
  visualizacao = false,
  lineHeightRatio = 1.25,
  corAcorde = tema.cores.cifra,
  corLetra = '#FFFFFF',
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

  const monoFontReady = useCifraMonoFontReady()

  const fonteAcorde = visualizacao ? 14 : fonteLetra
  const fonteLetraLinha = visualizacao ? 16 : fonteLetra
  const fonteGrau = visualizacao ? 12 : fonteLetra

  const pesoLetra = destaque
    ? tema.teleprompter.letra.fontWeightDestaque
    : visualizacao
      ? 400
      : tema.teleprompter.letra.fontWeight

  const chordCharWidthPx = useMemo(
    () => measureMonoCharWidth(fonteAcorde, tema.teleprompter.cifra.fontWeight),
    [fonteAcorde, monoFontReady],
  )

  const lyricCharWidthPx = useMemo(
    () => measureMonoCharWidth(fonteLetraLinha, pesoLetra),
    [fonteLetraLinha, pesoLetra, monoFontReady],
  )

  const grauCharWidthPx = useMemo(
    () => measureMonoCharWidth(fonteGrau, tema.teleprompter.grau.fontWeight),
    [fonteGrau, monoFontReady],
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

  const monoLetra = estiloMono(fonteLetraLinha, pesoLetra, lineHeightRatio)

  return (
    <div
      className={`max-w-full font-cifra-mono ${visualizacao ? 'mb-0 overflow-x-hidden' : 'mb-1 overflow-x-auto'}`}
    >
      {mostrarAcordes && (
        <LinhaPosicionada
          items={chordItems}
          fonteLetra={fonteAcorde}
          charWidthPx={chordCharWidthPx}
          color={corAcorde}
          fontWeight={tema.teleprompter.cifra.fontWeight}
          minCols={minCols}
          lineHeightRatio={lineHeightRatio}
        />
      )}
      <p
        className={`m-0 max-w-full whitespace-pre-wrap ${visualizacao ? 'text-base leading-snug' : ''}`}
        style={{
          ...monoLetra,
          color: destaque ? tema.cores.cifra : corLetra,
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
          lineHeightRatio={lineHeightRatio}
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
  lineHeightRatio = 1.25,
  corAcorde,
  corLetra,
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
        lineHeightRatio={lineHeightRatio}
        corAcorde={corAcorde}
        corLetra={corLetra}
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
  lineHeightRatio = 1.25,
  corAcorde,
  corLetra,
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
            lineHeightRatio={lineHeightRatio}
            corAcorde={corAcorde}
            corLetra={corLetra}
          />
        )
      })}
    </div>
  )
})
