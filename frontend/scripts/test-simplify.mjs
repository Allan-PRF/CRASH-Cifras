/**
 * Modo Simplificar (tríades) — só exibição.
 * Executar: npm run test:simplify -w frontend
 */
import { simplifyChord, simplifyTextoLivre, simplifyLinhas } from '../src/lib/simplify.js'
import { transposeLinhas, transposeChord } from '../src/lib/transpose.js'

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

console.log('\n=== Tríades básicas ===\n')
assertEqual(simplifyChord('C#7M'), 'C#', 'C#7M → C#')
assertEqual(simplifyChord('Bbm7'), 'Bbm', 'Bbm7 → Bbm')
assertEqual(simplifyChord('C7(11)'), 'C', 'C7(11) → C')
assertEqual(simplifyChord('Fm7'), 'Fm', 'Fm7 → Fm')
assertEqual(simplifyChord('Dsus4'), 'D', 'Dsus4 → D')
assertEqual(simplifyChord('Cadd9'), 'C', 'Cadd9 → C')
assertEqual(simplifyChord('C°'), 'Cm', 'C° → Cm')
assertEqual(simplifyChord('Cdim'), 'Cm', 'Cdim → Cm')
assertEqual(simplifyChord('F#m7b5'), 'F#m', 'F#m7b5 → F#m')

console.log('\n=== Case-sensitive: M ≠ menor ===\n')
assertEqual(simplifyChord('CM7'), 'C', 'CM7 → C (não Cm)')
assertEqual(simplifyChord('C#7M'), 'C#', 'C#7M → C# (não C#m)')
assertEqual(simplifyChord('Gmaj7'), 'G', 'Gmaj7 → G (não Gm)')
assertEqual(simplifyChord('CmM7'), 'Cm', 'CmM7 → Cm')
assertEqual(simplifyChord('Caug'), 'C', 'Caug → C')
assertEqual(simplifyChord('C+'), 'C', 'C+ → C')
assertEqual(simplifyChord('C(#5)'), 'C', 'C(#5) → C')
assertEqual(simplifyChord('Bm7(b5)'), 'Bm', 'Bm7(b5) → Bm')

console.log('\n=== Baixo / keepBass ===\n')
assertEqual(simplifyChord('G/B'), 'G/B', 'G/B default keepBass')
assertEqual(simplifyChord('G/B', { keepBass: false }), 'G', 'G/B keepBass:false → G')
assertEqual(simplifyChord('C#7M/F'), 'C#/F', 'C#7M/F → C#/F')

console.log('\n=== Tokens não-acorde ===\n')
assertEqual(simplifyTextoLivre('(2x suave)'), '(2x suave)', 'anotação intocada')
assertEqual(simplifyTextoLivre('C#7M (2x)'), 'C# (2x)', 'acorde + anotação')

console.log('\n=== Encadeado transpose + simplify ===\n')
{
  // Fm → Em (−1): Db9→C9, Bbm7→Am7, Ab→G, Cm7→Bm7; simplify → C, Am, G, Bm
  const linhas = {
    lines: [
      {
        lyricLine: 'x',
        chords: [
          { pos: 0, chord: 'Db9' },
          { pos: 5, chord: 'Bbm7' },
          { pos: 12, chord: 'Ab' },
          { pos: 16, chord: 'Cm7' },
        ],
      },
    ],
  }
  const transposed = transposeLinhas(linhas, -1, { tonDestino: 'Em' })
  const simplified = simplifyLinhas(transposed)
  const chords = simplified.lines[0].chords.map((c) => c.chord)
  assertEqual(chords.join(','), 'C,Am,G,Bm', 'Fm→Em + simplify → C,Am,G,Bm')
}

console.log('\n=== Identidade com toggle off (função não chamada) ===\n')
{
  const sym = 'C#7M'
  assertEqual(transposeChord(sym, 0) || sym, sym, 'sem simplify = símbolo original')
}

console.log(`\n${passed} passou, ${failed} falhou\n`)
process.exit(failed > 0 ? 1 : 0)
