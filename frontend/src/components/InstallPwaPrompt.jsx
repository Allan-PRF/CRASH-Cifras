import { usePwaInstall } from '../context/PwaInstallContext'

/** Banner automático de instalação — reaparece conforme DIAS_ENTRE_CONVITES. */
export function InstallPwaPrompt() {
  const { showAutoBanner, promptInstall, dismissAutoBanner } = usePwaInstall()

  if (!showAutoBanner) return null

  return (
    <aside
      className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-lg rounded-xl border border-[var(--crash-cifra)]/30 bg-zinc-900 p-4 shadow-lg"
      role="dialog"
      aria-labelledby="pwa-install-banner-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p id="pwa-install-banner-title" className="text-sm font-medium text-white">
            Instalar CRASH Cifras
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Adicione à tela inicial para acesso rápido e offline.
          </p>
        </div>
        <button
          type="button"
          onClick={dismissAutoBanner}
          className="shrink-0 rounded-md px-2 py-0.5 text-lg leading-none text-zinc-500 hover:text-white"
          aria-label="Fechar convite de instalação"
        >
          ×
        </button>
      </div>
      <nav className="mt-3 flex gap-2" aria-label="Instalação PWA">
        <button
          type="button"
          onClick={promptInstall}
          className="flex-1 rounded-lg bg-[var(--crash-cifra)] py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Instalar
        </button>
        <button
          type="button"
          onClick={dismissAutoBanner}
          className="rounded-lg px-3 py-2 text-sm text-zinc-500 hover:text-zinc-300"
        >
          Agora não
        </button>
      </nav>
    </aside>
  )
}
