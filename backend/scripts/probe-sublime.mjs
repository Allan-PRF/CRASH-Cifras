const urls = [
  'https://www.cifraclub.com.br/fhop-music/sublime/',
  'https://www.cifraclub.com.br/fhop/sublime/',
  'https://www.cifraclub.com.br/fhop-music/',
]

for (const u of urls) {
  const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' } })
  const h = await r.text()
  const hasCifra = /class="cifra_cnt/.test(h)
  const title = h.match(/<title>([^<]+)/i)?.[1]
  console.log(r.status, hasCifra, title, u)
}
