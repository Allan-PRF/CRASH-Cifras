const html = await (
  await fetch('https://www.cifraclub.com.br/florianopolis-house-of-prayer/sublime/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' },
  })
).text()

const bloco = html.match(/<span[^>]*id=["']cifra_tom["'][^>]*>([\s\S]*?)<\/span>/i)
console.log('cifra_tom:', bloco?.[1]?.replace(/\s+/g, ' ').trim().slice(0, 150))
const anchor = bloco?.[1]?.match(/<a[^>]*>([^<]+)<\/a>/i)
console.log('tom oficial:', anchor?.[1])

import { buscarCifraNoCifraClub } from '../lib/cifraClub.js'
const r = await buscarCifraNoCifraClub({ titulo: 'Sublime', artista: 'fhop music' })
console.log('buscarCifra tom:', r?.tom)
