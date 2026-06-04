import { useCallback, useEffect, useState } from 'react'
import { fetchMinistros } from '../services/ministros'

export function useMinistros({ enabled = true } = {}) {
  const [ministros, setMinistros] = useState([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchMinistros()
      setMinistros(data)
    } catch (err) {
      setError(err.message)
      setMinistros([])
    } finally {
      setLoading(false)
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
