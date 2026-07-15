/**
 * Testes do rascunho local (lógica pura + ciclo save/restore em memória).
 * IndexedDB real fica no browser; aqui validamos payload completo e oferta por conteúdo.
 */
import assert from 'node:assert/strict'
import {
  buildMusicaEditDraftPayload,
  draftContentKey,
  isDraftNewerThanSaved,
  musicaEditDraftKey,
  shouldOfferDraftRestore,
} from '../src/lib/musicaEditDraft.js'

assert.equal(
  musicaEditDraftKey('u1', 'm1'),
  'crash-cifra-draft:u1:m1',
)
assert.equal(
  musicaEditDraftKey('u1', 'm1', 'ev9'),
  'crash-cifra-draft:u1:m1:evento:ev9',
)
assert.equal(musicaEditDraftKey(null, 'm1'), null)

const savedAt = '2026-07-13T12:00:00.000Z'
const savedMs = new Date(savedAt).getTime()

assert.equal(isDraftNewerThanSaved(null, savedAt), false)
assert.equal(isDraftNewerThanSaved({ updatedAt: savedMs - 1000 }, savedAt), false)
assert.equal(isDraftNewerThanSaved({ updatedAt: savedMs }, savedAt), false)
assert.equal(isDraftNewerThanSaved({ updatedAt: savedMs + 1 }, savedAt), true)
assert.equal(isDraftNewerThanSaved({ updatedAt: Date.now() }, null), true)

const secoes = [
  {
    id: 's1',
    slug: 'verso',
    nome: 'Verso 1',
    ordem_original: 0,
    linhas: {
      lines: [
        {
          chordLine: 'C     G',
          lyricLine: 'Clamo Jesus',
          chords: [
            { symbol: 'C', pos: 0 },
            { symbol: 'G', pos: 6 },
          ],
        },
      ],
    },
  },
]

const intro = { mao_esquerda: 'C G Am', mao_direita: 'Em F' }
const prefs = { modo: 'auto', momentos_ativos: ['inicio'] }

const payload = buildMusicaEditDraftPayload({
  userId: 'user-a',
  musicaId: 'musica-clamo',
  meta: {
    titulo: 'Clamo Jesus',
    artista: ' collab ',
    tom_original: 'C',
    bpm: 72,
  },
  intro,
  secoes,
  versiculoPrefs: prefs,
  offsetVisual: 2,
  tomDestino: 'D',
  updatedAt: savedMs + 5000,
})

assert.equal(payload.version, 1)
assert.equal(payload.musicaId, 'musica-clamo')
assert.equal(payload.meta.titulo, 'Clamo Jesus')
assert.equal(payload.meta.tom_original, 'C')
assert.equal(payload.meta.bpm, 72)
assert.deepEqual(payload.intro, intro)
assert.deepEqual(payload.secoes, secoes)
assert.deepEqual(payload.versiculoPrefs, prefs)
assert.equal(payload.offsetVisual, 2)
assert.equal(payload.tomDestino, 'D')

// Mutação no original não deve afetar o draft (clone).
secoes[0].linhas.lines[0].lyricLine = 'ALTERADO'
intro.mao_esquerda = 'X'
assert.equal(payload.secoes[0].linhas.lines[0].lyricLine, 'Clamo Jesus')
assert.equal(payload.intro.mao_esquerda, 'C G Am')

// Ciclo “perder sessão → Continuar”: memória simula IndexedDB.
const memory = new Map()
const key = musicaEditDraftKey(payload.userId, payload.musicaId)
memory.set(key, structuredClone(payload))

const restored = memory.get(key)
assert.ok(isDraftNewerThanSaved(restored, savedAt))
assert.equal(restored.meta.titulo, 'Clamo Jesus')
assert.equal(restored.meta.tom_original, 'C')
assert.equal(restored.meta.bpm, 72)
assert.equal(restored.intro.mao_esquerda, 'C G Am')
assert.equal(restored.intro.mao_direita, 'Em F')
assert.equal(restored.secoes[0].linhas.lines[0].lyricLine, 'Clamo Jesus')
assert.equal(restored.secoes[0].linhas.lines[0].chords[1].symbol, 'G')
assert.equal(restored.versiculoPrefs.modo, 'auto')

memory.delete(key)
assert.equal(memory.has(key), false)

// A) Conteúdo diferente mesmo com draft.updatedAt ≤ musica.updated_at (save parcial).
const savedComparable = buildMusicaEditDraftPayload({
  userId: 'user-a',
  musicaId: 'musica-clamo',
  meta: {
    titulo: 'Clamo Jesus',
    artista: 'collab',
    tom_original: 'C',
    bpm: 72,
  },
  intro: { mao_esquerda: 'C G Am', mao_direita: 'Em F' },
  secoes: [
    {
      id: 's1',
      slug: 'verso',
      nome: 'Verso 1',
      ordem_original: 0,
      linhas: {
        lines: [
          {
            chordLine: 'C     G',
            lyricLine: 'Clamo Jesus',
            chords: [
              { symbol: 'C', pos: 0 },
              { symbol: 'G', pos: 6 },
            ],
          },
        ],
      },
    },
  ],
  versiculoPrefs: prefs,
})

const draftParcial = buildMusicaEditDraftPayload({
  userId: 'user-a',
  musicaId: 'musica-clamo',
  meta: savedComparable.meta,
  intro: savedComparable.intro,
  secoes: [
    {
      ...savedComparable.secoes[0],
      linhas: {
        lines: [
          {
            ...savedComparable.secoes[0].linhas.lines[0],
            lyricLine: 'Clamo Jesus (editado após save parcial)',
          },
        ],
      },
    },
  ],
  versiculoPrefs: prefs,
  // timestamp MAIS VELHO que o updated_at do servidor após updateMusica
  updatedAt: savedMs - 5000,
})

assert.equal(isDraftNewerThanSaved(draftParcial, savedAt), false)
assert.ok(shouldOfferDraftRestore(draftParcial, savedComparable))
assert.notEqual(draftContentKey(draftParcial), draftContentKey(savedComparable))

// Idêntico ao salvo → não oferecer (mesmo com timestamp “novo”).
const draftIgual = buildMusicaEditDraftPayload({
  ...savedComparable,
  updatedAt: Date.now() + 99999,
})
assert.equal(shouldOfferDraftRestore(draftIgual, savedComparable), false)
assert.equal(shouldOfferDraftRestore(null, savedComparable), false)

console.log('ok: test-musica-edit-draft')
