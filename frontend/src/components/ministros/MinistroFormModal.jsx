import { useEffect, useState } from 'react'
import { FormField } from '../ui/FormField'
import { inputClassName, selectClassName, btnPrimaryClassName, btnSecondaryClassName } from '../ui/inputClasses'
import { TODOS_TONS } from '../../lib/tons'
import { uploadFotoMinistro } from '../../services/ministros'

const empty = { nome: '', fotoUrl: '', tomPadrao: '' }

export function MinistroFormModal({ open, ministro, onClose, onSave }) {
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    if (ministro) {
      setForm({
        nome: ministro.nome,
        fotoUrl: ministro.foto_url || '',
        tomPadrao: ministro.tom_padrao || '',
      })
    } else {
      setForm(empty)
    }
  }, [open, ministro])

  if (!open) return null

  async function handleFotoChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const fotoUrl = await uploadFotoMinistro(file)
      setForm((current) => ({ ...current, fotoUrl }))
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome.trim()) {
      setError('Informe o nome do ministro')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        nome: form.nome,
        fotoUrl: form.fotoUrl,
        tomPadrao: form.tomPadrao || null,
      })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ministro-form-title"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-[var(--crash-borda)] bg-[var(--crash-fundo-card)] p-6 shadow-xl"
      >
        <h2 id="ministro-form-title" className="text-xl font-bold text-white">
          {ministro ? 'Editar ministro' : 'Novo ministro'}
        </h2>

        <div className="mt-5 space-y-4">
          <FormField label="Nome *">
            <input
              type="text"
              required
              maxLength={100}
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              className={inputClassName}
              placeholder="Ex.: Pr. João"
            />
          </FormField>

          <FormField label="Foto" hint="Escolha uma imagem da galeria do celular ou PC.">
            <div className="flex items-center gap-3">
              {form.fotoUrl ? (
                <img
                  src={form.fotoUrl}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-black text-lg text-[var(--crash-texto-sec)]">
                  📷
                </span>
              )}
              <label className={`inline-flex cursor-pointer items-center justify-center ${btnSecondaryClassName}`}>
                {uploading ? 'Enviando…' : '📷 Escolher foto'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFotoChange}
                  disabled={uploading || saving}
                  className="sr-only"
                />
              </label>
            </div>
          </FormField>

          <FormField label="Tom padrão">
            <select
              value={form.tomPadrao}
              onChange={(e) => setForm((f) => ({ ...f, tomPadrao: e.target.value }))}
              className={selectClassName}
            >
              <option value="">— Nenhum —</option>
              {TODOS_TONS.map((tom) => (
                <option key={tom} value={tom}>
                  {tom}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving || uploading}
            className={`flex-1 ${btnSecondaryClassName}`}
          >
            Cancelar
          </button>
          <button type="submit" disabled={saving || uploading} className={`flex-1 ${btnPrimaryClassName}`}>
            {saving ? 'Salvando…' : uploading ? 'Enviando foto…' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}
