/**
 * Teste de diagnóstico: busca Cifra Club para "Israel Subira - Me Leva Pra Casa"
 * Rode: node scripts/test-import-cifraclub.mjs
 */
import { buscarCifraNoCifraClub } from '../lib/cifraClub.js'

const esperada = 'https://www.cifraclub.com.br/israel-subira/me-leva-pra-casa/'

console.log('=== Teste Cifra Club ===\n')
console.log('URL esperada:', esperada, '\n')

const resultado = await buscarCifraNoCifraClub({
  titulo: 'Me Leva Pra Casa',
  artista: 'Israel Subira',
})

console.log('\n=== Resultado ===')
if (!resultado) {
  console.log('FALHOU: retornou null')
  process.exit(1)
}

console.log('URL obtida:', resultado.url)
console.log('URL bate?', resultado.url === esperada)
console.log('Tom:', resultado.tom, '(esperado D# / Eb do Cifra Club)')
console.log('BPM:', resultado.bpm ?? '(não informado na página)')
console.log('Seções:', resultado.secoes?.length)
console.log(
  'Nomes das seções:',
  resultado.secoes?.map((s) => s.nome).join(', '),
)
console.log(
  'Primeira linha de cifra (refrao):',
  resultado.secoes?.find((s) => s.slug === 'refrao')?.linhas_cifras?.[0]?.slice(0, 80),
)

process.exit(resultado.url === esperada && resultado.tom === 'D#' ? 0 : 2)
