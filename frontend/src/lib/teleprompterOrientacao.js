/**
 * Teleprompter: modos de orientação.
 * TELEPROMPTER_SO_PORTRAIT = true → só modo vertical (fixo/deitado desativados na UI).
 * Mude para false para religar landscape + fixo.
 */
export const TELEPROMPTER_SO_PORTRAIT = true

export const TELEPROMPTER_ORIENT_KEY = 'crash-teleprompter-orientacao'

export const ORIENTACOES = {
  LANDSCAPE: 'landscape',
  PORTRAIT: 'portrait',
  FIXO: 'fixo',
}

export function orientacaoAlternavel() {
  return !TELEPROMPTER_SO_PORTRAIT
}

export function loadOrientacaoTeleprompter() {
  if (TELEPROMPTER_SO_PORTRAIT) {
    try {
      const saved = localStorage.getItem(TELEPROMPTER_ORIENT_KEY)
      if (saved !== ORIENTACOES.PORTRAIT) {
        localStorage.setItem(TELEPROMPTER_ORIENT_KEY, ORIENTACOES.PORTRAIT)
      }
    } catch {
      // ignore
    }
    return ORIENTACOES.PORTRAIT
  }

  try {
    const saved = localStorage.getItem(TELEPROMPTER_ORIENT_KEY)
    if (
      saved === ORIENTACOES.LANDSCAPE ||
      saved === ORIENTACOES.PORTRAIT ||
      saved === ORIENTACOES.FIXO
    ) {
      return saved
    }
  } catch {
    // ignore
  }
  return ORIENTACOES.FIXO
}

export function saveOrientacaoTeleprompter(orientacao) {
  if (TELEPROMPTER_SO_PORTRAIT) {
    try {
      localStorage.setItem(TELEPROMPTER_ORIENT_KEY, ORIENTACOES.PORTRAIT)
    } catch {
      // ignore
    }
    return
  }
  try {
    localStorage.setItem(TELEPROMPTER_ORIENT_KEY, orientacao)
  } catch {
    // ignore
  }
}
