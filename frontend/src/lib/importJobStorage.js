const PREFIX = 'crash-import-job'

function storageKey(ministroId) {
  return `${PREFIX}-${ministroId}`
}

/** Persiste referência ao job em andamento (segundo plano). */
export function saveImportJobRef(ministroId, { jobId, musicaId = null }) {
  if (!ministroId || !jobId) return
  try {
    localStorage.setItem(
      storageKey(ministroId),
      JSON.stringify({ jobId, musicaId, savedAt: Date.now() }),
    )
  } catch {
    /* quota / modo privado */
  }
}

export function loadImportJobRef(ministroId) {
  if (!ministroId) return null
  try {
    const raw = localStorage.getItem(storageKey(ministroId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.jobId) return null
    return parsed
  } catch {
    return null
  }
}

export function clearImportJobRef(ministroId) {
  if (!ministroId) return
  try {
    localStorage.removeItem(storageKey(ministroId))
  } catch {
    /* ignore */
  }
}
