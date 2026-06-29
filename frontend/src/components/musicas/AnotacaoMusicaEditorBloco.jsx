import { useEffect, useRef, useState } from 'react'
import { fetchAnotacaoMusica, salvarAnotacaoMusica } from '../../services/musicas'
import { AnotacaoEditorForm } from './AnotacaoEditorForm.jsx'

/** Bloco inline de anotações na folha de edição — auto-save on blur. */
export function AnotacaoMusicaEditorBloco({ musicaId }) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedVisible, setSavedVisible] = useState(false)
  const [loadError, setLoadError] = useState('')
  const lastSavedRef = useRef('')

  useEffect(() => {
    if (!musicaId) return
    setLoadError('')
    fetchAnotacaoMusica(musicaId)
      .then((row) => {
        const conteudo = row?.conteudo ?? ''
        setValue(conteudo)
        lastSavedRef.current = conteudo
      })
      .catch((err) => {
        setLoadError(err.message || 'Não foi possível carregar a anotação.')
      })
  }, [musicaId])

  useEffect(() => {
    if (!savedVisible) return
    const timer = window.setTimeout(() => setSavedVisible(false), 2500)
    return () => window.clearTimeout(timer)
  }, [savedVisible])

  async function handleBlur() {
    if (value === lastSavedRef.current) return

    setSaving(true)
    setSavedVisible(false)
    try {
      await salvarAnotacaoMusica(musicaId, value)
      lastSavedRef.current = value
      setSavedVisible(true)
    } catch (err) {
      setLoadError(err.message || 'Não foi possível salvar a anotação.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      className="rounded-xl border border-[var(--crash-cifra)]/40 bg-black/50 px-4 py-4 sm:px-5"
      aria-labelledby="anotacao-editor-titulo"
    >
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2
          id="anotacao-editor-titulo"
          className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--crash-cifra)]"
        >
          📝 Anotações da música
        </h2>
        <span
          className="min-w-[4.5rem] text-right text-xs font-medium text-[var(--crash-cifra)]"
          aria-live="polite"
        >
          {saving ? 'Salvando…' : savedVisible ? 'Salvo' : ''}
        </span>
      </div>

      <p id="anotacao-editor-hint" className="mb-3 text-xs leading-relaxed text-white/75">
        Use para lembrar o tom que você toca (ex.: Ré). A transposição no teleprompter não é
        salva.
      </p>

      <AnotacaoEditorForm
        value={value}
        onChange={setValue}
        onBlur={handleBlur}
        saving={saving}
        variant="folha"
        rows={5}
        aria-describedby="anotacao-editor-hint"
      />

      {loadError && <p className="mt-2 text-xs text-red-400">{loadError}</p>}
    </section>
  )
}
