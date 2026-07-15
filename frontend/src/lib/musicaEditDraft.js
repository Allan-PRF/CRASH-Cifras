/**
 * Rascunho de edição 100% local (IndexedDB via idb-keyval).
 * Nunca envia nada ao servidor/acervo — só get/set/del no dispositivo.
 */
import { createStore, del, get, set } from 'idb-keyval'

const store = createStore('crash-cifras-drafts', 'musica-edit')

export const DRAFT_DEBOUNCE_MS = 2500

/** Handler síncrono/async registrado pela tela de edição (flush antes de redirect). */
let flushHandler = null

/**
 * @param {(() => void | Promise<void>) | null} fn
 */
export function registerMusicaEditDraftFlush(fn) {
  flushHandler = typeof fn === 'function' ? fn : null
}

/** Grava o rascunho atual no IndexedDB antes de sair da tela / renovar sessão. */
export async function flushMusicaEditDraftNow() {
  if (typeof flushHandler !== 'function') return
  try {
    await flushHandler()
  } catch (err) {
    console.warn('[draft] falha no flush do rascunho:', err?.message || err)
  }
}

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
 * Fingerprint estável do conteúdo editável (ignora timestamp / ids de sessão).
 * Usado para decidir se o aviso Continuar/Descartar deve aparecer.
 * @param {{ meta?: object, intro?: object, secoes?: object[], versiculoPrefs?: unknown } | null | undefined} draft
 */
export function draftContentKey(draft) {
  if (!draft || typeof draft !== 'object') return ''
  const secoes = (draft.secoes || []).map((s) => ({
    slug: s?.slug ?? '',
    nome: s?.nome ?? '',
    ordem_original: s?.ordem_original ?? 0,
    linhas: s?.linhas ?? null,
  }))
  return JSON.stringify({
    meta: {
      titulo: draft.meta?.titulo ?? '',
      artista: draft.meta?.artista ?? null,
      tom_original: draft.meta?.tom_original ?? null,
      bpm: draft.meta?.bpm ?? null,
    },
    intro: draft.intro ?? { mao_esquerda: '', mao_direita: '' },
    secoes,
    versiculoPrefs: draft.versiculoPrefs ?? null,
  })
}

/**
 * Oferece restaurar se o rascunho tiver conteúdo diferente do que está no servidor.
 * (Não depende só de updatedAt — evita esconder rascunho após save parcial.)
 * @param {object | null | undefined} draft
 * @param {object | null | undefined} savedComparable payload no formato do draft
 */
export function shouldOfferDraftRestore(draft, savedComparable) {
  if (!draft || typeof draft !== 'object') return false
  if (!Array.isArray(draft.secoes) && draft.intro == null && draft.meta == null) {
    return false
  }
  return draftContentKey(draft) !== draftContentKey(savedComparable)
}

/**
 * Oferece restaurar só se o rascunho for mais novo que o último save no servidor.
 * @deprecated Preferir shouldOfferDraftRestore (conteúdo); mantido para testes/legado.
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
