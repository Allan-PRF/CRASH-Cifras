import { normalizeChordLine } from '@crash-cifras/shared/chord-schema'

/**
 * Assinatura estável do conteúdo musical (ignora ids / referências de objeto).
 * Usada para não empilhar Desfazer em regravações fantasma.
 */
export function lineContentSignature(line) {
  const n = normalizeChordLine(line)
  const chords = (n.chords || [])
    .map((c) => `${Number(c.pos) || 0}:${String(c.chord || '')}`)
    .join('|')
  return `${String(n.lyricLine ?? '')}\n${chords}`
}

export function linhasContentSignature(linhas) {
  const lines = Array.isArray(linhas?.lines) ? linhas.lines : []
  return lines.map(lineContentSignature).join('\u0001')
}

export function secoesContentSignature(secoes) {
  return (secoes || [])
    .map(
      (sec) =>
        `${String(sec?.slug ?? '')}\u0002${String(sec?.nome ?? '')}\u0002${linhasContentSignature(sec?.linhas)}`,
    )
    .join('\u0001')
}

export function introContentEqual(a, b) {
  return (
    String(a?.mao_esquerda ?? '') === String(b?.mao_esquerda ?? '') &&
    String(a?.mao_direita ?? '') === String(b?.mao_direita ?? '')
  )
}

export function secoesContentEqual(a, b) {
  return secoesContentSignature(a) === secoesContentSignature(b)
}

export function linhasContentEqual(a, b) {
  return linhasContentSignature(a) === linhasContentSignature(b)
}

export function chordsContentEqual(a, b) {
  const left = Array.isArray(a) ? a : []
  const right = Array.isArray(b) ? b : []
  if (left.length !== right.length) return false
  return left.every((chord, index) => {
    const other = right[index]
    return (
      Number(chord?.pos) === Number(other?.pos) &&
      String(chord?.chord || '') === String(other?.chord || '')
    )
  })
}
