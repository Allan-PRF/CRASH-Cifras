import assert from 'node:assert/strict'
import {
  chordsContentEqual,
  introContentEqual,
  linhasContentEqual,
  secoesContentEqual,
} from '../src/lib/editorHistory.js'

assert.equal(
  introContentEqual(
    { mao_esquerda: 'C', mao_direita: null },
    { mao_esquerda: 'C', mao_direita: '' },
  ),
  true,
)

assert.equal(
  linhasContentEqual(
    {
      lines: [
        {
          lyricLine: 'Eu te amo',
          chords: [{ pos: 0, chord: 'G' }],
          chordLine: 'G',
          segments: [{ text: 'Eu te amo' }],
        },
      ],
    },
    {
      lines: [
        {
          lyricLine: 'Eu te amo',
          chords: [{ pos: 0, chord: 'G' }],
          // metadados cosméticos diferentes não devem contar
          chordLine: 'G   ',
          segments: [],
        },
      ],
    },
  ),
  true,
)

assert.equal(
  secoesContentEqual(
    [{ slug: 'verso', nome: 'Verso 1', linhas: { lines: [{ lyricLine: 'A', chords: [] }] } }],
    [{ slug: 'verso', nome: 'Verso 1', linhas: { lines: [{ lyricLine: 'A', chords: [] }] } }],
  ),
  true,
)

assert.equal(
  secoesContentEqual(
    [{ slug: 'verso', nome: 'Verso 1', linhas: { lines: [{ lyricLine: 'A', chords: [] }] } }],
    [{ slug: 'verso', nome: 'Verso 1', linhas: { lines: [{ lyricLine: 'B', chords: [] }] } }],
  ),
  false,
)

assert.equal(
  chordsContentEqual(
    [{ pos: 0, chord: 'C' }],
    [{ pos: 0, chord: 'C' }],
  ),
  true,
)

assert.equal(
  chordsContentEqual(
    [{ pos: 0, chord: 'C' }],
    [{ pos: 2, chord: 'C' }],
  ),
  false,
)

console.log('editor-history: ok')
