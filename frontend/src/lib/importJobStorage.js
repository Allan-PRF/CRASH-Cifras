const PREFIX = 'crash-import-job'
const DONE_PREFIX = 'crash-import-done'

function storageKey(ministroId) {
  return `${PREFIX}-${ministroId}`
}

function doneKey(ministroId) {
  return `${DONE_PREFIX}-${ministroId}`
}

/** Mesma regra do CTA do ImportarYoutubeModal. */
export function isCifraImportPronta(etapa) {
  const e = String(etapa || '')
  return e.includes('Cifra do acervo') || e.includes('Cifra gerada')
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

/** Limpa só o job em andamento — NÃO apaga o convite de conclusão. */
export function clearImportJobRef(ministroId) {
  if (!ministroId) return
  try {
    localStorage.removeItem(storageKey(ministroId))
  } catch {
    /* ignore */
  }
}

/**
 * Convite persistente após conclusão em segundo plano.
 * Sobrevive a clearImportJobRef e a reload do navegador.
 */
export function saveImportDoneInvite(
  ministroId,
  { musicaId, titulo = 'Música', etapa = '', jobId = null },
) {
  if (!ministroId || !musicaId) return
  try {
    localStorage.setItem(
      doneKey(ministroId),
      JSON.stringify({
        musicaId,
        titulo: titulo || 'Música',
        etapa: etapa || '',
        jobId: jobId || null,
        completedAt: Date.now(),
      }),
    )
  } catch {
    /* ignore */
  }
}

export function loadImportDoneInvite(ministroId) {
  if (!ministroId) return null
  try {
    const raw = localStorage.getItem(doneKey(ministroId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.musicaId) return null
    return parsed
  } catch {
    return null
  }
}

export function clearImportDoneInvite(ministroId) {
  if (!ministroId) return
  try {
    localStorage.removeItem(doneKey(ministroId))
  } catch {
    /* ignore */
  }
}
