/**
 * Testes manuais do motor de transposição (Etapa 1).
 * Executar: npm run test:transpose -w frontend
 */
import {
  getTomExibido,
  keyPreferSharps,
  normalizeChordSymbol,
  normalizeNoteName,
  normalizeTomKey,
  reflowChordPositions,
  semitonesBetween,
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

assertEqual(semitonesBetween('Fm', 'Em'), -1, 'Fm → Em = -1 semitom (caminho curto)')
assertEqual(getTomExibido('Fm', 0, 'Em'), 'Em', 'Fm com destino Em → Em (menor explícito)')
assertEqual(getTomExibido('Fm', -1, 'Em'), 'Em', 'Fm -1 com destino Em → Em')
assertEqual(normalizeTomKey('Bb'), 'Bb', 'normalizeTomKey Bb')
assertEqual(normalizeTomKey('Ebm'), 'Ebm', 'normalizeTomKey Ebm')

console.log('\n=== Fm → Em (Era Eu) ===\n')

const fmParaEm = ['Db9', 'Bbm7', 'Ab', 'Cm7', 'Fm7', 'Dbmaj7']
const esperadoEm = ['C9', 'Am7', 'G', 'Bm7', 'Em7', 'Cmaj7']
const stFmEm = semitonesBetween('Fm', 'Em')
for (let i = 0; i < fmParaEm.length; i++) {
  assertEqual(
    transposeChord(fmParaEm[i], stFmEm, { tonality: 'Em' }),
    esperadoEm[i],
    `${fmParaEm[i]} Fm→Em → ${esperadoEm[i]}`,
  )
}

console.log('\n=== C# → Em (motor gerou C#) ===\n')

assertEqual(semitonesBetween('C#', 'Em'), 3, 'C# → Em = +3 semitons')
assertEqual(getTomExibido('C#', 0, 'Em'), 'Em', 'C# com destino Em → Em (menor)')
assertEqual(transposeChord('C#', 3, { tonality: 'Em' }), 'E', 'C# +3 → E')
assertEqual(transposeChord('F#', 3, { tonality: 'Em' }), 'A', 'F# +3 → A')
assertEqual(transposeChord('G#m', 3, { tonality: 'Em' }), 'Bm', 'G#m +3 → Bm')
assertEqual(transposeChord('C#maj7', 3, { tonality: 'Em' }), 'Emaj7', 'C#maj7 +3 → Emaj7')

console.log('\n=== Teleprompter espelho (tonDestino explícito) ===\n')

const linhasFm = {
  lines: [
    {
      chordLine: 'Db9  Bbm7',
      lyricLine: 'teste',
      chords: [
        { pos: 0, chord: 'Db9' },
        { pos: 5, chord: 'Bbm7' },
      ],
      segments: [{ text: 'teste' }],
    },
  ],
}

const transposedTp = transposeLinhas(linhasFm, stFmEm, { tonDestino: 'Em' })
assertEqual(transposedTp.lines[0].chords[0].chord, 'C9', 'teleprompter Fm→Em C9')
assertEqual(transposedTp.lines[0].chords[1].chord, 'Am7', 'teleprompter Fm→Em Am7')
assertEqual(getTomExibido('Fm', stFmEm, 'Em'), 'Em', 'rótulo teleprompter Em menor')

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
