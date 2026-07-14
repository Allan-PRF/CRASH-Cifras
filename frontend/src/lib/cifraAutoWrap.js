/**
 * Corte automático de linha para caber em maxCols (teleprompter mobile).
 * Reusa splitChordLineAt (tesoura) e prefere pontuação / fim de frase.
 */

import {
  lineWidthForChords,
  serializeChordLine,
  splitChordLineAt,
} from './cifraEdit.js'
import { rebuildChordLineFromChords } from '@crash-cifras/shared/chord-schema'

const PUNCT_RE = /[,.;:!?…]/g

/**
 * Índice de corte preferido na letra (0..maxCols], nunca no meio da palavra.
 * Prefere pontuação (vírgula/ponto) dentro do limite; senão último espaço.
 * @param {string} lyric
 * @param {number} maxCols
 * @returns {number | null} splitIndex para splitChordLineAt, ou null se não precisa/não dá
 */
export function findLyricCutIndex(lyric, maxCols) {
  const s = String(lyric ?? '')
  if (s.length <= maxCols) return null

  const window = s.slice(0, maxCols)

  // Preferência musical: última pontuação na janela (não no primeiro 30%).
  let bestPunct = -1
  PUNCT_RE.lastIndex = 0
  let m
  while ((m = PUNCT_RE.exec(window)) !== null) {
    const after = m.index + 1
    if (after >= Math.floor(maxCols * 0.3) && after < s.length) {
      bestPunct = after
    }
  }
  if (bestPunct > 0) {
    // inclui espaços após a pontuação na linha 1
    let i = bestPunct
    while (i < maxCols && i < s.length && s[i] === ' ') i++
    return i < s.length ? i : bestPunct
  }

  const lastSpace = window.lastIndexOf(' ')
  if (lastSpace > 0) {
    return lastSpace + 1 // espaço fica na linha 1; próxima palavra começa na linha 2
  }

  // Sem espaço: não corta no meio da palavra — falha controlada
  return null
}

/**
 * Divide linha só de acordes entre tokens (antes do acorde que ultrapassa maxCols).
 * @param {{ chords?: { pos: number, chord: string }[] }} line
 * @param {number} maxCols
 */
export function splitChordOnlyLineAt(line, maxCols) {
  const chords = [...(line?.chords || [])].sort((a, b) => a.pos - b.pos)
  if (chords.length < 2) {
    return { ok: false, reason: 'too_few_chords' }
  }

  let cutPos = null
  for (let i = 1; i < chords.length; i++) {
    const prev = chords[i - 1]
    const prevEnd = prev.pos + String(prev.chord).length
    if (prevEnd <= maxCols && chords[i].pos >= 0) {
      // candidato: cortar no início do acorde i (entre tokens)
      if (chords[i].pos < maxCols || prevEnd <= maxCols) {
        cutPos = chords[i].pos
      }
    }
    if (chords[i].pos >= maxCols) {
      cutPos = chords[i].pos
      break
    }
  }

  if (cutPos == null || cutPos <= 0) {
    return { ok: false, reason: 'no_cut_between_tokens' }
  }

  const chords1 = []
  const chords2 = []
  for (const c of chords) {
    if (c.pos < cutPos) {
      chords1.push({ pos: c.pos, chord: c.chord })
    } else {
      chords2.push({ pos: Math.max(0, c.pos - cutPos), chord: c.chord })
    }
  }
  if (!chords1.length || !chords2.length) {
    return { ok: false, reason: 'empty_side' }
  }

  return {
    ok: true,
    line1: serializeChordLine('', chords1),
    line2: serializeChordLine('', chords2),
  }
}

/**
 * Largura efetiva da linha (letra ou extensão dos acordes).
 */
export function effectiveLineWidth(line) {
  return lineWidthForChords(line?.lyricLine ?? '', line?.chords ?? [])
}

/**
 * Quebra uma linha até caber em maxCols. Retorna array de linhas.
 * @param {{ lyricLine?: string, chords?: { pos: number, chord: string }[] }} line
 * @param {number} maxCols
 * @returns {{ lines: object[], warnings: string[] }}
 */
export function autoWrapChordLine(line, maxCols) {
  const warnings = []
  const out = []
  let current = {
    lyricLine: String(line?.lyricLine ?? ''),
    chords: (line?.chords ?? []).map((c) => ({ pos: c.pos, chord: c.chord })),
  }
  // garante chordLine coerente
  current = serializeChordLine(current.lyricLine, current.chords)

  let guard = 0
  while (effectiveLineWidth(current) > maxCols && guard < 40) {
    guard++
    const lyric = current.lyricLine || ''
    const hasLyric = Boolean(lyric.trim())

    let split
    if (hasLyric) {
      const cut = findLyricCutIndex(lyric, maxCols)
      if (cut == null) {
        warnings.push(
          `não foi possível cortar sem partir palavra: "${lyric.slice(0, 40)}…"`,
        )
        break
      }
      split = splitChordLineAt(current, cut)
    } else {
      split = splitChordOnlyLineAt(current, maxCols)
    }

    if (!split.ok) {
      warnings.push(`corte falhou (${split.reason}) em largura ${effectiveLineWidth(current)}`)
      break
    }

    // Evita linha 1 vazia infinita
    if (!split.line1.lyricLine.trim() && !(split.line1.chords || []).length) {
      warnings.push('corte produziu linha vazia; abortado')
      break
    }

    out.push(split.line1)
    current = split.line2
  }

  out.push(
    serializeChordLine(current.lyricLine ?? '', current.chords ?? []),
  )
  return { lines: out, warnings }
}

/**
 * Aplica auto-wrap em todas as linhas de todas as seções.
 * @param {{ nome?: string, slug?: string, linhas: { lines: object[] } }[]} secoes
 * @param {number} maxCols
 */
export function autoWrapSecoes(secoes, maxCols) {
  const warnings = []
  const overflow = []

  const result = (secoes || []).map((sec) => {
    const linesIn = sec?.linhas?.lines || []
    const linesOut = []
    for (const line of linesIn) {
      const wrapped = autoWrapChordLine(line, maxCols)
      warnings.push(...wrapped.warnings)
      for (const w of wrapped.lines) {
        linesOut.push(w)
        const width = effectiveLineWidth(w)
        if (width > maxCols) {
          overflow.push({
            secao: sec.nome || sec.slug,
            width,
            maxCols,
            sample: (w.lyricLine || rebuildChordLineFromChords(w.chords || [])).slice(0, 60),
          })
        }
      }
    }
    return {
      ...sec,
      linhas: { lines: linesOut },
    }
  })

  return {
    secoes: result,
    warnings,
    overflow,
    ok: overflow.length === 0,
  }
}
