const YOUTUBE_DOMAINS = ['youtube.com', 'youtu.be', 'www.youtube.com', 'm.youtube.com']

const INTERNAL_PATTERNS = ['localhost', '127.0.0.1', '0.0.0.0', '192.168.', '10.', '172.']

/**
 * @param {string} url
 * @returns {{ valid: boolean, videoId: string | null, error: string | null }}
 */
export function validateYoutubeUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, videoId: null, error: 'URL inválida.' }
  }

  if (url.length > 200) {
    return { valid: false, videoId: null, error: 'URL muito longa.' }
  }

  const trimmed = url.trim()

  let parsedUrl
  try {
    parsedUrl = new URL(trimmed)
  } catch {
    return { valid: false, videoId: null, error: 'Formato de URL inválido.' }
  }

  if (parsedUrl.protocol !== 'https:') {
    return { valid: false, videoId: null, error: 'Apenas links HTTPS são aceitos.' }
  }

  const isYoutube = YOUTUBE_DOMAINS.some(
    (domain) => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`),
  )
  if (!isYoutube) {
    return { valid: false, videoId: null, error: 'Apenas links do YouTube são aceitos.' }
  }

  if (INTERNAL_PATTERNS.some((p) => trimmed.includes(p))) {
    return { valid: false, videoId: null, error: 'URL não permitida.' }
  }

  let videoId = null
  if (parsedUrl.hostname === 'youtu.be') {
    videoId = parsedUrl.pathname.slice(1).split('/')[0]
  } else {
    videoId = parsedUrl.searchParams.get('v')
  }

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return { valid: false, videoId: null, error: 'ID do vídeo inválido.' }
  }

  return { valid: true, videoId, error: null }
}

/** Embed seguro — nunca usar URL crua do usuário em iframe. */
export function getYoutubeEmbedUrl(videoId) {
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return null
  }
  return `https://www.youtube-nocookie.com/embed/${videoId}`
}
