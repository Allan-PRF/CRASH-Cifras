import { Link, useNavigate } from 'react-router-dom'
import { PageNav } from '../components/layout/PageNav'
import { btnSecondaryClassName } from '../components/ui/inputClasses'
import { useAuth } from '../hooks/useAuth'
import { isAdminUser } from '../lib/admin'

export function AccountPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const isAdmin = isAdminUser(user)

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <section className="mx-auto max-w-lg space-y-8">
      <PageNav
        breadcrumbItems={[
          { label: 'Início', to: '/' },
          { label: 'Conta' },
        ]}
        backTo="/"
        backVariant="cifra"
      />

      <header>
        <h1 className="text-2xl font-bold text-white">Conta</h1>
        <p className="mt-1 text-sm text-zinc-400">{user?.email}</p>
      </header>

      <div className="space-y-3">
        <Link to="/assinatura" className={`block text-center ${btnSecondaryClassName}`}>
          Assinatura e pagamento
        </Link>

        {isAdmin ? (
          <div className="space-y-3 rounded-xl border border-[var(--crash-cifra)]/35 bg-[var(--crash-cifra)]/5 p-4">
            <h2 className="text-sm font-semibold text-[var(--crash-cifra)]">
              Administração
            </h2>
            <p className="text-sm text-[var(--crash-texto-sec)]">
              Ferramentas só para o e-mail administrador.
            </p>
            <Link
              to="/admin/curadoria"
              className={`block text-center ${btnSecondaryClassName}`}
            >
              Curadoria do acervo
            </Link>
            <Link
              to="/admin/novidades"
              className={`block text-center ${btnSecondaryClassName}`}
            >
              Novidades
            </Link>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleSignOut}
          className="w-full rounded-lg border border-red-900/50 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-950/30"
        >
          Sair
        </button>
      </div>
    </section>
  )
}
