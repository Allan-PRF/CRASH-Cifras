/**
 * Rascunho de edição 100% local (IndexedDB via idb-keyval).
 * Nunca envia nada ao servidor/acervo — só get/set/del no dispositivo.
 */
import { createStore, del, get, set } from 'idb-keyval'

const store = createStore('crash-cifras-drafts', 'musica-edit')

export const DRAFT_DEBOUNCE_MS = 2500

/**
 * @param {string} userId
 * @param {string} musicaId
 * @param {string | null | undefined} eventoItemId
 */
export function musicaEditDraftKey(userId, musicaId, eventoItemId = null) {
  if (!userId || !musicaId) return null
  const base = `crash-cifra-draft:${userId}:${musicaId}`
  return eventoItemId ? `${base}:evento:${eventoItemId}` : base
}

/**
 * Snapshot completo para restaurar a edição idêntica.
 * @param {object} params
 */
export function buildMusicaEditDraftPayload({
  userId,
  musicaId,
  eventoItemId = null,
  meta,
  intro,
  secoes,
  versiculoPrefs = null,
  offsetVisual = 0,
  tomDestino = null,
  updatedAt = Date.now(),
}) {
  return {
    version: 1,
    updatedAt: Number(updatedAt) || Date.now(),
    userId,
    musicaId,
    eventoItemId: eventoItemId || null,
    meta: {
      titulo: meta?.titulo ?? '',
      artista: meta?.artista ?? null,
      tom_original: meta?.tom_original ?? null,
      bpm: meta?.bpm ?? null,
    },
    intro: structuredClone(intro ?? { mao_esquerda: '', mao_direita: '' }),
    secoes: structuredClone(secoes ?? []),
    versiculoPrefs: versiculoPrefs != null ? structuredClone(versiculoPrefs) : null,
    offsetVisual: Number(offsetVisual) || 0,
    tomDestino: tomDestino ?? null,
  }
}

/**
 * Oferece restaurar só se o rascunho for mais novo que o último save no servidor.
 * @param {{ updatedAt?: number } | null | undefined} draft
 * @param {string | number | Date | null | undefined} musicaUpdatedAt
 */
export function isDraftNewerThanSaved(draft, musicaUpdatedAt) {
  if (!draft || draft.updatedAt == null) return false
  const draftMs = Number(draft.updatedAt)
  if (!Number.isFinite(draftMs)) return false
  if (musicaUpdatedAt == null || musicaUpdatedAt === '') return true
  const savedMs = new Date(musicaUpdatedAt).getTime()
  if (!Number.isFinite(savedMs)) return true
  return draftMs > savedMs
}

export async function getMusicaEditDraft(userId, musicaId, eventoItemId = null) {
  const key = musicaEditDraftKey(userId, musicaId, eventoItemId)
  if (!key) return null
  try {
    const draft = await get(key, store)
    return draft && typeof draft === 'object' ? draft : null
  } catch {
    return null
  }
}

export async function setMusicaEditDraft(payload) {
  const key = musicaEditDraftKey(
    payload?.userId,
    payload?.musicaId,
    payload?.eventoItemId,
  )
  if (!key || !payload) return
  try {
    await set(key, payload, store)
  } catch (err) {
    console.warn('[draft] falha ao gravar rascunho local:', err?.message || err)
  }
}

export async function clearMusicaEditDraft(userId, musicaId, eventoItemId = null) {
  const key = musicaEditDraftKey(userId, musicaId, eventoItemId)
  if (!key) return
  try {
    await del(key, store)
  } catch (err) {
    console.warn('[draft] falha ao limpar rascunho local:', err?.message || err)
  }
}
