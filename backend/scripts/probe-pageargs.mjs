const pageUrl = 'https://www.cifraclub.com.br/israel-subira/me-leva-pra-casa/'
const html = await (
  await fetch(pageUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  })
).text()

const m = html.match(/window\.__pageArgs\s*=\s*(\{[\s\S]*?\});/)
if (m) {
  const args = JSON.parse(m[1])
  console.log('pageArgs keys', Object.keys(args))
  console.log(JSON.stringify(args, null, 2))
}

const vars = [...html.matchAll(/window\.(__[a-zA-Z0-9_]+)\s*=/g)]
console.log('window vars', [...new Set(vars.map((v) => v[1]))])

// try common CC API endpoints
const endpoints = [
  'https://www.cifraclub.com.br/api/v3/cifra/israel-subira/me-leva-pra-casa',
  'https://www.cifraclub.com.br/api/v3/song/israel-subira/me-leva-pra-casa',
  'https://api.cifraclub.com.br/v3/cifra/israel-subira/me-leva-pra-casa',
  'https://www.cifraclub.com.br/israel-subira/me-leva-pra-casa/api/',
  'https://www.cifraclub.com.br/api/v3/version/israel-subira/me-leva-pra-casa',
]

const headers = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json',
}

for (const url of endpoints) {
  try {
    const res = await fetch(url, { headers })
    const text = await res.text()
    console.log('\n', url, res.status, text.slice(0, 300))
  } catch (e) {
    console.log(url, e.message)
  }
}
