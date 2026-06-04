import { Link } from 'react-router-dom'

export function PlaceholderPage({ titulo, fase, descricao }) {
  return (
    <section className="mx-auto max-w-lg space-y-4 py-8 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--crash-cifra)]">
        {fase}
      </p>
      <h1 className="text-2xl font-bold text-white">{titulo}</h1>
      <p className="text-sm text-[var(--crash-texto-sec)]">{descricao}</p>
      <Link
        to="/"
        className="inline-block text-sm text-[var(--crash-cifra)] hover:underline"
      >
        ← Voltar ao início
      </Link>
    </section>
  )
}
