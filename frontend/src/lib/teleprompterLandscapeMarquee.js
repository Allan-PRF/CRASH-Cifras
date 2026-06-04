import {
  alignChordsToLyricLine,
  isCompactFixedChordPos,
  normalizeChordLine,
} from '@crash-cifras/shared/chord-schema'
import { limparLetraDeColchetesAcorde } from './graus'
import { measureMonoCharWidth } from './monoCharWidth'
import { tema } from './tema'

const BLOCK_PAD_X = 48

/** Linha superior (prévia) — menor, sem alterar alinhamento Cifra Club. */
export const LANDSCAPE_PREVIEW_FONT_SCALE = 0.75

/** Landscape: letra/acordes/graus −10% em relação ao passo de fonte do layout. */
export const LANDSCAPE_FONT_SCALE = 0.9

/**
 * Largura do bloco do letreiro — mesma base de colunas do LinhaCifraLinha (Cifra Club).
 */
function landscapeBlockWidthPx(line, fonteLetra, fontScale = 1) {
  const fonte = Math.round(fonteLetra * fontScale)
  const norm = normalizeChordLine(line)
  let { chords, lyricLine, chordLine } = norm

  if (isCompactFixedChordPos(chords, lyricLine, chordLine)) {
    const aligned = alignChordsToLyricLine({
      chordLine,
      lyricLine,
      chords,
    })
    chords = aligned.chords
  }

  const lyric = limparLetraDeColchetesAcorde(lyricLine)
  const fromChords = chords.reduce(
    (max, { pos, chord }) => Math.max(max, pos + (chord?.length || 0)),
    0,
  )
  const minCols = Math.max(lyric.length, fromChords, 0)

  const chordCw = measureMonoCharWidth(fonte, tema.teleprompter.cifra.fontWeight)
  const lyricCw = measureMonoCharWidth(fonte, 400)
  const grauCw = measureMonoCharWidth(fonte, tema.teleprompter.grau.fontWeight)

  const contentW = minCols * Math.max(chordCw, lyricCw, grauCw, 0)
  return Math.ceil(Math.max(contentW, 120) + BLOCK_PAD_X)
}

/**
 * Metadados de cada “coluna” do letreiro horizontal (render via LinhaCifraLinha).
 */
function landscapePairColumnWidth(currentLine, nextLine, fonteLetra) {
  const wCurrent = landscapeBlockWidthPx(currentLine, fonteLetra, 1)
  const wNext = nextLine
    ? landscapeBlockWidthPx(nextLine, fonteLetra, LANDSCAPE_PREVIEW_FONT_SCALE)
    : 0
  return Math.max(wCurrent, wNext)
}

export function buildLandscapeMarqueeBlocks({
  flatLines,
  linhasPorSecao,
  fonteLetra,
}) {
  const entries = flatLines.map((entry) => {
    const linhas = linhasPorSecao[entry.secIdx]
    const line = linhas?.lines?.[entry.lineIdx]
    return { entry, line }
  })

  return entries.map(({ entry, line }, index) => {
    const nextLine = entries[index + 1]?.line

    return {
      key: entry.key,
      secIdx: entry.secIdx,
      line,
      nextLine: nextLine ?? null,
      width: landscapePairColumnWidth(line, nextLine, fonteLetra),
    }
  })
}

export function landscapeScrollToBlockIndex(blocks, blockIndex, viewportWidth) {
  let x = viewportWidth
  for (let i = 0; i < blockIndex && i < blocks.length; i++) {
    x += blocks[i].width
  }
  return x
}

export function landscapeMaxScroll(blocks, viewportWidth) {
  if (!blocks.length) return 0
  const content =
    viewportWidth + blocks.reduce((sum, b) => sum + b.width, 0) + viewportWidth
  return Math.max(0, content - viewportWidth)
}
