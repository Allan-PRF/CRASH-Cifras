/**
 * Rótulos de tom na grade (dupla grafia) — não altera transpose.js.
 * Executar: npm run test:ton-labels -w frontend
 */
import {
  TOM_LABELS,
  TONS_MAIORES,
  TONS_MENORES,
  tomDisplayLabel,
} from '@crash-cifras/shared/constants'
import { isSameTomCanonical } from '../src/lib/tons.js'

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

console.log('\n=== TOM_LABELS — grade canônica ===\n')

for (const tom of [...TONS_MAIORES, ...TONS_MENORES]) {
  assert(
    typeof TOM_LABELS[tom] === 'string' && TOM_LABELS[tom].length > 0,
    `rótulo definido para ${tom}`,
    `TOM_LABELS[${tom}]=${TOM_LABELS[tom]}`,
  )
}

console.log('\n=== Menores — m nos dois lados ===\n')

assertEqual(tomDisplayLabel('C#m'), 'C#m/Dbm', 'C#m → C#m/Dbm')
assertEqual(tomDisplayLabel('Ebm'), 'D#m/Ebm', 'Ebm → D#m/Ebm')
assertEqual(tomDisplayLabel('F#m'), 'F#m/Gbm', 'F#m → F#m/Gbm')
assertEqual(tomDisplayLabel('Abm'), 'G#m/Abm', 'Abm → G#m/Abm')
assertEqual(tomDisplayLabel('Bbm'), 'A#m/Bbm', 'Bbm → A#m/Bbm')

assert(
  !tomDisplayLabel('C#m').includes('C#/Dbm'),
  'C#m não mistura maior/menor no rótulo',
)

console.log('\n=== Maiores — dupla grafia ===\n')

assertEqual(tomDisplayLabel('Db'), 'C#/Db', 'Db → C#/Db')
assertEqual(tomDisplayLabel('Eb'), 'D#/Eb', 'Eb → D#/Eb')
assertEqual(tomDisplayLabel('Ab'), 'G#/Ab', 'Ab → G#/Ab')

console.log('\n=== isSameTomCanonical ===\n')

assert(isSameTomCanonical('Db', 'Db'), 'Db === Db')
assert(isSameTomCanonical('C#', 'Db'), 'C# enarmônico Db')
assert(isSameTomCanonical('C#m', 'Dbm'), 'C#m enarmônico Dbm')
assert(!isSameTomCanonical('C', 'Cm'), 'C maior ≠ Cm')
assert(!isSameTomCanonical('Db', 'D'), 'Db ≠ D')

console.log(`\n--- ${passed} passou, ${failed} falhou ---\n`)
if (failed > 0) process.exit(1)
