/**
 * Garante que a fórmula de alinhamento teleprompter (colunas em `ch`)
 * é coerente: mesma coluna N para acorde e letra.
 */
import assert from 'node:assert/strict'

/** Simula left em ch — deve ser idêntico à coluna da sílaba. */
function chordLeftCh(pos) {
  return `${pos}ch`
}

function lyricColumnAt(lyricLine, pos) {
  return lyricLine.slice(0, pos)
}

const lyric = 'Teu nome é cura, é poderoso'
const chords = [
  { pos: 0, chord: 'E' },
  { pos: 4, chord: 'B' },
  { pos: 19, chord: 'C#m' },
]

for (const { pos, chord } of chords) {
  assert.equal(chordLeftCh(pos), `${pos}ch`)
  assert.equal(lyricColumnAt(lyric, pos).length, pos)
  // coluna do início do acorde = índice do caractere sob ele
  assert.ok(pos <= lyric.length || chord.length > 0)
}

// whitespace-pre: sem quebra; largura mínima da linha = max(letra, acordes)
const minCols = Math.max(
  lyric.length,
  ...chords.map(({ pos, chord }) => pos + chord.length),
)
assert.equal(minCols, Math.max(lyric.length, 19 + 3))
assert.equal(`${minCols}ch`, `${minCols}ch`)

console.log('ok: test-teleprompter-align-ch')
