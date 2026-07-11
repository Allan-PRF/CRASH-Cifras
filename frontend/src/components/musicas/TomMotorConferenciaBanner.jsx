import { btnCifraConfirmClassName, btnCifraOutlineClassName } from '../ui/inputClasses'

/**
 * Banner Etapa C — conferência do tom detectado pelo motor.
 * @param {string|null} tomDetectado — tom_original atual (detectado pela IA)
 * @param {() => void} onConfirmarTom
 * @param {() => void} onCorrigirTom
 * @param {boolean} [confirmando]
 */
export function TomMotorConferenciaBanner({
  tomDetectado,
  onConfirmarTom,
  onCorrigirTom,
  confirmando = false,
}) {
  const tom = tomDetectado || '—'

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-amber-600/35 bg-amber-950/25 p-4 sm:flex-row sm:items-start sm:justify-between"
      role="status"
    >
      <p className="text-sm leading-relaxed text-amber-100/95">
        Confira o tom: a IA detectou {tom}. Confirme se é o tom original da canção — se
        não for, corrija o tom e salve.
      </p>
      <div className="flex shrink-0 flex-wrap gap-2">
        <button
          type="button"
          onClick={onCorrigirTom}
          disabled={confirmando}
          className={btnCifraOutlineClassName}
        >
          Corrigir tom
        </button>
        <button
          type="button"
          onClick={onConfirmarTom}
          disabled={confirmando}
          className={btnCifraConfirmClassName}
        >
          {confirmando ? 'Salvando…' : 'Tom correto ✓'}
        </button>
      </div>
    </div>
  )
}
