/**
 * Notação BR (exibição) + alinhamento + transpose/simplify.
 * Executar: npm run test:notacao-br -w frontend
 */
import assert from 'node:assert/strict'
import { normalizeChordBR } from '@crash-cifras/shared/notacao-br'
import { simplifyChord } from '../src/lib/simplify.js'
import { transposeChord } from '../src/lib/transpose.js'

function eq(actual, expected, label) {
  assert.equal(actual, expected, `${label}: esperado "${expected}", obteve "${actual}"`)
  console.log(`  ✓ ${label}`)
}

console.log('\n=== maj7 → 7M (maior, nunca menor) ===\n')
eq(normalizeChordBR('Gmaj7'), 'G7M', 'Gmaj7 → G7M')
eq(normalizeChordBR('Cmaj7'), 'C7M', 'Cmaj7 → C7M')
eq(normalizeChordBR('CM7'), 'C7M', 'CM7 → C7M')
eq(normalizeChordBR('DmaJ7'), 'D7M', 'DmaJ7 → D7M (case-safe)')
eq(normalizeChordBR('F#maj7'), 'F#7M', 'F#maj7 → F#7M')
eq(normalizeChordBR('BbMaj7'), 'Bb7M', 'BbMaj7 → Bb7M')

console.log('\n=== menor permanece menor ===\n')
eq(normalizeChordBR('Am7'), 'Am7', 'Am7 → Am7 (não Am7M)')
eq(normalizeChordBR('F#m7'), 'F#m7', 'F#m7 intacto')
eq(normalizeChordBR('Bbm'), 'Bbm', 'Bbm intacto')

console.log('\n=== outras grafias BR ===\n')
eq(normalizeChordBR('Gmaj9'), 'G7M(9)', 'Gmaj9 → G7M(9)')
eq(normalizeChordBR('Caug'), 'C(#5)', 'Caug → C(#5)')
eq(normalizeChordBR('C+'), 'C(#5)', 'C+ → C(#5)')
eq(normalizeChordBR('Cdim'), 'C°', 'Cdim → C°')
eq(normalizeChordBR('Bm7b5'), 'Bm7(b5)', 'Bm7b5 → Bm7(b5)')
eq(normalizeChordBR('F#ø'), 'F#m7(b5)', 'F#ø → F#m7(b5)')
eq(normalizeChordBR('Gmaj7/B'), 'G7M/B', 'slash preservado')
eq(normalizeChordBR('Asus4'), 'Asus4', 'sus4 intacto')
eq(normalizeChordBR('Cadd9'), 'Cadd9', 'add9 intacto')

console.log('\n=== alinhamento: pos fixo (sílaba de início) ===\n')
{
  const lyric = 'Declare pelas ruas o nome de Jesus'
  const pos = 20 // coluna da sílaba sob o acorde
  const stored = { pos, chord: 'Gmaj7' }
  const displayed = normalizeChordBR(stored.chord)
  eq(displayed, 'G7M', 'label exibido G7M')
  eq(stored.pos, 20, 'pos salva intacta (= 20)')
  // left = pos × ch (ou px) — independente do comprimento do texto
  const leftBefore = `${stored.pos}ch`
  const leftAfter = `${stored.pos}ch`
  eq(leftBefore, leftAfter, `left permanece ${leftAfter} (sílaba "${lyric[pos]}")`)
  assert.ok(
    displayed.length < stored.chord.length,
    '7M é mais curto que maj7 (só o rótulo; início igual)',
  )
  console.log(
    `  ✓ sílaba de início: lyric[${pos}]="${lyric[pos]}" — acorde começa na mesma coluna`,
  )
}

console.log('\n=== transpose + exibição BR ===\n')
{
  const transposed = transposeChord('Cmaj7', 2)
  // Tonal costuma devolver Dmaj7 (grafia internacional)
  const onScreen = normalizeChordBR(transposed)
  eq(onScreen, 'D7M', `Cmaj7 +2 → ${transposed} → tela ${onScreen}`)
  assert.notEqual(onScreen.includes('m') && !onScreen.includes('7M'), true)
  assert.ok(!/^Dm/.test(onScreen), 'não virar Dm…')
}

console.log('\n=== simplify (tríades) ===\n')
eq(simplifyChord('G7M'), 'G', 'G7M → G')
eq(simplifyChord('Gmaj7'), 'G', 'Gmaj7 → G (maior, nunca Gm)')
eq(simplifyChord('Am7'), 'Am', 'Am7 → Am')
eq(simplifyChord('Bm7(b5)'), 'Bm', 'Bm7(b5) → Bm')
eq(simplifyChord('Bm7b5'), 'Bm', 'Bm7b5 → Bm')
eq(simplifyChord('C(#5)'), 'C', 'C(#5) → C')
eq(simplifyChord('Caug'), 'C', 'Caug → C')
assert.notEqual(simplifyChord('Gmaj7'), 'Gm', 'Gmaj7 NUNCA Gm')
assert.notEqual(simplifyChord('G7M'), 'Gm', 'G7M NUNCA Gm')

console.log('\nok: test-notacao-br\n')
