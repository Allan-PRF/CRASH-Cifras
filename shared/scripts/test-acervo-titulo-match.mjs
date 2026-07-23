/**
 * Critério da guarda de título/artista no publish (só comparação).
 * node scripts/test-acervo-titulo-match.mjs
 */
import {
  isSameAcervoSong,
  precisaConfirmacaoTituloAcervo,
  stripTitleNoise,
  jaccardTokens,
} from '../acervoTituloMatch.js'

let passed = 0
let failed = 0
function assert(cond, label, detail = '') {
  if (cond) {
    passed++
    console.log(`  ✓ ${label}`)
  } else {
    failed++
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

const cases = [
  {
    name: '1 Thamires (cosmético) — NÃO avisar',
    expectWarn: false,
    tituloCopia: 'Thamires Garcia - Nunca Foi Sobre Nós + Doxologia - Ao Vivo',
    artistaCopia: 'Thamires Garcia Oficial',
    tituloAcervo: 'Nunca Foi Sobre Nós + Doxologia - Ao Vivo',
    artistaAcervo: 'Thamires Garcia',
  },
  {
    name: '2 Theo (cosmético) — NÃO avisar',
    expectWarn: false,
    tituloCopia: 'Eu só quero Tua presença -  ( Theo Rubia )',
    artistaCopia: 'Theo Rubia',
    tituloAcervo: 'Eu Só Quero Tua Presença - (Video Oficial)',
    artistaAcervo: 'Theo Rubia',
  },
  {
    name: '3 Me Ama / Com Muito Louvor — AVISAR',
    expectWarn: true,
    tituloCopia: 'Me Ama',
    artistaCopia: 'John Dias',
    tituloAcervo: 'Com Muito Louvor',
    artistaAcervo: 'Cassiane',
  },
  {
    name: '4 publish normal (acento) — NÃO avisar',
    expectWarn: false,
    tituloCopia: 'Bondade de Deus',
    artistaCopia: 'Isaías Saad',
    tituloAcervo: 'Bondade De Deus',
    artistaAcervo: 'Isaias Saad',
  },
  {
    name: '5 Me Ama / Me Ama_ Diante do Trono — AVISAR (artista diferente)',
    expectWarn: true,
    tituloCopia: 'Me Ama',
    artistaCopia: 'John Dias',
    tituloAcervo: 'Me Ama_',
    artistaAcervo: 'Diante do Trono',
  },
]

console.log('\n=== Guarda título/artista (5 casos) ===\n')

for (const c of cases) {
  const same = isSameAcervoSong(c)
  const warn = precisaConfirmacaoTituloAcervo(c)
  console.log(`— ${c.name}`)
  console.log(
    `  strip: "${stripTitleNoise(c.tituloCopia)}" vs "${stripTitleNoise(c.tituloAcervo)}" · J=${jaccardTokens(c.tituloCopia, c.tituloAcervo).toFixed(3)}`,
  )
  console.log(
    `  artistas: "${stripTitleNoise(c.artistaCopia)}" vs "${stripTitleNoise(c.artistaAcervo)}"`,
  )
  assert(warn === c.expectWarn, `warn=${warn} (esperado ${c.expectWarn})`, `same=${same}`)
}

console.log(`\n${passed} ok, ${failed} falhou\n`)
process.exit(failed > 0 ? 1 : 0)
