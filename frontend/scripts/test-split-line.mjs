/**
 * Testes de splitChordLineAt (dividir linha no editor).
 * Executar: npm run test:split-line -w frontend
 */
import { splitChordLineAt } from '../src/lib/cifraEdit.js'

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

function lineInput(lyricLine, chords) {
  return { lyricLine, chords }
}

console.log('splitChordLineAt')

{
  const r = splitChordLineAt(
    lineInput('Para que entre o Rei Jesus, o Rei da glória', [
      { pos: 0, chord: 'G' },
      { pos: 15, chord: 'C' },
      { pos: 28, chord: 'Am' },
    ]),
    28,
  )
  assert(r.ok, 'corte no meio com acordes antes/depois')
  assert(r.line1.lyricLine === 'Para que entre o Rei Jesus, ', 'letra linha 1')
  assert(r.line2.lyricLine === 'o Rei da glória', 'letra linha 2')
  assert(r.line1.chords.length === 2, 'dois acordes na linha 1')
  assert(r.line2.chords.length === 1, 'um acorde na linha 2')
  assert(r.line2.chords[0].pos === 0 && r.line2.chords[0].chord === 'Am', 'Am reindexado em 0')
}

{
  const r = splitChordLineAt(lineInput('Só letra longa sem acorde', []), 3)
  assert(r.ok, 'sem acordes')
  assert(r.line1.lyricLine === 'Só ', 'split sem acordes linha 1')
  assert(r.line2.chords.length === 0, 'linha 2 sem acordes')
}

{
  const r = splitChordLineAt(lineInput('ABC', [{ pos: 1, chord: 'G' }]), 3)
  assert(!r.ok && r.reason === 'split_at_end', 'rejeita corte no fim')
}

{
  const r = splitChordLineAt(
    lineInput('ABCDEF', [{ pos: 4, chord: 'Cm' }]),
    5,
  )
  assert(r.ok, 'acorde atravessa corte → linha 2')
  assert(r.line1.chords.length === 0, 'linha 1 sem acordes atravessados')
  assert(r.line2.chords[0]?.chord === 'Cm', 'Cm na linha 2')
  assert(r.line2.chords[0]?.pos === 0, 'Cm clamp em 0 (4-5=-1)')
}

{
  const r = splitChordLineAt(
    lineInput('tudo embaixo', [{ pos: 0, chord: 'D' }]),
    0,
  )
  assert(r.ok, 'corte no início')
  assert(r.line1.lyricLine === '', 'linha 1 vazia')
  assert(r.line2.chords[0]?.pos === 0, 'acorde mantém pos relativo')
}

{
  const r = splitChordLineAt(lineInput('A  B', [{ pos: 3, chord: 'E' }]), 2)
  assert(r.ok, 'preserva espaços no corte')
  assert(r.line1.lyricLine === 'A ', 'espaço fica na linha 1')
  assert(r.line2.lyricLine === ' B', 'resto com espaço')
}

console.log(`\n${passed} ok, ${failed} falhou`)
process.exit(failed > 0 ? 1 : 0)
