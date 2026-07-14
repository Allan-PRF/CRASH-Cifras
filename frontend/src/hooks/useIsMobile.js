import { useEffect, useState } from 'react'

/** Lado curto ≤ isto = aparelho pequeno (retrato ou paisagem). */
export const TELEPROMPTER_MOBILE_MAX_WIDTH = 639

/**
 * True se a menor dimensão da viewport é de aparelho pequeno.
 * Celular deitado (ex. 844×390) continua mobile; PC (1920×1080) não.
 */
export function isTeleprompterMobileViewport(
  width = typeof window !== 'undefined' ? window.innerWidth : 0,
  height = typeof window !== 'undefined' ? window.innerHeight : 0,
  maxShortSide = TELEPROMPTER_MOBILE_MAX_WIDTH,
) {
  return Math.min(width, height) <= maxShortSide
}

export function useIsMobile(maxShortSide = TELEPROMPTER_MOBILE_MAX_WIDTH) {
  const [mobile, setMobile] = useState(() => isTeleprompterMobileViewport())

  useEffect(() => {
    const update = () =>
      setMobile(
        isTeleprompterMobileViewport(
          window.innerWidth,
          window.innerHeight,
          maxShortSide,
        ),
      )
    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [maxShortSide])

  return mobile
}
