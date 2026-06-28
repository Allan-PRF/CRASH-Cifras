/**
 * Testes manuais do motor de transposição (Etapa 1).
 * Executar: npm run test:transpose -w frontend
 */
import {
  getTomExibido,
  keyPreferSharps,
  normalizeChordSymbol,
  normalizeNoteName,
  reflowChordPositions,
  transposeChord,
  transposeKey,
  transposeLinhas,
} from '../src/lib/transpose.js'

let passed = 0
let failed = 0

function assert(condition, label, detail = '') {
  if (condition) {
    passed++
    console.log(`  ✓ ${label}`)
  } else {
    failed++
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

function assertEqual(actual, expected, label) {
  assert(actual === expected, label, `esperado "${expected}", obteve "${actual}"`)
}

function assertNoStackedAccidentals(symbol, label) {
  const roots = symbol.split('/').flatMap((part) => {
    const m = part.match(/^([A-G](?:#|b)*)/i)
    return m ? [m[1]] : []
  })
  for (const root of roots) {
    const count = (root.match(/#|b/g) || []).length
    assert(count <= 1, `${label} (${root} ≤1 acidental)`, `root="${root}" count=${count}`)
  }
}

console.log('\n=== Normalização enarmônica ===\n')

assertEqual(transposeChord('Ab', 1), 'A', 'Ab +1 → A (default)')
assertEqual(transposeChord('Ab', 1, { tonality: 'Bb' }), 'A', 'Ab +1 tom Bb → A (nunca Bbb)')
assert(
  transposeChord('Ab', 1, { tonality: 'Bb' }) !== 'Bbb',
  'Ab +1 nunca Bbb',
)

assertEqual(transposeChord('Eb', 1), 'E', 'Eb +1 → E (não Fb)')
assertEqual(normalizeNoteName('Fb', 'E'), 'E', 'Fb normalizado → E')

assertEqual(transposeChord('Em', 8), 'Cm', 'Em +8 → Cm')
assertEqual(transposeChord('Em', 8, { tonality: 'Cm' }), 'Cm', 'Em +8 tom Cm → Cm')

const cgPlus1 = transposeChord('C/G', 1, { tonality: 'Db' })
assertNoStackedAccidentals(cgPlus1, 'C/G +1')
assertEqual(cgPlus1, 'Db/Ab', 'C/G +1 → Db/Ab')

const abEbPlus1 = transposeChord('Ab/Eb', 1, { tonality: 'A' })
assertNoStackedAccidentals(abEbPlus1, 'Ab/Eb +1')
assertEqual(abEbPlus1, 'A/E', 'Ab/Eb +1 → A/E (sem Bbb/Fb)')

assertEqual(normalizeChordSymbol('Bbbm', 'A'), 'Am', 'Bbbm → Am')
assertEqual(normalizeNoteName('Cb', 'B'), 'B', 'Cb → B')
assert(
  ['C#', 'Db'].includes(normalizeNoteName('Ebbb', 'Db')),
  'Ebbb → C# ou Db (chroma 1, nunca Ebbb)',
)

console.log('\n=== getTomExibido / transposeKey ===\n')

assertEqual(getTomExibido('G#m', 1), 'Am', 'G#m +1 → Am (não Gbbm)')
assertEqual(transposeKey('G#m', 1), 'Am', 'transposeKey G#m +1 → Am')
assertNoStackedAccidentals(getTomExibido('Ab', 1) || '', 'getTomExibido Ab +1')

console.log('\n=== Reflow de posições ===\n')

const reflowed = reflowChordPositions([
  { pos: 0, chord: 'C' },
  { pos: 2, chord: 'Am' },
  { pos: 4, chord: 'F/G' },
])
assert(reflowed[0].pos === 0, 'primeiro acorde mantém pos')
assert(reflowed[1].pos >= reflowed[0].pos + 'C'.length + 1, 'segundo acorde com minGap')
assert(reflowed[2].pos >= reflowed[1].pos + reflowed[1].chord.length + 1, 'terceiro acorde com minGap')

const linhas = {
  lines: [
    {
      chordLine: 'C   Am',
      lyricLine: 'Linha de teste aqui',
      chords: [
        { pos: 0, chord: 'C' },
        { pos: 4, chord: 'Am' },
      ],
      segments: [{ text: 'Linha de teste aqui' }],
    },
  ],
}

const transposed = transposeLinhas(linhas, 1, { tonDestino: 'Db' })
const line = transposed.lines[0]
assert(line.lyricLine === 'Linha de teste aqui', 'lyricLine intocada')
assert(line.chords[1].pos > line.chords[0].pos + line.chords[0].chord.length, 'transposeLinhas reflow')
assertNoStackedAccidentals(line.chords.map((c) => c.chord).join(' '), 'transposeLinhas acordes')

console.log('\n=== keyPreferSharps ===\n')
assert(keyPreferSharps('G#m') === true, 'G#m → sharps')
assert(keyPreferSharps('Bb') === false, 'Bb → flats')
assert(keyPreferSharps('F') === false, 'F → flats')

console.log('\n=== Casos obrigatórios (resumo) ===\n')
const cases = [
  ['Ab +1', transposeChord('Ab', 1), 'A', '≠ Bbb'],
  ['Eb +1', transposeChord('Eb', 1), 'E', '≠ Fb'],
  ['C/G +1', transposeChord('C/G', 1, { tonality: 'Db' }), 'Db/Ab', 'slash normalizado'],
  ['Em +8', transposeChord('Em', 8), 'Cm', 'menor preservado'],
]
for (const [name, result, expected] of cases) {
  console.log(`  ${name}: ${result} (esperado: ${expected})`)
}

console.log(`\n--- ${passed} passou, ${failed} falhou ---\n`)
if (failed > 0) process.exit(1)
