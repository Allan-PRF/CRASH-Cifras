import { Outlet, Link, NavLink, useLocation } from 'react-router-dom'
import { PwaUpdatePrompt } from '../PwaUpdatePrompt'
import { TrialAccessRedirect, TrialBanner } from '../assinatura/TrialBanner'
import { AuthenticatedNoIndex } from '../seo/AuthenticatedNoIndex'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { to: '/', label: 'Início', end: true },
  { to: '/playlist', label: 'Eventos' },
  { to: '/historico', label: 'Histórico' },
]

const navLinkClassName = ({ isActive }) =>
  `border-b-2 py-1 text-sm font-medium transition ${
    isActive
      ? 'border-[var(--crash-cifra)] text-white'
      : 'border-transparent text-[var(--crash-texto-sec)] hover:text-white'
  }`

export function AppShell() {
  const { user } = useAuth()
  const location = useLocation()
  const isTeleprompter = location.pathname.startsWith('/teleprompter')

  if (isTeleprompter) {
    return <Outlet />
  }

  return (
    <div className="flex min-h-svh flex-col bg-[var(--crash-fundo-card)]">
      <AuthenticatedNoIndex />
      <header className="sticky top-0 z-10 border-b border-[var(--crash-borda)] bg-black/90 backdrop-blur">
        {user && <TrialBanner />}
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link to="/" className="text-lg font-bold tracking-tight text-white">
            CRASH <span className="text-[var(--crash-cifra)]">Cifras</span>
          </Link>
          <nav className="flex items-center gap-4">
            {navItems.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={navLinkClassName}
              >
                {label}
              </NavLink>
            ))}
            <NavLink
              to={user ? '/conta' : '/login'}
              className={navLinkClassName}
            >
              {user ? 'Conta' : 'Entrar'}
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        {user ? (
          <TrialAccessRedirect>
            <Outlet />
          </TrialAccessRedirect>
        ) : (
          <Outlet />
        )}
      </main>

      <PwaUpdatePrompt />

      <footer className="border-t border-[var(--crash-borda)] py-3 text-center text-xs text-[var(--crash-texto-sec)]">
        CRASH Cifras · v1.0
      </footer>
    </div>
  )
}

