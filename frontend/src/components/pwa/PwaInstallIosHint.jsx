import { usePwaInstall } from '../../context/PwaInstallContext'

export function PwaInstallIosHint() {
  const { iosHintOpen, closeIosHint } = usePwaInstall()

  if (!iosHintOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="presentation"
      onClick={closeIosHint}
    >
      <aside
        role="dialog"
        aria-labelledby="pwa-ios-hint-title"
        aria-modal="true"
        className="w-full max-w-sm rounded-xl border border-[var(--crash-borda)] bg-zinc-900 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="pwa-ios-hint-title" className="text-sm font-semibold text-white">
            Instalar CRASH Cifras
          </h2>
          <button
            type="button"
            onClick={closeIosHint}
            className="rounded-md px-2 py-0.5 text-lg leading-none text-zinc-500 hover:text-white"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-zinc-400">
          No Safari, toque em{' '}
          <span className="font-medium text-white">Compartilhar</span>
          {' '}(ícone com seta para cima) e depois em{' '}
          <span className="font-medium text-white">Adicionar à Tela de Início</span>.
        </p>
        <button
          type="button"
          onClick={closeIosHint}
          className="mt-4 w-full rounded-lg border border-zinc-700 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white"
        >
          Entendi
        </button>
      </aside>
    </div>
  )
}
