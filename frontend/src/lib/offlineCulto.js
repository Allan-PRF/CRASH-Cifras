const CACHE_PREFIX = 'crash-cifras:culto:'
const CACHE_INDEX = 'crash-cifras:cultos-preparados'

export function cacheCultoPreparado({ playlist, musicas, versiculos, timbres }) {
  const payload = {
    version: 1,
    cachedAt: new Date().toISOString(),
    playlist,
    musicas,
    versiculos,
    timbres,
  }
  localStorage.setItem(`${CACHE_PREFIX}${playlist.id}`, JSON.stringify(payload))

  const index = getCultosPreparadosIndex().filter((item) => item.id !== playlist.id)
  index.unshift({
    id: playlist.id,
    nome: playlist.nome,
    data_culto: playlist.data_culto,
    cachedAt: payload.cachedAt,
    musicas: musicas.length,
  })
  localStorage.setItem(CACHE_INDEX, JSON.stringify(index.slice(0, 12)))
  return payload
}

export function getCultoPreparadoCache(playlistId) {
  const raw = localStorage.getItem(`${CACHE_PREFIX}${playlistId}`)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function getCultosPreparadosIndex() {
  const raw = localStorage.getItem(CACHE_INDEX)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

/** Remove um evento do índice e do payload local. */
export function removeCultoPreparadoFromCache(playlistId) {
  localStorage.removeItem(`${CACHE_PREFIX}${playlistId}`)
  const index = getCultosPreparadosIndex().filter((item) => item.id !== playlistId)
  localStorage.setItem(CACHE_INDEX, JSON.stringify(index))
}

/** Limpa todos os pacotes offline deste dispositivo. */
export function clearAllCultosPreparadosCache() {
  for (const item of getCultosPreparadosIndex()) {
    localStorage.removeItem(`${CACHE_PREFIX}${item.id}`)
  }
  localStorage.removeItem(CACHE_INDEX)
}

/**
 * Remove do cache local eventos que não existem mais no Supabase.
 * @param {(ids: string[]) => Promise<Set<string>>} fetchExistingIds
 * @returns {Promise<Array<{ id: string, nome: string }>>} entradas removidas
 */
export async function pruneStaleOfflineCultos(fetchExistingIds) {
  const index = getCultosPreparadosIndex()
  if (!index.length) return []

  const existing = await fetchExistingIds(index.map((item) => item.id))
  const stale = index.filter((item) => !existing.has(item.id))
  for (const item of stale) {
    removeCultoPreparadoFromCache(item.id)
  }
  return stale
}
