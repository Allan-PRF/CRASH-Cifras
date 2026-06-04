import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageNav } from '../components/layout/PageNav'
import { VERSOES_BIBLICAS, NIVEIS_TECLADO } from '@crash-cifras/shared/constants'
import { FormField } from '../components/ui/FormField'
import {
  btnPrimaryClassName,
  btnSecondaryClassName,
  inputClassName,
  selectClassName,
} from '../components/ui/inputClasses'
import { useAuth } from '../hooks/useAuth'
import { useUserSettings } from '../hooks/useUserSettings'
import { updateUserSettings } from '../services/settings'

const NIVEL_LABELS = {
  basico: 'Básico',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
}

export function AccountPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
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
      })
    }
  }, [settings])

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

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
      })
      setSettings(updated)
      setSaved(true)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mx-auto max-w-lg space-y-8">
      <PageNav
        breadcrumbItems={[
          { label: 'Início', to: '/' },
          { label: 'Conta' },
        ]}
        backTo="/"
      />

      <header>
        <h1 className="text-2xl font-bold text-white">Conta</h1>
        <p className="mt-1 text-sm text-zinc-400">{user?.email}</p>
      </header>

      {/* Configurações */}
      {loading && (
        <p className="text-sm text-[var(--crash-texto-sec)]">Carregando configurações…</p>
      )}

      {error && (
        <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-400">
          <p>{error}</p>
          <button type="button" onClick={reload} className="mt-2 text-[var(--crash-cifra)] hover:underline">
            Tentar novamente
          </button>
        </div>
      )}

      {form && (
        <form onSubmit={handleSubmit} className="space-y-6">
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

          {saveError && <p className="text-sm text-red-400">{saveError}</p>}
          {saved && <p className="text-sm text-green-400">Configurações salvas.</p>}

          <button type="submit" disabled={saving} className={btnPrimaryClassName}>
            {saving ? 'Salvando…' : 'Salvar configurações'}
          </button>
        </form>
      )}

      {/* Links de conta */}
      <div className="space-y-3 border-t border-[var(--crash-borda)] pt-6">
        <Link to="/assinatura" className={`block text-center ${btnSecondaryClassName}`}>
          Assinatura e pagamento
        </Link>

        <button
          type="button"
          onClick={handleSignOut}
          className="w-full rounded-lg border border-red-900/50 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-950/30"
        >
          Sair
        </button>
      </div>
    </section>
  )
}
