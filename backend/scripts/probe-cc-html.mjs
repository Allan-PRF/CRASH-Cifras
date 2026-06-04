const pageUrl = 'https://www.cifraclub.com.br/israel-subira/me-leva-pra-casa/'
const html = await (
  await fetch(pageUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html',
    },
  })
).text()

console.log('length', html.length)
const idx = html.indexOf('"content"')
console.log('content idx', idx)
if (idx >= 0) console.log(html.slice(idx - 50, idx + 500))

const apis = [...html.matchAll(/https?:\/\/[^"']+api[^"']*/gi)]
console.log(
  'api urls',
  [...new Set(apis.map((m) => m[0]))].slice(0, 15),
)

for (const p of [
  'tonalidade',
  'Tonalidade',
  'tomOriginal',
  'originalKey',
  'songTone',
  'defaultTone',
  'keyName',
  '"tom"',
  '"tone"',
  '"bpm"',
  'speed',
  'window.__',
  'SSR',
  'pageProps',
]) {
  const i = html.indexOf(p)
  if (i >= 0) console.log(p, i, html.slice(i, i + 100).replace(/\s+/g, ' '))
}

import { buscarCifraNoCifraClub } from '../lib/cifraClub.js'
const r = await buscarCifraNoCifraClub({
  titulo: 'Me Leva Pra Casa',
  artista: 'Israel Subira',
})
console.log('buscar result', r ? { tom: r.tom, bpm: r.bpm, secoes: r.secoes?.length, url: r.url } : null)
