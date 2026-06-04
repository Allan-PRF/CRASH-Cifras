const query = 'Me Leva Pra Casa Israel Subira'
const apiUrl = `https://www.cifraclub.com.br/api/v1/songs/search?q=${encodeURIComponent(query)}&limit=8`

const searchRes = await fetch(apiUrl, {
  headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
})
console.log('search status', searchRes.status)
const data = await searchRes.json()
console.log('search type', Array.isArray(data) ? 'array' : typeof data)
console.log('search sample', JSON.stringify(Array.isArray(data) ? data.slice(0, 3) : data, null, 2))

const pageUrl = 'https://www.cifraclub.com.br/israel-subira/me-leva-pra-casa/'
const pageRes = await fetch(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
console.log('page status', pageRes.status, 'url', pageUrl)
const html = await pageRes.text()
console.log('html length', html.length)
console.log('first 2000 chars:\n', html.slice(0, 2000))
console.log('---')
console.log('pre cifra', /<pre[^>]*cifra/i.test(html))
console.log('content json', /"content"\s*:/.test(html))
const tones = [...html.matchAll(/"tone"\s*:\s*"([^"]+)"/gi)].slice(0, 5)
console.log('tone fields', tones.map((m) => m[0]))
const tomOrig = [...html.matchAll(/tomOriginal["\s:]+["']([^"']+)/gi)].slice(0, 5)
console.log('tomOriginal', tomOrig.map((m) => m[0]))
const dataKey = [...html.matchAll(/data-key=["']([^"']+)["']/gi)].slice(0, 10)
console.log('data-key', dataKey.map((m) => m[0]))
const tomLabel = html.match(/Tom\s*:\s*([A-G][#b]?m?)/i)
console.log('Tom: label', tomLabel?.[0])
