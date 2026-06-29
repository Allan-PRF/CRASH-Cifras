import { useEffect, useState } from 'react'
import { btnPrimaryClassName, btnSecondaryClassName } from '../ui/inputClasses'
import { AnotacaoEditorForm } from './AnotacaoEditorForm.jsx'

export function AnotacaoModal({ open, initialValue, onClose, onSave }) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setValue(initialValue || '')
  }, [open, initialValue])

  if (!open) return null

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(value)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 sm:items-center">
      <section
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-xl border border-[var(--crash-borda)] bg-[var(--crash-fundo-card)] p-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">📝 Anotações da música</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-[var(--crash-texto-sec)] hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        <AnotacaoEditorForm
          value={value}
          onChange={setValue}
          saving={saving}
          variant="modal"
          className="mt-4"
          rows={8}
        />

        <div className="mt-4 flex gap-3">
          <button type="button" onClick={onClose} className={`flex-1 ${btnSecondaryClassName}`}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`flex-1 ${btnPrimaryClassName}`}
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </section>
    </div>
  )
}
