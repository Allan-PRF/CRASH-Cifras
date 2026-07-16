import { useRegisterSW } from 'virtual:pwa-register/react'

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <aside
      className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-lg rounded-xl border border-violet-500/40 bg-zinc-900 p-4 shadow-lg"
      role="alert"
    >
      <p className="text-sm text-zinc-200">Nova versão disponível.</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="flex-1 rounded-lg bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          Atualizar
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-white"
        >
          Depois
        </button>
      </div>
    </aside>
  )
}
