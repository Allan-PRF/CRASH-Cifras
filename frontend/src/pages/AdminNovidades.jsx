import { useCallback, useEffect, useState } from 'react'
import { PageNav } from '../components/layout/PageNav'
import { FormField } from '../components/ui/FormField'
import {
  btnPrimaryClassName,
  btnSecondaryClassName,
  inputClassName,
} from '../components/ui/inputClasses'
import {
  atualizarNovidade,
  criarNovidade,
  fetchNovidadesAdmin,
} from '../services/novidades'

export function AdminNovidades() {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [publicarAtivo, setPublicarAtivo] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchNovidadesAdmin()
      setLista(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setFeedback('')
    try {
      const result = await criarNovidade({
        titulo,
        descricao,
        video_url: videoUrl,
        ativo: publicarAtivo,
      })
      setTitulo('')
      setDescricao('')
      setVideoUrl('')
      setPublicarAtivo(true)
      const stats = result.emailStats
      if (publicarAtivo && stats) {
        setFeedback(
          `Publicado. E-mails: ${stats.enviados ?? 0} enviados (${stats.total ?? 0} usuários ativos).`,
        )
      } else {
        setFeedback('Novidade salva.')
      }
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleAtivo(item) {
    setError('')
    setFeedback('')
    try {
      const result = await atualizarNovidade(item.id, { ativo: !item.ativo })
      if (!item.ativo && result.emailStats) {
        const stats = result.emailStats
        setFeedback(
          `Ativada. E-mails: ${stats.enviados ?? 0} enviados (${stats.total ?? 0} usuários ativos).`,
        )
      }
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="mx-auto max-w-lg space-y-8">
      <PageNav
        breadcrumbItems={[
          { label: 'Início', to: '/' },
          { label: 'Admin' },
          { label: 'Novidades' },
        ]}
        backTo="/"
      />

      <header>
        <h1 className="text-2xl font-bold text-white">Admin — Novidades</h1>
        <p className="mt-1 text-sm text-[var(--crash-texto-sec)]">
          Publicar novidade na Home e enviar e-mail aos usuários ativos.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-[var(--crash-borda)] p-4">
        <FormField label="Título">
          <input
            type="text"
            required
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className={inputClassName}
          />
        </FormField>
        <FormField label="Descrição">
          <textarea
            required
            rows={3}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className={inputClassName}
          />
        </FormField>
        <FormField label="Link YouTube" hint="URL completa do vídeo">
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className={inputClassName}
          />
        </FormField>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-white">
          <input
            type="checkbox"
            checked={publicarAtivo}
            onChange={(e) => setPublicarAtivo(e.target.checked)}
            className="h-4 w-4 accent-[var(--crash-cifra)]"
          />
          Publicar agora (ativo + enviar e-mails)
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {feedback && <p className="text-sm text-green-400">{feedback}</p>}

        <button type="submit" disabled={saving} className={btnPrimaryClassName}>
          {saving ? 'Salvando…' : 'Publicar novidade'}
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--crash-texto-sec)]">
          Histórico
        </h2>
        {loading && <p className="text-sm text-[var(--crash-texto-sec)]">Carregando…</p>}
        {!loading && lista.length === 0 && (
          <p className="text-sm text-[var(--crash-texto-sec)]">Nenhuma novidade cadastrada.</p>
        )}
        <ul className="space-y-2">
          {lista.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--crash-borda)] bg-black/40 p-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-white">{item.titulo}</p>
                <p className="text-xs text-[var(--crash-texto-sec)]">
                  {new Date(item.criado_em).toLocaleString('pt-BR')}
                  {item.ativo ? ' · ativa' : ' · inativa'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleAtivo(item)}
                className={btnSecondaryClassName}
              >
                {item.ativo ? 'Desativar' : 'Ativar'}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
