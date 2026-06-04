import { writeFileSync } from 'fs'

const pageUrl = 'https://www.cifraclub.com.br/israel-subira/me-leva-pra-casa/'
const html = await (
  await fetch(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' } })
).text()

const patterns = [
  '__NEXT_DATA__',
  'tomOriginal',
  '"tone"',
  '"bpm"',
  'Tom:',
  'cifra',
  '"content"',
  'songKey',
  'originalTone',
]
for (const p of patterns) {
  const idx = html.indexOf(p)
  console.log(p, idx >= 0 ? `found @${idx}` : 'NOT FOUND')
}

const next = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
if (next) {
  const json = JSON.parse(next[1])
  writeFileSync('scripts/next-data-sample.json', JSON.stringify(json, null, 2))
  console.log('NEXT_DATA saved, size', next[1].length)
  const pp = json.props?.pageProps || {}
  console.log('pageProps keys', Object.keys(pp))
  console.log('pageProps sample', JSON.stringify(pp, null, 2).slice(0, 3000))
}

// Show context around false tom:c match
const tomMatch = html.match(/Tom\s*:\s*([A-G][#b]?m?)/i)
console.log('bad Tom match', tomMatch?.[0], 'at', tomMatch?.index)
if (tomMatch?.index != null) {
  console.log('context:', html.slice(tomMatch.index - 40, tomMatch.index + 60))
}
