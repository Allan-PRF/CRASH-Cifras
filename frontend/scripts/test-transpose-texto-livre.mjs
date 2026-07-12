/**
 * Transposição de texto livre (intro / mãos).
 * Executar: npm run test:transpose-texto-livre -w frontend
 */
import { isValidChordSymbol } from '@crash-cifras/shared/chord-schema'
import {
  transposeChord,
  transposeTextoLivre,
  transposeIntro,
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

console.log('\n=== Validador BR 7M ===\n')
assert(isValidChordSymbol('C#7M'), 'C#7M válido')
assert(isValidChordSymbol('C7M'), 'C7M válido')
assert(isValidChordSymbol('Fm7'), 'Fm7 válido')
assert(!isValidChordSymbol('K'), 'K inválido')
assert(!isValidChordSymbol('Xyz'), 'Xyz inválido')
assert(!isValidChordSymbol('suave'), 'suave inválido')

console.log('\n=== Grafia 7M preservada na transposição ===\n')
assertEqual(transposeChord('C#7M', -1), 'C7M', 'C#7M −1 → C7M (não maj7)')
assertEqual(transposeChord('C#M7', -1), 'CM7', 'C#M7 −1 → CM7')

console.log('\n=== (1) C#7M Fm7 −1 ===\n')
assertEqual(transposeTextoLivre('C#7M Fm7', -1), 'C7M Em7', 'C#7M Fm7 −1 → C7M Em7')

console.log('\n=== (2) anotações intactas ===\n')
assertEqual(
  transposeTextoLivre('C#7M Fm7 (2x suave)', -1),
  'C7M Em7 (2x suave)',
  'anotação (2x suave) intacta',
)

console.log('\n=== (3) texto sem acordes ===\n')
assertEqual(transposeTextoLivre('subida lenta', -1), 'subida lenta', 'sem acordes → idêntico')

console.log('\n=== (4) espaços e quebras preservados ===\n')
{
  const src = 'C#7M\n  Fm7\tsuave'
  const out = transposeTextoLivre(src, -1)
  assertEqual(out, 'C7M\n  Em7\tsuave', '\\n, espaços e tab preservados')
}

console.log('\n=== (5) vazio / null ===\n')
assertEqual(transposeTextoLivre('', -1), '', 'string vazia')
assert(transposeTextoLivre(null, -1) == null, 'null → null')
assertEqual(
  JSON.stringify(transposeIntro(null, -1)),
  'null',
  'intro null → null',
)
assertEqual(
  JSON.stringify(transposeIntro({ mao_esquerda: '', mao_direita: null }, -1)),
  JSON.stringify({ mao_esquerda: '', mao_direita: null }),
  'intro vazia não quebra',
)

console.log(`\n${passed} passou, ${failed} falhou\n`)
process.exit(failed > 0 ? 1 : 0)
