import { Fragment } from 'react'
import { Link } from 'react-router-dom'

/** Trilha clicável: Início → … → página atual (último item sem link). */
export function PageBreadcrumb({ items, className = '' }) {
  if (!items?.length) return null

  return (
    <nav
      aria-label="Navegação"
      className={`flex flex-wrap items-center gap-1 text-xs text-[var(--crash-texto-sec)] ${className}`}
    >
      {items.map((item, index) => (
        <Fragment key={`${item.label}-${index}`}>
          {index > 0 && <span aria-hidden="true">→</span>}
          {item.to ? (
            <Link to={item.to} className="transition hover:text-white">
              {item.label}
            </Link>
          ) : (
            <span className="truncate text-white">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  )
}
