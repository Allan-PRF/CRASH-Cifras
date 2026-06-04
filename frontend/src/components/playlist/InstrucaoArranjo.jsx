import { useState } from 'react'
import { btnSecondaryClassName } from '../ui/inputClasses'

export function InstrucaoArranjo({ item, onSave, onInterpret }) {
  const [value, setValue] = useState(item.instrucao_texto || 'Normal — início ao fim')
  const [saving, setSaving] = useState(false)

  async function save(nextValue = value) {
    setSaving(true)
    try {
      await onSave(nextValue)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <label className="block">
        <span className="text-xs font-medium text-[var(--crash-texto-sec)]">
          📋 Instrução de arranjo
        </span>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => save()}
          rows={2}
          className="mt-1 w-full rounded-lg border border-[var(--crash-borda)] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[var(--crash-cifra)]"
          placeholder="Ex.: Iniciar pelo refrão 2x depois volta pro início"
        />
      </label>
      <button
        type="button"
        disabled={saving}
        onClick={() => onInterpret(value)}
        className={btnSecondaryClassName}
      >
        ✨ Interpretar
      </button>
    </div>
  )
}
