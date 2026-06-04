const q = 'Sublime fhop music'
const urls = [
  `https://www.cifraclub.com.br/api/v1/songs/search?q=${encodeURIComponent(q)}&limit=8`,
  `https://www.cifraclub.com.br/busca/?q=${encodeURIComponent(q)}`,
  `https://www.cifraclub.com.br/?q=${encodeURIComponent(q)}`,
]

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
  Accept: 'text/html,application/json',
}

for (const u of urls) {
  const r = await fetch(u, { headers })
  const t = await r.text()
  console.log('\n', u, r.status, t.slice(0, 400))
  const links = [...t.matchAll(/href="(\/[^"]+\/sublime\/?)"/gi)].slice(0, 5)
  console.log('sublime links', links.map((m) => m[1]))
}
