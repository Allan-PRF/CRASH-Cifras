import { useEffect, useState } from 'react'
import { VERSOES_BIBLICAS, NIVEIS_TECLADO } from '@crash-cifras/shared/constants'
import { FormField } from '../components/ui/FormField'
import {
  inputClassName,
  selectClassName,
  btnPrimaryClassName,
} from '../components/ui/inputClasses'
import { useUserSettings } from '../hooks/useUserSettings'
import { updateUserSettings } from '../services/settings'

const NIVEL_LABELS = {
  basico: 'Básico',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
}

const FONTES = ['P', 'M', 'G', 'GG']

export function Configuracoes() {
  const { settings, loading, error, reload, setSettings } = useUserSettings()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (settings) {
      setForm({
        versao_biblica: settings.versao_biblica,
        nivel_teclado: settings.nivel_teclado,
        teclado_modelo: settings.teclado_modelo || '',
        graus_visiveis: settings.graus_visiveis,
        versiculos_visiveis: settings.versiculos_visiveis,
        metronomo_visivel: settings.metronomo_visivel,
        fonte_tamanho: settings.fonte_tamanho,
      })
    }
  }, [settings])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form) return
    setSaving(true)
    setSaveError('')
    setSaved(false)
    try {
      const updated = await updateUserSettings({
        versao_biblica: form.versao_biblica,
        nivel_teclado: form.nivel_teclado,
        teclado_modelo: form.teclado_modelo.trim() || null,
        graus_visiveis: form.graus_visiveis,
        versiculos_visiveis: form.versiculos_visiveis,
        metronomo_visivel: form.metronomo_visivel,
        fonte_tamanho: form.fonte_tamanho,
      })
      setSettings(updated)
      setSaved(true)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--crash-texto-sec)]">Carregando…</p>
  }

  if (error) {
    return (
      <section className="space-y-4">
        <p className="text-red-400">{error}</p>
        <p className="text-sm text-[var(--crash-texto-sec)]">
          Confirme se a migration v2 foi aplicada no Supabase.
        </p>
        <button type="button" onClick={reload} className={btnPrimaryClassName}>
          Tentar novamente
        </button>
      </section>
    )
  }

  if (!form) return null

  return (
    <section className="mx-auto max-w-lg space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <p className="mt-1 text-sm text-[var(--crash-texto-sec)]">
          Preferências do evento e do teleprompter.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        <fieldset className="space-y-4 rounded-xl border border-[var(--crash-borda)] p-4">
          <legend className="px-1 text-sm font-semibold text-[var(--crash-cifra)]">
            Bíblia
          </legend>
          <FormField label="Versão bíblica (padrão NVI)">
            <select
              value={form.versao_biblica}
              onChange={(e) =>
                setForm((f) => ({ ...f, versao_biblica: e.target.value }))
              }
              className={selectClassName}
            >
              {VERSOES_BIBLICAS.map((v) => (
                <option key={v.sigla} value={v.sigla}>
                  {v.sigla} — {v.nome}
                </option>
              ))}
            </select>
          </FormField>
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-[var(--crash-borda)] p-4">
          <legend className="px-1 text-sm font-semibold text-[var(--crash-cifra)]">
            Meu teclado
          </legend>
          <FormField label="Nível">
            <div className="flex flex-wrap gap-3">
              {NIVEIS_TECLADO.map((nivel) => (
                <label
                  key={nivel}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${
                    form.nivel_teclado === nivel
                      ? 'border-[var(--crash-cifra)] bg-[var(--crash-cifra)]/10 text-white'
                      : 'border-[var(--crash-borda)] text-[var(--crash-texto-sec)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="nivel"
                    value={nivel}
                    checked={form.nivel_teclado === nivel}
                    onChange={() => setForm((f) => ({ ...f, nivel_teclado: nivel }))}
                    className="sr-only"
                  />
                  {NIVEL_LABELS[nivel]}
                </label>
              ))}
            </div>
          </FormField>
          <FormField label="Modelo (opcional)" hint="Ex.: Yamaha PSR-S775">
            <input
              type="text"
              value={form.teclado_modelo}
              onChange={(e) =>
                setForm((f) => ({ ...f, teclado_modelo: e.target.value }))
              }
              className={inputClassName}
            />
          </FormField>
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border border-[var(--crash-borda)] p-4">
          <legend className="px-1 text-sm font-semibold text-[var(--crash-cifra)]">
            Teleprompter
          </legend>
          <ToggleRow
            label="Graus harmônicos visíveis"
            checked={form.graus_visiveis}
            onChange={(v) => setForm((f) => ({ ...f, graus_visiveis: v }))}
          />
          <ToggleRow
            label="Versículos no rodapé"
            checked={form.versiculos_visiveis}
            onChange={(v) => setForm((f) => ({ ...f, versiculos_visiveis: v }))}
          />
          <ToggleRow
            label="Metrônomo visual"
            checked={form.metronomo_visivel}
            onChange={(v) => setForm((f) => ({ ...f, metronomo_visivel: v }))}
          />
          <FormField label="Tamanho da fonte (padrão)">
            <div className="flex gap-2">
              {FONTES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, fonte_tamanho: size }))}
                  className={`min-w-[3rem] rounded-lg border py-2 text-sm font-medium ${
                    form.fonte_tamanho === size
                      ? 'border-[var(--crash-cifra)] text-[var(--crash-cifra)]'
                      : 'border-[var(--crash-borda)] text-[var(--crash-texto-sec)]'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </FormField>
        </fieldset>

        {saveError && <p className="text-sm text-red-400">{saveError}</p>}
        {saved && (
          <p className="text-sm text-green-400">Configurações salvas.</p>
        )}

        <button type="submit" disabled={saving} className={btnPrimaryClassName}>
          {saving ? 'Salvando…' : 'Salvar configurações'}
        </button>
      </form>
    </section>
  )
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-1">
      <span className="text-sm text-white">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-[var(--crash-cifra)]"
      />
    </label>
  )
}
