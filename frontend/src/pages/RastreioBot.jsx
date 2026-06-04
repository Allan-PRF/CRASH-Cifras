import { useEffect } from 'react'
import { api } from '../lib/api'

export function RastreioBot() {
  useEffect(() => {
    api
      .post('/security/report-bot', {
        checks: { honeypot: true },
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        url: window.location.href,
      })
      .catch(() => {})
  }, [])

  return null
}
