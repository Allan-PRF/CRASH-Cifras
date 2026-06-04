const TELEPROMPTER_BPM_KEY = 'crash-teleprompter-bpm-por-musica'
/** Divergência máxima entre localStorage e cadastro antes de ignorar o cache. */
const CADASTRO_DIVERGENCE = 0.2

function readMap() {
  try {
    const raw = localStorage.getItem(TELEPROMPTER_BPM_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeMap(map) {
  try {
    localStorage.setItem(TELEPROMPTER_BPM_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

function bpmDiffRatio(stored, cadastro) {
  const base = Math.max(1, Math.abs(cadastro))
  return Math.abs(stored - cadastro) / base
}

function normalizeEntry(raw) {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return { bpm: raw, cadastroBpm: null }
  }
  if (raw && typeof raw === 'object' && typeof raw.bpm === 'number') {
    return {
      bpm: raw.bpm,
      cadastroBpm: raw.cadastroBpm ?? null,
    }
  }
  return null
}

export function clearTeleprompterBpm(musicaId) {
  if (!musicaId) return
  const map = readMap()
  delete map[String(musicaId)]
  writeMap(map)
}

export const PORTRAIT_BPM_MIN = 40
export const PORTRAIT_BPM_MAX = 200

export const LANDSCAPE_BPM_MIN = 180
export const LANDSCAPE_BPM_MAX = 300
/** BPM inicial do teleprompter landscape quando não há valor no localStorage. */
export const LANDSCAPE_BPM_PADRAO = 180

export function clampPortraitBpm(value) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return PORTRAIT_BPM_MIN
  return Math.max(PORTRAIT_BPM_MIN, Math.min(PORTRAIT_BPM_MAX, n))
}

export function clampLandscapeBpm(value) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return LANDSCAPE_BPM_PADRAO
  return Math.max(LANDSCAPE_BPM_MIN, Math.min(LANDSCAPE_BPM_MAX, n))
}

/** @param {'portrait' | 'landscape'} orientacao */
export function clampBpmForOrientacao(value, orientacao) {
  return orientacao === 'landscape' ? clampLandscapeBpm(value) : clampPortraitBpm(value)
}

/** BPM da importação/cadastro (banco), limitado ao intervalo portrait. */
export function cadastroBpmFromMusica(musica) {
  const raw = musica?.bpm
  if (raw != null && Number.isFinite(Number(raw)) && Number(raw) >= 1) {
    return clampPortraitBpm(Math.round(Number(raw)))
  }
  return PORTRAIT_BPM_MIN
}

/**
 * BPM do teleprompter: cadastro (banco) é a base; localStorage só ajuste fino do usuário.
 * Se o cadastro mudou ou o cache diverge >20%, usa o cadastro e limpa o cache.
 */
export function loadTeleprompterBpm(musicaId, defaultBpm = PORTRAIT_BPM_MIN) {
  const cadastro = clampPortraitBpm(defaultBpm)
  if (!musicaId) return cadastro

  const map = readMap()
  const entry = normalizeEntry(map[String(musicaId)])
  if (!entry) return cadastro

  const stored = clampPortraitBpm(entry.bpm)

  if (
    entry.cadastroBpm != null &&
    clampPortraitBpm(entry.cadastroBpm) !== cadastro
  ) {
    clearTeleprompterBpm(musicaId)
    return cadastro
  }

  // Cache antigo sem vínculo ao cadastro: prioriza o valor do banco se divergir.
  if (entry.cadastroBpm == null && stored !== cadastro) {
    clearTeleprompterBpm(musicaId)
    return cadastro
  }

  if (bpmDiffRatio(stored, cadastro) > CADASTRO_DIVERGENCE) {
    clearTeleprompterBpm(musicaId)
    return cadastro
  }

  return stored
}

/** Persiste ajuste fino do usuário, vinculado ao BPM do cadastro na época. */
export function saveTeleprompterBpm(musicaId, bpm, cadastroBpm) {
  if (!musicaId) return
  const map = readMap()
  const row = { bpm: clampPortraitBpm(bpm) }
  if (cadastroBpm != null) {
    row.cadastroBpm = clampPortraitBpm(cadastroBpm)
  }
  map[String(musicaId)] = row
  writeMap(map)
}

/** Chave localStorage: BPM landscape por ministro + música (não compartilhado). */
export function landscapeBpmStorageKey(ministroId, musicaId) {
  if (!musicaId) return null
  const mid = ministroId != null && ministroId !== '' ? String(ministroId) : '0'
  return `crash-bpm-landscape-${mid}-${musicaId}`
}

/** Landscape: localStorage ou {@link LANDSCAPE_BPM_PADRAO} se ainda não salvo. */
export function loadLandscapeBpm(ministroId, musicaId) {
  const key = landscapeBpmStorageKey(ministroId, musicaId)
  const fallback = clampLandscapeBpm(LANDSCAPE_BPM_PADRAO)
  if (!key) return fallback
  try {
    const raw = localStorage.getItem(key)
    if (raw == null || raw === '') return fallback
    const n = Number(raw)
    if (Number.isFinite(n) && n >= 1) return clampLandscapeBpm(Math.round(n))
  } catch {
    // ignore
  }
  return fallback
}

export function saveLandscapeBpm(ministroId, musicaId, bpm) {
  const key = landscapeBpmStorageKey(ministroId, musicaId)
  if (!key) return
  try {
    localStorage.setItem(key, String(clampLandscapeBpm(bpm)))
  } catch {
    // ignore
  }
}

/** Portrait: BPM da música (importação / banco). */
export function loadPortraitBpmFromMusica(musica) {
  return cadastroBpmFromMusica(musica)
}
