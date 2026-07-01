import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchMinistros } from '../services/ministros'

export function useMinistros({ enabled = true } = {}) {
  const [ministros, setMinistros] = useState([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(null)
  const requestSeq = useRef(0)

  const load = useCallback(async () => {
    if (!enabled) return
    const seq = ++requestSeq.current
    setLoading(true)
    setError(null)
    try {
      const data = await fetchMinistros()
      if (seq !== requestSeq.current) return
      setMinistros(data)
    } catch (err) {
      if (seq !== requestSeq.current) return
      setError(err.message)
      setMinistros([])
    } finally {
      if (seq === requestSeq.current) setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      setMinistros([])
      return
    }
    load()
  }, [load, enabled])

  return { ministros, loading, error, reload: load }
}
