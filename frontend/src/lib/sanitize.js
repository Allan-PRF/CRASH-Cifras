import DOMPurify from 'dompurify'

export function sanitizeHtml(dirty) {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br'],
    ALLOWED_ATTR: [],
  })
}

export function sanitizeText(text) {
  if (typeof text !== 'string') return ''
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

export function isYoutubeUrl(url) {
  try {
    const parsed = new URL(url)
    return (
      parsed.protocol === 'https:' &&
      ['youtube.com', 'youtu.be', 'www.youtube.com', 'm.youtube.com'].includes(
        parsed.hostname,
      )
    )
  } catch {
    return false
  }
}
