/**
 * Simula metadados do YouTube e o fluxo tom/BPM do importar (sem Whisper).
 */
import { buscarCifraNoCifraClub } from '../lib/cifraClub.js'
import { TODOS_TONS } from '@crash-cifras/shared/constants'

function slugifyBusca(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseTituloArtistaYoutube(data) {
  const tituloYoutube = String(data.title || '').trim()
  const track = String(data.track || '').trim()
  const artistaMeta = String(data.artist || data.uploader || data.channel || '').trim()

  if (track && artistaMeta) {
    return { titulo: track, artista: artistaMeta, tituloYoutube }
  }

  const tituloLimpo = tituloYoutube
    .replace(/\s*[\(\[][^\)\]]*[\)\]]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const separadores = [' - ', ' – ', ' — ', ' | ']
  for (const sep of separadores) {
    const idx = tituloLimpo.indexOf(sep)
    if (idx <= 0) continue
    const parte1 = tituloLimpo.slice(0, idx).trim()
    const parte2 = tituloLimpo.slice(idx + sep.length).trim()
    if (!parte1 || !parte2) continue

    const slugArtista = slugifyBusca(artistaMeta)
    if (slugArtista && slugArtista === slugifyBusca(parte2)) {
      return { titulo: parte1, artista: parte2, tituloYoutube }
    }
    if (slugArtista && slugArtista === slugifyBusca(parte1)) {
      return { titulo: parte2, artista: parte1, tituloYoutube }
    }
    return { titulo: parte2, artista: parte1, tituloYoutube }
  }

  return {
    titulo: tituloYoutube,
    artista: artistaMeta || 'YouTube',
    tituloYoutube,
  }
}

function normalizarTomImport(tom) {
  if (tom == null || tom === '') return null
  const candidato = String(tom).trim().replace(/\s+/g, '')
  if (TODOS_TONS.includes(candidato)) return candidato
  return null
}

const cenarios = [
  {
    nome: 'título único (bug antigo)',
    data: {
      title: 'Me Leva Pra Casa - Israel Subirá',
      artist: 'Israel Subirá',
    },
  },
  {
    nome: 'track + artist yt-dlp',
    data: {
      title: 'Me Leva Pra Casa - Israel Subirá (Official Video)',
      track: 'Me Leva Pra Casa',
      artist: 'Israel Subirá',
    },
  },
  {
    nome: 'artista primeiro no título',
    data: {
      title: 'Israel Subirá - Me Leva Pra Casa',
      artist: 'Israel Subirá',
    },
  },
]

for (const c of cenarios) {
  const meta = parseTituloArtistaYoutube(c.data)
  const cc = await buscarCifraNoCifraClub({
    titulo: meta.titulo,
    artista: meta.artista,
  })
  const fonte = Boolean(cc?.secoes?.length)
  const tomCC = fonte ? normalizarTomImport(cc.tom) : null

  console.log('\n===', c.nome, '===')
  console.log('parse:', meta)
  console.log('CC:', fonte ? 'OK' : 'FALHOU', '| url:', cc?.url)
  console.log('tom CC:', tomCC)
}
