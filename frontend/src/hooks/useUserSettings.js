import { useCallback, useEffect, useState } from 'react'
import { fetchUserSettings } from '../services/settings'

export function useUserSettings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchUserSettings()
      setSettings(data)
    } catch (err) {
      setError(err.message)
      setSettings(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { settings, loading, error, reload: load, setSettings }
}
