/**
 * Corte automático estilo Cifra Club: último espaço que cabe em maxCols;
 * acordes descem com a sílaba via splitChordLineAt (pos recalculado).
 * Fallback: sem espaço na letra → corta antes do acorde que estoura maxCols.
 */

import {
  lineWidthForChords,
  serializeChordLine,
  splitChordLineAt,
} from './cifraEdit.js'
import { rebuildChordLineFromChords } from '@crash-cifras/shared/chord-schema'

/**
 * Índice de corte na letra: último espaço que deixa a L1 cabendo em maxCols
 * (considera extensão dos acordes, não só lyric.length).
 * @param {string} lyric
 * @param {number} maxCols
 * @param {{ pos: number, chord: string }[]} [chords]
 * @returns {number | null} splitIndex para splitChordLineAt, ou null
 */
export function findLyricCutIndex(lyric, maxCols, chords = []) {
  const s = String(lyric ?? '')
  if (lineWidthForChords(s, chords) <= maxCols) return null

  // Janela ≤ maxCols: se a letra cabe mas o acorde vaza, ainda cortamos na letra
  // para o acorde descer (splitChordLineAt).
  const window = s.slice(0, Math.min(s.length, maxCols))
  const lastSpace = window.lastIndexOf(' ')
  if (lastSpace > 0) {
    return lastSpace + 1 // espaço fica na L1; próxima palavra começa na L2
  }

  return null
}

/**
 * Coluna de corte antes do primeiro acorde que não cabe em maxCols
 * (pos >= maxCols ou pos+len > maxCols).
 * @param {{ pos: number, chord: string }[]} chords
 * @param {number} maxCols
 * @returns {number | null}
 */
export function findChordOverflowCutPos(chords, maxCols) {
  const sorted = [...(chords || [])].sort((a, b) => a.pos - b.pos)
  for (const c of sorted) {
    const chordLen = String(c.chord || '').length
    const end = c.pos + chordLen
    if (c.pos >= maxCols || end > maxCols) {
      // Acorde em pos 0 que sozinho já é mais largo que maxCols — não dá para cortar.
      if (c.pos <= 0) return null
      return c.pos
    }
  }
  return null
}

/**
 * Divide linha só de acordes entre tokens (antes do acorde que ultrapassa maxCols).
 * @param {{ chords?: { pos: number, chord: string }[] }} line
 * @param {number} maxCols
 */
export function splitChordOnlyLineAt(line, maxCols) {
  const cutPos = findChordOverflowCutPos(line?.chords || [], maxCols)
  if (cutPos == null || cutPos <= 0) {
    // Fallback: varre candidatos entre tokens (comportamento legado)
    const chords = [...(line?.chords || [])].sort((a, b) => a.pos - b.pos)
    if (chords.length < 2) {
      return { ok: false, reason: 'too_few_chords' }
    }

    let legacyCut = null
    for (let i = 1; i < chords.length; i++) {
      const prev = chords[i - 1]
      const prevEnd = prev.pos + String(prev.chord).length
      if (prevEnd <= maxCols && chords[i].pos >= 0) {
        if (chords[i].pos < maxCols || prevEnd <= maxCols) {
          legacyCut = chords[i].pos
        }
      }
      if (chords[i].pos >= maxCols) {
        legacyCut = chords[i].pos
        break
      }
    }
    if (legacyCut == null || legacyCut <= 0) {
      return { ok: false, reason: 'no_cut_between_tokens' }
    }
    return splitAtColumn(line, legacyCut)
  }
  return splitAtColumn(line, cutPos)
}

/**
 * Parte a linha na coluna `cutPos` (pode ser além do fim da letra).
 * - cut dentro da letra → splitChordLineAt (alinha sílaba).
 * - cut >= lyric.length ou lyric vazia → letra (se houver) fica na L1;
 *   acordes com pos+len <= cut ficam na L1; demais descem com pos -= cut.
 *
 * @param {{ lyricLine?: string, chords?: { pos: number, chord: string }[] }} line
 * @param {number} cutPos
 */
export function splitAtColumn(line, cutPos) {
  const lyric = String(line?.lyricLine ?? '')
  const chords = (line?.chords ?? []).map((c) => ({ pos: c.pos, chord: c.chord }))
  const cut = Math.max(0, Math.round(Number(cutPos) || 0))

  if (cut <= 0) {
    return { ok: false, reason: 'cut_at_start' }
  }

  // Dentro da letra: preserva alinhamento sílaba (splitChordLineAt).
  if (lyric.length > 0 && cut < lyric.length) {
    return splitChordLineAt(line, cut)
  }

  // cut >= lyric.length (inclui lyric vazia): não há sílaba à direita.
  const chords1 = []
  const chords2 = []
  for (const { pos, chord } of chords) {
    const chordLen = String(chord || '').length
    if (pos + chordLen <= cut) {
      chords1.push({ pos, chord })
    } else {
      chords2.push({ pos: Math.max(0, pos - cut), chord })
    }
  }

  if (!chords1.length && !lyric.trim() && !chords2.length) {
    return { ok: false, reason: 'empty_side' }
  }
  if (!chords2.length && chords1.length && lineWidthForChords(lyric, chords1) > cut) {
    return { ok: false, reason: 'no_progress' }
  }
  if (!chords2.length && !lyric.length) {
    return { ok: false, reason: 'empty_side' }
  }

  return {
    ok: true,
    line1: serializeChordLine(lyric, chords1),
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
      const cut = findLyricCutIndex(lyric, maxCols, current.chords)
      if (cut != null) {
        split = splitChordLineAt(current, cut)
      } else {
        // Sem espaço na letra: corta antes do acorde que estoura (pos).
        const chordCut = findChordOverflowCutPos(current.chords, maxCols)
        if (chordCut == null) {
          warnings.push(
            `não foi possível cortar sem partir palavra: "${lyric.slice(0, 40)}…"`,
          )
          break
        }
        split = splitAtColumn(current, chordCut)
      }
    } else {
      split = splitChordOnlyLineAt(current, maxCols)
    }

    if (!split.ok) {
      warnings.push(`corte falhou (${split.reason}) em largura ${effectiveLineWidth(current)}`)
      break
    }

    const line1Empty =
      !split.line1.lyricLine.trim() && !(split.line1.chords || []).length
    if (line1Empty) {
      // Progresso: tudo foi para L2 (ex.: único acorde além de maxCols).
      if (effectiveLineWidth(split.line2) < effectiveLineWidth(current)) {
        current = split.line2
        continue
      }
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
 * Aplica auto-wrap em todas as linhas de todas as seções (só exibição).
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
