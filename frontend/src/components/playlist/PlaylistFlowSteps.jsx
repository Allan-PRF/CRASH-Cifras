import { cardClassName } from '../ui/inputClasses'

const STEPS = [
  { id: 'criar', label: 'Criar', short: '1' },
  { id: 'adicionar', label: 'Músicas', short: '2' },
  { id: 'preparar', label: 'Preparar', short: '3' },
  { id: 'iniciar', label: 'Iniciar', short: '4' },
]

function stepIndex(id) {
  return STEPS.findIndex((s) => s.id === id)
}

export function PlaylistFlowSteps({ currentStep = 'criar', compact = false }) {
  const activeIndex = stepIndex(currentStep)

  return (
    <ol
      className={
        compact
          ? 'grid w-full grid-cols-4 gap-2 text-xs'
          : 'grid gap-3 sm:grid-cols-4'
      }
      aria-label="Passos do evento"
    >
      {STEPS.map((step, index) => {
        const done = index < activeIndex
        const active = index === activeIndex
        const pending = index > activeIndex

        if (compact) {
          return (
            <li key={step.id} className="flex min-w-0 flex-col items-center gap-1 text-center">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  done
                    ? 'bg-[var(--crash-cifra)] text-black'
                    : active
                      ? 'bg-[var(--crash-primario)] text-black'
                      : 'border border-[var(--crash-cifra)]/50 text-[var(--crash-texto-sec)]'
                }`}
              >
                {done ? '✓' : step.short}
              </span>
              <span
                className={`w-full truncate leading-tight ${
                  active ? 'font-medium text-white' : 'text-[var(--crash-texto-sec)]'
                }`}
              >
                {step.label}
              </span>
            </li>
          )
        }

        return (
          <li
            key={step.id}
            className={`p-3 text-center transition ${cardClassName} ${
              done
                ? 'bg-[var(--crash-cifra)]/10'
                : active
                  ? 'border-[var(--crash-primario)] bg-[var(--crash-primario)]/10'
                  : 'opacity-60'
            }`}
          >
            <span
              className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                done
                  ? 'bg-[var(--crash-cifra)] text-black'
                  : active
                    ? 'bg-[var(--crash-primario)] text-black'
                    : 'bg-[var(--crash-borda)] text-[var(--crash-texto-sec)]'
              }`}
            >
              {done ? '✓' : step.short}
            </span>
            <p
              className={`mt-2 text-sm font-medium ${
                active || done ? 'text-white' : 'text-[var(--crash-texto-sec)]'
              }`}
            >
              {step.label}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

export function playlistCurrentStep(playlist) {
  if (!playlist) return 'criar'
  if (playlist.status === 'preparado') return 'iniciar'
  if (playlist.itens?.length > 0) return 'preparar'
  return 'adicionar'
}

/** Passo único na lista de playlists (página inicial). */
export function PlaylistCriarStepHighlight() {
  return (
    <div className="flex items-center gap-3" aria-label="Passo 1: Criar playlist">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--crash-primario)] text-lg font-bold text-black">
        1
      </span>
      <span className="text-lg font-semibold text-white">Criar</span>
    </div>
  )
}
