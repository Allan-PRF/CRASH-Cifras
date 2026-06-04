import {
  isSecaoLinhas,
  linhasToChordLyricText,
  parseChordLyricBlock,
  parseChordLyricLine,
} from '@crash-cifras/shared/chord-schema'

export { parseChordLyricBlock, parseChordLyricLine }

export function linhasToEditorText(linhas) {
  return linhasToChordLyricText(linhas)
}
