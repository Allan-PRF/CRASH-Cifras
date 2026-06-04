import { useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

/**
 * Rotas autenticadas sem indexação (SEO reservado a login/landing pública).
 * /evento → fluxo de playlist; /config → /configuracoes; /dashboard → /
 */
function shouldNoIndex(pathname) {
  if (pathname === '/' || pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    return true
  }
  if (
    pathname === '/evento' ||
    pathname.startsWith('/evento/') ||
    pathname === '/playlist' ||
    pathname.startsWith('/playlist/')
  ) {
    return true
  }
  if (pathname === '/historico' || pathname.startsWith('/historico/')) {
    return true
  }
  if (
    pathname === '/config' ||
    pathname.startsWith('/config/') ||
    pathname === '/configuracoes' ||
    pathname.startsWith('/configuracoes/')
  ) {
    return true
  }
  if (pathname === '/conta' || pathname.startsWith('/conta/')) {
    return true
  }
  if (pathname === '/assinatura' || pathname.startsWith('/assinatura/')) {
    return true
  }
  return false
}

export function AuthenticatedNoIndex() {
  const { pathname } = useLocation()

  if (!shouldNoIndex(pathname)) {
    return null
  }

  return (
    <Helmet>
      <meta name="robots" content="noindex, nofollow, noarchive, noscraping" />
    </Helmet>
  )
}
