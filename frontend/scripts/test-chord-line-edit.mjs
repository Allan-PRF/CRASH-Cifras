/**
 * Edição de linha de acordes — tokenização estrita + round-trip.
 * Executar: npm run test:chord-line-edit -w frontend
 */
import { rebuildChordLineFromChords } from '@crash-cifras/shared/chord-schema'
import {
  parseChordsFromEditableLine,
  validateEditableChordLine,
} from '../src/lib/cifraEdit.js'

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

function chordsEqual(a, b) {
  if (a.length !== b.length) return false
  return a.every((c, i) => c.pos === b[i].pos && c.chord === b[i].chord)
}

console.log('\n=== (a) round-trip sem edição ===\n')
{
  const original = [
    { pos: 0, chord: 'Am' },
    { pos: 5, chord: 'G' },
    { pos: 10, chord: 'Cmaj7' },
  ]
  const line = rebuildChordLineFromChords(original)
  const parsed = parseChordsFromEditableLine(line)
  assert(chordsEqual(parsed, original), 'pos e símbolos idênticos aos originais', JSON.stringify({ line, parsed }))
  const validated = validateEditableChordLine(line)
  assert(validated.ok === true, 'confirmação sem tocar aplica ok')
  assert(chordsEqual(validated.chords, original), 'validate retorna os mesmos chords')
}

console.log('\n=== (b) mover acorde 2 espaços à direita ===\n')
{
  // "Am G" → G em pos 3; "Am  G" → G em pos 4 (+1); "Am   G" → G em pos 5 (+2)
  const base = parseChordsFromEditableLine('Am G')
  const moved = parseChordsFromEditableLine('Am   G')
  assert(base[1]?.chord === 'G' && base[1]?.pos === 3, 'baseline G em pos 3')
  assert(moved[1]?.chord === 'G' && moved[1]?.pos === 5, 'G em pos 5 (= +2)')
}

console.log('\n=== (c) adicionar acorde no meio ===\n')
{
  const chords = parseChordsFromEditableLine('Am  C  G')
  assert(chords.length === 3, '3 acordes')
  assert(chords[0].chord === 'Am' && chords[0].pos === 0, 'Am pos 0')
  assert(chords[1].chord === 'C' && chords[1].pos === 4, 'C no meio pos 4')
  assert(chords[2].chord === 'G' && chords[2].pos === 7, 'G pos 7')
}

console.log('\n=== (d) token inválido K ===\n')
{
  const result = validateEditableChordLine('K')
  assert(result.ok === false, 'bloqueia aplicar')
  assert(result.invalidTokens?.includes('K'), 'destaca K')
}

console.log('\n=== (e) nenhum token some silenciosamente ===\n')
{
  const result = validateEditableChordLine('C#m7 K A')
  assert(result.ok === false, 'bloqueia (não aplica C#m7 A descartando K)')
  assert(result.invalidTokens?.includes('K'), 'K na lista de inválidos')
  assert(result.chords.length === 3, '3 tokens parseados (K não engolido)', JSON.stringify(result.chords))
  assert(
    result.chords.map((c) => c.chord).join(' ') === 'C#m7 K A',
    'tokens preservados: C#m7 K A',
  )
}

console.log('\n=== (f) linha vazia permitida ===\n')
{
  const result = validateEditableChordLine('')
  assert(result.ok === true, 'ok: true')
  assert(Array.isArray(result.chords) && result.chords.length === 0, 'chords: []')
  assert(rebuildChordLineFromChords([]) === '', 'rebuild de [] = ""')
}

console.log(`\n${passed} passou, ${failed} falhou\n`)
process.exit(failed > 0 ? 1 : 0)
