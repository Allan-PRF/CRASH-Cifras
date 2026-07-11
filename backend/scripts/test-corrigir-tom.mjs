/**
 * Etapa B — prova de que corrigir tom altera só metadado (secoes intactas).
 * Executar: npm run test:corrigir-tom -w backend
 */
import {
  aplicarTomOriginalNaCifra,
  hashCifraNorm,
  hashSecoesNorm,
} from '@crash-cifras/shared'

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

const cifraMotor = {
  tom_original: 'Am',
  bpm: 72,
  intro: { lines: [] },
  secoes: [
    {
      slug: 'verso',
      nome: 'Verso',
      ordem_original: 1,
      linhas: {
        lines: [
          {
            lyricLine: 'Linha de teste',
            chords: [{ pos: 0, chord: 'Am' }, { pos: 12, chord: 'G' }],
          },
        ],
      },
    },
    {
      slug: 'refrão',
      nome: 'Refrão',
      ordem_original: 2,
      linhas: {
        lines: [
          {
            lyricLine: 'Refrão aqui',
            chords: [{ pos: 4, chord: 'F' }, { pos: 16, chord: 'C' }],
          },
        ],
      },
    },
  ],
}

console.log('\n=== Etapa B — corrigir tom na fonte (prova secoes intactas) ===\n')

const tomCorrigido = 'G'
const cifraDepois = aplicarTomOriginalNaCifra(cifraMotor, tomCorrigido)

const hashSecoesAntes = hashSecoesNorm(cifraMotor)
const hashSecoesDepois = hashSecoesNorm(cifraDepois)
const hashNormAntes = hashCifraNorm(cifraMotor)
const hashNormDepois = hashCifraNorm(cifraDepois)

assert(cifraMotor.tom_original === 'Am', 'tom_original antes = Am')
assert(cifraDepois.tom_original === 'G', 'tom_original depois = G')
assert(
  JSON.stringify(cifraMotor.secoes) === JSON.stringify(cifraDepois.secoes),
  'cifra.secoes byte-a-byte iguais',
)
assert(hashSecoesAntes === hashSecoesDepois, 'hash_secoes inalterado', `${hashSecoesAntes}`)
assert(hashNormAntes !== hashNormDepois, 'hash_norm muda com tom_original')
assert(cifraMotor.bpm === cifraDepois.bpm, 'bpm inalterado')
assert(
  JSON.stringify(cifraMotor.intro) === JSON.stringify(cifraDepois.intro),
  'intro inalterada',
)

console.log('\n--- Prova antes/depois ---')
console.log(JSON.stringify({
  tom_original: { antes: cifraMotor.tom_original, depois: cifraDepois.tom_original },
  hash_secoes: { antes: hashSecoesAntes, depois: hashSecoesDepois, iguais: hashSecoesAntes === hashSecoesDepois },
  hash_norm: { antes: hashNormAntes, depois: hashNormDepois, mudou: hashNormAntes !== hashNormDepois },
  secoes_count: { antes: cifraMotor.secoes.length, depois: cifraDepois.secoes.length },
}, null, 2))

console.log(`\n${passed} passou, ${failed} falhou\n`)
process.exit(failed > 0 ? 1 : 0)
