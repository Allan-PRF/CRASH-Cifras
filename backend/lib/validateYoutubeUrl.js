import {
  validateYoutubeUrl,
  getYoutubeEmbedUrl,
} from '@crash-cifras/shared/validate-youtube-url'

export { validateYoutubeUrl, getYoutubeEmbedUrl }

/**
 * Valida URL e retorna embed seguro (nunca expor URL original ao cliente).
 * @param {string} url
 */
export function validateYoutubeUrlWithEmbed(url) {
  const result = validateYoutubeUrl(url)
  if (!result.valid) {
    return { valid: false, videoId: null, embedUrl: null, error: result.error }
  }
  return {
    valid: true,
    videoId: result.videoId,
    embedUrl: getYoutubeEmbedUrl(result.videoId),
    error: null,
  }
}
