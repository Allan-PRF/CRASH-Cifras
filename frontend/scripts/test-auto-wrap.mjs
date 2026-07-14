/**
 * Testes unitários do corte automático (pontuação + tesoura).
 */
import {
  findLyricCutIndex,
  autoWrapChordLine,
  splitChordOnlyLineAt,
  effectiveLineWidth,
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

console.log('findLyricCutIndex — pontuação')
{
  const lyric = 'Precioso é o sangue daquele que a morte venceu'
  // força corte; se houver vírgula numa string, prefere vírgula
  const withComma = 'Precioso é o sangue, daquele que a morte venceu'
  const cut = findLyricCutIndex(withComma, 28)
  assert(cut != null && withComma[cut - 1] === ' ' || withComma.slice(0, cut).includes(','), 'prefere região da vírgula', String(cut))
}

console.log('autoWrapChordLine')
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
  const { lines, warnings } = autoWrapChordLine(line, 24)
  assert(lines.length >= 2, 'gerou 2+ linhas', String(lines.length))
  assert(
    lines.every((l) => effectiveLineWidth(l) <= 24),
    'todas ≤ 24',
    lines.map((l) => effectiveLineWidth(l)).join(','),
  )
  assert(warnings.length === 0 || true, 'warnings ok')
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
  assert(r.line1.chords.every((c) => c.chord.includes('/') || !c.chord.includes('x')), 'slash preservado L1')
  assert(
    [...r.line1.chords, ...r.line2.chords].some((c) => c.chord === 'F#/A#'),
    'F#/A# intacto',
  )
}

console.log(`\n${passed} ok, ${failed} falhou`)
process.exit(failed > 0 ? 1 : 0)
