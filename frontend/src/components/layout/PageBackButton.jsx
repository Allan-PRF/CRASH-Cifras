import { Link } from 'react-router-dom'
import { btnBackCifraClassName } from '../ui/inputClasses'

const defaultBackClassName =
  'inline-flex items-center gap-1 rounded-lg border border-[var(--crash-borda)] px-4 py-2 text-base font-medium text-[var(--crash-texto-sec)] transition hover:border-[var(--crash-cifra)] hover:text-[var(--crash-cifra)]'

/** Botão « Voltar padronizado em todas as páginas. */
export function PageBackButton({
  to,
  label = '← Voltar',
  className = '',
  variant = 'default',
}) {
  const baseClassName = variant === 'cifra' ? btnBackCifraClassName : defaultBackClassName

  return (
    <Link to={to} className={`${baseClassName} ${className}`.trim()}>
      {label}
    </Link>
  )
}
