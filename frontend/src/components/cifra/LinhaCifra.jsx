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

  const { chords } = useMemo(() => {
    if (
      isCompactFixedChordPos(rawChords, rawLyric, rawChordLine)
    ) {
      const aligned = alignChordsToLyricLine({
        chordLine: rawChordLine,
        lyricLine: rawLyric,
        chords: rawChords,
      })
      return { chords: aligned.chords }
    }
    return { chords: rawChords }
  }, [rawChords, rawLyric, rawChordLine])

  const lyricLine = useMemo(
    () => limparLetraDeColchetesAcorde(rawLyric),
    [rawLyric],
  )

  const monoFontReady = useCifraMonoFontReady()

  const isTeleprompter = !visualizacao
  const pesoUniforme = tema.teleprompter.cifra.fontWeight

  const fonteAcorde = isTeleprompter ? fonteLetra : 14
  const fonteLetraLinha = isTeleprompter ? fonteLetra : 16
  const fonteGrau = isTeleprompter ? fonteLetra : 12

  const pesoLetra = destaque
    ? tema.teleprompter.letra.fontWeightDestaque
    : isTeleprompter
      ? pesoUniforme
      : 400

  const pesoAcorde = isTeleprompter ? pesoUniforme : tema.teleprompter.cifra.fontWeight
  const pesoGrau = isTeleprompter ? pesoUniforme : tema.teleprompter.grau.fontWeight

  const charWidthUniformePx = useMemo(
    () => (isTeleprompter ? measureMonoCharWidth(fonteLetra, pesoUniforme) : null),
    [fonteLetra, pesoUniforme, monoFontReady, isTeleprompter],
  )

  const chordCharWidthPx = useMemo(
    () =>
      isTeleprompter
        ? charWidthUniformePx
        : measureMonoCharWidth(fonteAcorde, pesoAcorde),
    [isTeleprompter, charWidthUniformePx, fonteAcorde, pesoAcorde, monoFontReady],
  )

  const lyricCharWidthPx = useMemo(
    () =>
      isTeleprompter
        ? charWidthUniformePx
        : measureMonoCharWidth(fonteLetraLinha, pesoLetra),
    [isTeleprompter, charWidthUniformePx, fonteLetraLinha, pesoLetra, monoFontReady],
  )

  const grauCharWidthPx = useMemo(
    () =>
      isTeleprompter
        ? charWidthUniformePx
        : measureMonoCharWidth(fonteGrau, pesoGrau),
    [isTeleprompter, charWidthUniformePx, fonteGrau, pesoGrau, monoFontReady],
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
      className={`font-cifra-mono ${
        visualizacao
          ? 'mb-0 max-w-full overflow-x-hidden'
          : 'mb-1 max-w-full overflow-x-auto touch-pan-x'
      }`}
      style={
        isTeleprompter
          ? { WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }
          : undefined
      }
    >
      {/* Teleprompter: um único scroll; acorde/letra/grau usam a mesma régua `ch`. */}
      <div
        className={isTeleprompter ? 'inline-block min-w-full align-top' : undefined}
        style={
          isTeleprompter && minCols > 0
            ? { minWidth: `${minCols}ch`, fontSize: fonteLetra }
            : undefined
        }
      >
        {mostrarAcordes && (
          <LinhaPosicionada
            items={chordItems}
            fonteLetra={fonteAcorde}
            charWidthPx={chordCharWidthPx}
            color={corAcorde}
            fontWeight={pesoAcorde}
            minCols={minCols}
            lineHeightRatio={lineHeightRatio}
            useChUnits={isTeleprompter}
          />
        )}
        <p
          className={`m-0 ${
            visualizacao
              ? 'max-w-full whitespace-pre-wrap text-base leading-snug'
              : 'max-w-none whitespace-pre'
          }`}
          style={{
            ...monoLetra,
            color: destaque ? tema.cores.cifra : corLetra,
            minWidth: isTeleprompter
              ? minCols > 0
                ? `${minCols}ch`
                : undefined
              : minCols > 0
                ? minCols * lyricCharWidthPx
                : undefined,
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
            fontWeight={pesoGrau}
            minCols={minCols}
            lineHeightRatio={lineHeightRatio}
            useChUnits={isTeleprompter}
          />
        )}
      </div>
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
    <div
      className={`${gapClass} max-w-full ${
        visualizacao ? 'overflow-x-auto' : 'overflow-x-visible'
      }`}
    >
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
