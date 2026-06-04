import { useEffect, useState } from 'react'

export function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('pwa-install-dismissed') === '1',
  )

  useEffect(() => {
    function onBeforeInstall(event) {
      event.preventDefault()
      setDeferredPrompt(event)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  if (!deferredPrompt || dismissed) return null

  async function handleInstall() {
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', '1')
  }

  function handleDismiss() {
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', '1')
  }

  return (
    <aside className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
      <p className="text-sm font-medium text-white">Instalar CRASH Cifras</p>
      <p className="mt-1 text-xs text-zinc-400">
        Adicione à tela inicial para uso offline.
      </p>
      <nav className="mt-3 flex gap-2" aria-label="Instalação PWA">
        <button
          type="button"
          onClick={handleInstall}
          className="flex-1 rounded-lg bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          Instalar
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-lg px-3 py-2 text-sm text-zinc-500 hover:text-zinc-300"
        >
          Agora não
        </button>
      </nav>
    </aside>
  )
}
