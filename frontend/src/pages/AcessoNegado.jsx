import { Link } from 'react-router-dom'

export function AcessoNegado() {
  return (
    <section className="mx-auto max-w-md space-y-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-white">Acesso negado</h1>
      <p className="text-sm text-[var(--crash-texto-sec)]">
        Detectamos um ambiente automatizado ou não compatível com o uso do CRASH Cifras.
      </p>
      <Link to="/login" className="text-[var(--crash-cifra)] hover:underline">
        Voltar ao login
      </Link>
    </section>
  )
}
