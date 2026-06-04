import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="py-16 text-center">
      <h1 className="text-6xl font-bold text-zinc-700">404</h1>
      <p className="mt-2 text-zinc-400">Página não encontrada</p>
      <Link
        to="/"
        className="mt-6 inline-block text-violet-400 hover:text-violet-300"
      >
        Voltar ao início
      </Link>
    </section>
  )
}
