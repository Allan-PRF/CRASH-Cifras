import { Link } from 'react-router-dom'

/** Botão « Voltar padronizado em todas as páginas. */
export function PageBackButton({ to, label = '← Voltar', className = '' }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1 rounded-lg border border-[var(--crash-borda)] px-4 py-2 text-base font-medium text-[var(--crash-texto-sec)] transition hover:border-[var(--crash-cifra)] hover:text-[var(--crash-cifra)] ${className}`}
    >
      {label}
    </Link>
  )
}
