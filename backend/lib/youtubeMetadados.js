import youtubedl from 'youtube-dl-exec'
import { ytdlpOptions } from './ytdlp.js'

/**
 * Separa "Artista - Música" pelo primeiro " - ".
 * @param {string} rawTitle
 * @returns {{ titulo: string, artista: string }}
 */
export function parseTituloYoutube(rawTitle) {
  const title = String(rawTitle || '').trim()
  if (!title) return { titulo: '', artista: '' }

  const sep = title.indexOf(' - ')
  if (sep > 0) {
    return {
      artista: title.slice(0, sep).trim(),
      titulo: title.slice(sep + 3).trim(),
    }
  }

  return { titulo: title, artista: '' }
}

/**
 * Título bruto do vídeo via yt-dlp (sem baixar áudio).
 * @param {string} url
 * @returns {Promise<string|null>}
 */
export async function buscarTituloVideoYoutube(url) {
  const result = await youtubedl(
    url,
    ytdlpOptions({
      skipDownload: true,
      dumpSingleJson: true,
      noPlaylist: true,
    }),
  )
  const title = result?.title || result?.fulltitle
  return title ? String(title).trim() : null
}
