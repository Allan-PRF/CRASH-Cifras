import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { fetchUserSettings } from '../services/settings'

export function useUserSettings({ enabled = true } = {}) {
  const { user, loading: authLoading } = useAuth()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(null)

  const shouldLoad = enabled && !authLoading && !!user

  const load = useCallback(async () => {
    if (!shouldLoad) return
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
  }, [shouldLoad])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      setSettings(null)
      setError(null)
      return
    }
    if (authLoading) {
      setLoading(true)
      return
    }
    if (!user) {
      setLoading(false)
      setSettings(null)
      setError(null)
      return
    }
    load()
  }, [enabled, authLoading, user, load])

  return { settings, loading, error, reload: load, setSettings }
}
