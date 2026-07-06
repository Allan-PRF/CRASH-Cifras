import { useEffect, useState } from 'react'

/** Mesmo breakpoint do Tailwind `sm:` — abaixo disso = mobile teleprompter. */
export const TELEPROMPTER_MOBILE_MAX_WIDTH = 639

export function useIsMobile(maxWidth = TELEPROMPTER_MOBILE_MAX_WIDTH) {
  const query = `(max-width: ${maxWidth}px)`

  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(query)
    const update = () => setMobile(mq.matches)
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [query])

  return mobile
}
