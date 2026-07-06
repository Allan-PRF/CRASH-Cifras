/** Intervalo base entre reaparições do banner automático (dias). */
export const DIAS_ENTRE_CONVITES = 4

/** Multiplicador máximo após vários "agora não" (ex.: 4 × 3 = 12 dias). */
export const DISMISS_BACKOFF_MAX = 3

const LS_DISMISSED_AT = 'pwa-install-dismissed-at'
const LS_DISMISS_COUNT = 'pwa-install-dismiss-count'
const LS_DISMISSED_LEGACY = 'pwa-install-dismissed'

const MS_PER_DAY = 86_400_000

export function isPwaInstalled() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || window.navigator.standalone === true
  )
}

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

/** iOS (e similares) sem prompt nativo — instrução manual ao tocar em Instalar. */
export function supportsManualInstall() {
  return !isPwaInstalled() && isIosDevice()
}

function migrateLegacyDismiss() {
  if (typeof localStorage === 'undefined') return
  if (localStorage.getItem(LS_DISMISSED_LEGACY) !== '1') return
  if (localStorage.getItem(LS_DISMISSED_AT)) {
    localStorage.removeItem(LS_DISMISSED_LEGACY)
    return
  }
  localStorage.setItem(LS_DISMISSED_AT, new Date().toISOString())
  localStorage.setItem(LS_DISMISS_COUNT, '1')
  localStorage.removeItem(LS_DISMISSED_LEGACY)
}

export function getDismissCount() {
  migrateLegacyDismiss()
  const raw = localStorage.getItem(LS_DISMISS_COUNT)
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function getDismissedAt() {
  migrateLegacyDismiss()
  const raw = localStorage.getItem(LS_DISMISSED_AT)
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

export function getEffectiveIntervalDays(dismissCount = getDismissCount()) {
  const multiplier = dismissCount > 0
    ? Math.min(dismissCount, DISMISS_BACKOFF_MAX)
    : 1
  return DIAS_ENTRE_CONVITES * multiplier
}

export function shouldShowAutoBanner(now = Date.now()) {
  if (isPwaInstalled()) return false
  const dismissedAt = getDismissedAt()
  if (!dismissedAt) return true
  const elapsedDays = (now - dismissedAt.getTime()) / MS_PER_DAY
  return elapsedDays >= getEffectiveIntervalDays()
}

export function recordBannerDismiss() {
  const count = getDismissCount() + 1
  localStorage.setItem(LS_DISMISSED_AT, new Date().toISOString())
  localStorage.setItem(LS_DISMISS_COUNT, String(count))
}
