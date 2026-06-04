/** Extrai ID do YouTube para embed a partir de URL ou ID curto. */
export function youtubeEmbedId(urlOrId) {
  if (!urlOrId) return null
  const raw = String(urlOrId).trim()
  if (/^[\w-]{11}$/.test(raw)) return raw

  try {
    const u = new URL(raw)
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.slice(1).split('/')[0] || null
    }
    const v = u.searchParams.get('v')
    if (v) return v
    const embed = u.pathname.match(/\/embed\/([\w-]{11})/)
    if (embed) return embed[1]
  } catch {
    return null
  }
  return null
}

export function youtubeEmbedUrl(urlOrId) {
  const id = youtubeEmbedId(urlOrId)
  return id ? `https://www.youtube.com/embed/${id}` : null
}
