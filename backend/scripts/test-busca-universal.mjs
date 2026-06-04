import { buscarCifraNoCifraClub } from '../lib/cifraClub.js'

const casos = [
  {
    nome: 'Sublime | fhop music',
    titulo: 'Sublime (Ao Vivo) | fhop music',
    artista: 'fhop music',
  },
  {
    nome: 'Me Leva Pra Casa',
    titulo: 'Me Leva Pra Casa',
    artista: 'Israel Subira',
  },
]

for (const c of casos) {
  console.log('\n==========', c.nome, '==========')
  const r = await buscarCifraNoCifraClub({ titulo: c.titulo, artista: c.artista })
  console.log(
    r
      ? `OK url=${r.url} secoes=${r.secoes.length} tom=${r.tom}`
      : 'FALHOU',
  )
}
