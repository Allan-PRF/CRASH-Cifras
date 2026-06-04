const TELEPROMPTER_DISPLAY_KEY = 'crash-teleprompter-display'

const DEFAULTS = {
  acordes_visiveis: true,
  graus_visiveis: true,
}

/** Preferências de exibição (acordes / graus) no teleprompter. */
export function loadTeleprompterDisplay() {
  try {
    const raw = localStorage.getItem(TELEPROMPTER_DISPLAY_KEY)
    if (!raw) return { ...DEFAULTS, fromStorage: false }
    const parsed = JSON.parse(raw)
    return {
      acordes_visiveis:
        typeof parsed.acordes_visiveis === 'boolean'
          ? parsed.acordes_visiveis
          : DEFAULTS.acordes_visiveis,
      graus_visiveis:
        typeof parsed.graus_visiveis === 'boolean'
          ? parsed.graus_visiveis
          : DEFAULTS.graus_visiveis,
      fromStorage: true,
    }
  } catch {
    return { ...DEFAULTS, fromStorage: false }
  }
}

export function saveTeleprompterDisplay(partial) {
  try {
    const current = loadTeleprompterDisplay()
    const next = {
      acordes_visiveis: partial.acordes_visiveis ?? current.acordes_visiveis,
      graus_visiveis: partial.graus_visiveis ?? current.graus_visiveis,
    }
    localStorage.setItem(TELEPROMPTER_DISPLAY_KEY, JSON.stringify(next))
    return next
  } catch {
    return null
  }
}

export function hasTeleprompterDisplayStorage() {
  try {
    return localStorage.getItem(TELEPROMPTER_DISPLAY_KEY) != null
  } catch {
    return false
  }
}
