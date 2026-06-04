import {
  TELEPROMPTER_YOUTUBE_RIGHT,
  TELEPROMPTER_YOUTUBE_TOP,
  TELEPROMPTER_YOUTUBE_VIDEO_HEIGHT,
  teleprompterYoutubePosPadrao,
} from './teleprompterColunaDireita'

export const YOUTUBE_PLAYER_ENABLED_KEY = 'crash-teleprompter-youtube-enabled'
export const YOUTUBE_PLAYER_SYNC_KEY = 'crash-teleprompter-youtube-sync'
export const YOUTUBE_PLAYER_MINIMIZED_KEY = 'crash-teleprompter-youtube-minimized'
export const YOUTUBE_PLAYER_POS_KEY = 'crash-teleprompter-youtube-pos'
const YOUTUBE_POS_MIGRATION_KEY = 'crash-teleprompter-youtube-pos-migration'
const YOUTUBE_POS_MIGRATION_VERSION = '7'

/** Canto superior direito: top 70px, right 16px. */
export const YOUTUBE_POS_PADRAO = teleprompterYoutubePosPadrao()

export function migrateYoutubePositionStorage() {
  try {
    if (localStorage.getItem(YOUTUBE_POS_MIGRATION_KEY) === YOUTUBE_POS_MIGRATION_VERSION) {
      return false
    }
    localStorage.removeItem(YOUTUBE_PLAYER_POS_KEY)
    localStorage.setItem(YOUTUBE_POS_MIGRATION_KEY, YOUTUBE_POS_MIGRATION_VERSION)
    return true
  } catch {
    return false
  }
}

export function resetYoutubePositionStorage() {
  try {
    localStorage.removeItem(YOUTUBE_PLAYER_POS_KEY)
  } catch {
    // ignore
  }
}

export function loadYoutubePlayerEnabled() {
  try {
    const v = localStorage.getItem(YOUTUBE_PLAYER_ENABLED_KEY)
    if (v === 'false') return false
    return true
  } catch {
    return true
  }
}

export function saveYoutubePlayerEnabled(enabled) {
  try {
    localStorage.setItem(YOUTUBE_PLAYER_ENABLED_KEY, enabled ? 'true' : 'false')
  } catch {
    // ignore
  }
}

export function loadYoutubeSync() {
  try {
    return localStorage.getItem(YOUTUBE_PLAYER_SYNC_KEY) !== 'false'
  } catch {
    return true
  }
}

export function saveYoutubeSync(sync) {
  try {
    localStorage.setItem(YOUTUBE_PLAYER_SYNC_KEY, sync ? 'true' : 'false')
  } catch {
    // ignore
  }
}

export function loadYoutubeMinimized() {
  try {
    return localStorage.getItem(YOUTUBE_PLAYER_MINIMIZED_KEY) === 'true'
  } catch {
    return false
  }
}

export function saveYoutubeMinimized(minimized) {
  try {
    localStorage.setItem(YOUTUBE_PLAYER_MINIMIZED_KEY, minimized ? 'true' : 'false')
  } catch {
    // ignore
  }
}

function clampYoutubeTop(top) {
  const minTop = TELEPROMPTER_YOUTUBE_TOP
  if (typeof window === 'undefined') return Math.max(minTop, top)
  const maxTop = Math.max(
    minTop,
    window.innerHeight - TELEPROMPTER_YOUTUBE_VIDEO_HEIGHT - 80,
  )
  return Math.min(Math.max(minTop, top), maxTop)
}

/** @returns {{ top: number, right: number }} */
export function loadYoutubePosition() {
  migrateYoutubePositionStorage()
  try {
    const raw = localStorage.getItem(YOUTUBE_PLAYER_POS_KEY)
    if (!raw) return { ...YOUTUBE_POS_PADRAO }
    const parsed = JSON.parse(raw)
    if (typeof parsed?.top === 'number') {
      return {
        top: clampYoutubeTop(parsed.top),
        right: TELEPROMPTER_YOUTUBE_RIGHT,
      }
    }
    if (typeof parsed?.bottom === 'number' && typeof window !== 'undefined') {
      const top =
        window.innerHeight - parsed.bottom - TELEPROMPTER_YOUTUBE_VIDEO_HEIGHT
      return {
        top: clampYoutubeTop(top),
        right: TELEPROMPTER_YOUTUBE_RIGHT,
      }
    }
  } catch {
    // ignore
  }
  return { ...YOUTUBE_POS_PADRAO }
}

/** @param {{ top: number, right: number }} pos */
export function saveYoutubePosition(pos) {
  try {
    localStorage.setItem(
      YOUTUBE_PLAYER_POS_KEY,
      JSON.stringify({
        top: pos.top,
        right: TELEPROMPTER_YOUTUBE_RIGHT,
      }),
    )
  } catch {
    // ignore
  }
}

let youtubeApiPromise = null

export function loadYoutubeIframeApi() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('no window'))
  }
  if (window.YT?.Player) return Promise.resolve(window.YT)

  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        if (window.YT?.Player) resolve(window.YT)
        else reject(new Error('YouTube API timeout'))
      }, 10000)

      const anterior = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        window.clearTimeout(timer)
        anterior?.()
        if (window.YT?.Player) resolve(window.YT)
        else reject(new Error('YouTube API indisponível'))
      }

      const existente = document.querySelector('script[src*="youtube.com/iframe_api"]')
      if (!existente) {
        const tag = document.createElement('script')
        tag.src = 'https://www.youtube.com/iframe_api'
        tag.async = true
        document.head.appendChild(tag)
      } else if (window.YT?.Player) {
        window.clearTimeout(timer)
        resolve(window.YT)
      }
    })
  }

  return youtubeApiPromise
}
