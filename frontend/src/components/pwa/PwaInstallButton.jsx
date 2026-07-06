import { usePwaInstall } from '../../context/PwaInstallContext'

const baseClassName =
  'inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-white/15 bg-black/50 text-xs text-[var(--crash-texto-sec)] transition hover:border-[var(--crash-cifra)]/50 hover:text-[var(--crash-cifra)]'

/**
 * @param {'default' | 'compact'} [variant]
 *   default — header AppShell (ícone + texto em sm+)
 *   compact — teleprompter mobile (só ícone)
 */
export function PwaInstallButton({ variant = 'default', className = '' }) {
  const { showInstallButton, promptInstall } = usePwaInstall()

  if (!showInstallButton) return null

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={promptInstall}
        className={`${baseClassName} min-h-10 min-w-10 px-2 py-2 ${className}`}
        aria-label="Instalar app"
        title="Instalar app"
      >
        <span aria-hidden>📲</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={promptInstall}
      className={`${baseClassName} h-8 px-2.5 sm:px-3 ${className}`}
      aria-label="Instalar app"
      title="Instalar app"
    >
      <span aria-hidden>📲</span>
      <span className="hidden sm:inline">Instalar</span>
    </button>
  )
}
