/**
 * Testes: quebra adaptativa estilo Cifra Club (só exibição).
 */
import {
  findLyricCutIndex,
  autoWrapChordLine,
  splitChordOnlyLineAt,
  effectiveLineWidth,
  autoWrapSecoes,
} from '../src/lib/cifraAutoWrap.js'

let passed = 0
let failed = 0
function assert(cond, label, detail = '') {
  if (cond) {
    passed++
    console.log(`  ✓ ${label}`)
  } else {
    failed++
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

console.log('findLyricCutIndex — último espaço (nunca no meio da palavra)')
{
  const lyric = 'O verbo vivo que deixou sua glória por nós'
  const cut = findLyricCutIndex(lyric, 24)
  assert(cut != null, 'corta quando > maxCols')
  assert(cut === lyric.indexOf('sua'), 'corte antes de "sua" (após deixou )', String(cut))
  assert(!lyric.slice(0, cut).includes('sua'), 'L1 sem "sua"')
  assert(lyric.slice(cut).startsWith('sua'), 'L2 começa com "sua"')

  // não corta no meio da palavra
  const hard = 'Palavramuitolonga'
  assert(findLyricCutIndex(hard, 8) == null, 'sem espaço → null')
}

console.log('Há Poder — F# sobre glória (maxCols 24 ≈ modelo Cifra Club)')
{
  const lyric = 'O verbo vivo que deixou sua glória por nós'
  const line = {
    lyricLine: lyric,
    chords: [
      { pos: 0, chord: 'E' },
      { pos: lyric.indexOf('deixou'), chord: 'G#m' },
      { pos: lyric.indexOf('glória'), chord: 'F#' },
    ],
  }
  const { lines, warnings } = autoWrapChordLine(line, 24)
  assert(lines.length >= 2, 'gerou 2+ linhas', String(lines.length))
  assert(warnings.length === 0, 'sem warnings', warnings.join('; '))

  const l1 = lines[0]
  const l2 = lines.find((l) => /gl[oó]ria/i.test(l.lyricLine || ''))
  assert(/deixou\s*$/i.test(l1.lyricLine.trimEnd()) || /deixou/.test(l1.lyricLine), 'L1 tem deixou', l1.lyricLine)
  assert(Boolean(l2), 'L2 tem glória')
  const fsharp = (l2.chords || []).find((c) => c.chord === 'F#')
  assert(Boolean(fsharp), 'F# na linha da glória')
  assert(
    fsharp.pos === l2.lyricLine.indexOf('glória'),
    'F# pos = início de glória',
    `pos=${fsharp?.pos} idx=${l2.lyricLine.indexOf('glória')} lyric=${JSON.stringify(l2.lyricLine)}`,
  )
  assert(
    (l1.chords || []).some((c) => c.chord === 'G#m'),
    'G#m permanece na L1 com deixou',
  )
  assert(
    !(l1.chords || []).some((c) => c.chord === 'F#'),
    'F# não agrupado na L1',
  )
}

console.log('maxCols diferentes → quebras diferentes (mesmo dado)')
{
  const lyric = 'O verbo vivo que deixou sua glória por nós'
  const line = {
    lyricLine: lyric,
    chords: [
      { pos: 0, chord: 'E' },
      { pos: lyric.indexOf('deixou'), chord: 'G#m' },
      { pos: lyric.indexOf('glória'), chord: 'F#' },
    ],
  }
  const narrow = autoWrapChordLine(line, 24).lines.map((l) => l.lyricLine)
  const wide = autoWrapChordLine(line, 80).lines.map((l) => l.lyricLine)
  assert(narrow.length >= 2, 'estreito quebra')
  assert(wide.length === 1, 'largo não quebra', String(wide.length))
  assert(wide[0] === lyric, 'largo = linha inteira')
}

console.log('autoWrapChordLine — genérico')
{
  const line = {
    lyricLine: 'Precioso é o sangue daquele que a morte venceu',
    chords: [
      { pos: 1, chord: 'C#m' },
      { pos: 10, chord: 'G#m' },
      { pos: 18, chord: 'B' },
      { pos: 26, chord: 'F#' },
    ],
  }
  const { lines } = autoWrapChordLine(line, 24)
  assert(lines.length >= 2, 'gerou 2+ linhas', String(lines.length))
  assert(
    lines.every((l) => effectiveLineWidth(l) <= 24),
    'todas ≤ 24',
    lines.map((l) => effectiveLineWidth(l)).join(','),
  )
}

console.log('splitChordOnlyLineAt')
{
  const r = splitChordOnlyLineAt(
    {
      lyricLine: '',
      chords: [
        { pos: 0, chord: 'G#m' },
        { pos: 5, chord: 'F#/A#' },
        { pos: 12, chord: 'B' },
        { pos: 15, chord: 'C#m' },
        { pos: 20, chord: 'G#m' },
        { pos: 26, chord: 'F#' },
      ],
    },
    18,
  )
  assert(r.ok, 'corta solo entre tokens')
  assert(r.line1.chords.length >= 1 && r.line2.chords.length >= 1, 'ambos lados com acordes')
  assert(
    [...r.line1.chords, ...r.line2.chords].some((c) => c.chord === 'F#/A#'),
    'F#/A# intacto',
  )
}

console.log('autoWrapSecoes — 3+ pedaços recursivo')
{
  const long =
    'Palavra uma duas tres quatro cinco seis sete oito nove dez onze doze treze'
  const { secoes } = autoWrapSecoes(
    [
      {
        nome: 't',
        linhas: {
          lines: [{ lyricLine: long, chords: [{ pos: 0, chord: 'C' }] }],
        },
      },
    ],
    20,
  )
  assert(secoes[0].linhas.lines.length >= 3, '3+ pedaços', String(secoes[0].linhas.lines.length))
}

console.log(`\n${passed} ok, ${failed} falhou`)
process.exit(failed > 0 ? 1 : 0)
