/** Distância mínima (px) para considerar toque como arraste, não tap. */
export const TELEPROMPTER_TAP_MOVE_THRESHOLD_PX = 12

/**
 * Estado mutável para distinguir tap (pausa) de arraste (scroll nativo).
 * Uso: touchStart → touchMove → click (click ignorado se houve arraste).
 */
export function createTouchTapGuard() {
  return { moved: false, startX: 0, startY: 0 }
}

export function onTouchStartForTapGuard(guard, event) {
  const t = event.touches[0]
  if (!t) return
  guard.startX = t.clientX
  guard.startY = t.clientY
  guard.moved = false
}

export function onTouchMoveForTapGuard(guard, event) {
  const t = event.touches[0]
  if (!t) return
  const dx = Math.abs(t.clientX - guard.startX)
  const dy = Math.abs(t.clientY - guard.startY)
  if (dx > TELEPROMPTER_TAP_MOVE_THRESHOLD_PX || dy > TELEPROMPTER_TAP_MOVE_THRESHOLD_PX) {
    guard.moved = true
  }
}

/** Retorna true se o click deve ser ignorado (foi arraste). */
export function consumeTapGuardAfterClick(guard) {
  if (guard.moved) {
    guard.moved = false
    return true
  }
  return false
}
