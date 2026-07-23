import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../lib/api'

const PROTECTED_PREFIXES = [
  '/',
  '/playlist',
  '/assinatura',
  '/configuracoes',
  '/conta',
  '/historico',
  '/ministro',
  '/musica',
]

function isProtectedPath(pathname) {
  if (pathname === '/login') return false
  if (pathname === '/acesso-negado' || pathname === '/rastreio-bot') return false
  return PROTECTED_PREFIXES.some((prefix) =>
    prefix === '/' ? pathname === '/' : pathname.startsWith(prefix),
  )
}

export function useSecurityGuard() {
  const location = useLocation()

  useEffect(() => {
    if (!isProtectedPath(location.pathname)) return

    const checks = {
      webdriver: navigator.webdriver === true,
      phantom: typeof window.phantom !== 'undefined',
      nightmare: typeof window.__nightmare !== 'undefined',
      selenium: typeof window.__selenium_evaluate !== 'undefined',
      headlessUA: /HeadlessChrome|Headless/i.test(navigator.userAgent),
      noPlugins:
        navigator.plugins?.length === 0 && !navigator.userAgent.includes('Mobile'),
      automation:
        typeof window.__webdriver_script_fn !== 'undefined' ||
        typeof window._phantom !== 'undefined',
    }

    const suspiciousCount = Object.values(checks).filter(Boolean).length

    if (suspiciousCount >= 2) {
      api
        .post('/security/report-bot', {
          checks,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          url: window.location.href,
        })
        .catch(() => {})

      window.location.replace('/acesso-negado')
    }
  }, [location.pathname])
}
