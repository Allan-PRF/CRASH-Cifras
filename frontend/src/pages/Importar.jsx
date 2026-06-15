import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FormField } from '../components/ui/FormField'
import {
  btnPrimaryClassName,
  btnSecondaryClassName,
  inputClassName,
  selectClassName,
} from '../components/ui/inputClasses'
import { validateYoutubeUrl } from '@crash-cifras/shared/validate-youtube-url'
import { useMinistros } from '../hooks/useMinistros'
import {
  attachReconhecimentoVoz,
  criarSpeechRecognition,
  iniciarReconhecimentoVoz,
  logSpeechRecognitionDisponivel,
  mensagemErroReconhecimentoVoz,
  mensagemErroStartVoz,
} from '../lib/voiceSearch'
import { buscarYoutube, importarYoutube } from '../services/importacao'

const btnLinkClassName =
  'rounded-lg border border-[var(--crash-borda)] bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50'

export function Importar() {
  const navigate = useNavigate()
  const { ministros } = useMinistros()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showDirectLink, setShowDirectLink] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [tituloManual, setTituloManual] = useState('')
  const [artistaManual, setArtistaManual] = useState('')
  const [needsManualInput, setNeedsManualInput] = useState(false)
  const [pendingUrl, setPendingUrl] = useState('')
  const [manualHint, setManualHint] = useState('')
  const [ministroId, setMinistroId] = useState('')
  const [job, setJob] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!ministroId && ministros.length === 1) {
      setMinistroId(ministros[0].id)
    }
  }, [ministroId, ministros])

  function assertValidYoutubeUrl(url) {
    const result = validateYoutubeUrl(url)
    if (!result.valid) {
      throw new Error(result.error || 'Link inválido')
    }
    return `https://www.youtube.com/watch?v=${result.videoId}`
  }

  async function runImport(url, { titulo = null, artista = null } = {}) {
    setError('')
    setNeedsManualInput(false)
    setManualHint('')
    setSubmitting(true)
    try {
      const safeUrl = assertValidYoutubeUrl(url)
      const result = await importarYoutube({
        youtubeUrl: safeUrl,
        ministroId,
        titulo,
        artista,
      })

      if (result?.precisa_nome_manual) {
        setPendingUrl(result.youtubeUrl || safeUrl)
        setNeedsManualInput(true)
        setManualHint(
          result.message ||
            'Informe o nome da música e o artista para identificar na pasta.',
        )
        setJob(result.job || null)
        return
      }

      setJob(result)
      setNeedsManualInput(false)
      setPendingUrl('')
    } catch (err) {
      setError(err.message)
      if (err.job) setJob(err.job)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setJob(null)
    await runImport(youtubeUrl, {
      titulo: tituloManual || null,
      artista: artistaManual || null,
    })
  }

  async function handleManualRetry(event) {
    event.preventDefault()
    if (!pendingUrl) return
    if (tituloManual.trim().length < 2 || artistaManual.trim().length < 2) {
      setError('Informe o nome da música e o artista (mínimo 2 caracteres cada).')
      return
    }
    setJob(null)
    await runImport(pendingUrl, {
      titulo: tituloManual.trim(),
      artista: artistaManual.trim(),
    })
  }

  async function executarBusca(termo) {
    const termoSafe = termo.trim()
    if (termoSafe.length < 2) return
    setError('')
    setJob(null)
    setNeedsManualInput(false)
    setSearching(true)
    try {
      const data = await buscarYoutube(termoSafe)
      setResults(data)
    } catch (err) {
      setError(err.message)
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  async function handleSearch(event) {
    event.preventDefault()
    await executarBusca(query)
  }

  async function handleImport(youtubeUrlToImport, { titulo = null, artista = null } = {}) {
    setJob(null)
    await runImport(youtubeUrlToImport, { titulo, artista })
  }

  function handleVoiceSearch() {
    if (!logSpeechRecognitionDisponivel()) {
      setError('Seu navegador não suporta busca por voz. Use o campo de texto.')
      return
    }

    setError('')

    let recognition
    try {
      recognition = criarSpeechRecognition()
    } catch (err) {
      console.log('[voz] falha ao criar instância:', err)
      setError('Seu navegador não suporta busca por voz. Use o campo de texto.')
      return
    }

    attachReconhecimentoVoz(recognition, {
      onResult: (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim()
        if (transcript) {
          setQuery(transcript)
          void executarBusca(transcript)
        }
      },
      onError: (event) => {
        const mensagem = mensagemErroReconhecimentoVoz(event.error)
        if (mensagem) setError(mensagem)
      },
    })

    try {
      iniciarReconhecimentoVoz(recognition)
    } catch (err) {
      console.log('[voz] recognition.start() exceção:', err)
      setError(mensagemErroStartVoz(err))
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-8">
      <header>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-2 inline-flex items-center gap-1 text-sm text-[var(--crash-texto-sec)] transition hover:text-white"
        >
          ← Voltar
        </button>
        <h1 className="text-2xl font-bold text-white">Importar música</h1>
        <p className="mt-1 text-sm text-[var(--crash-texto-sec)]">
          Busque no YouTube ou cole o link. O vídeo será salvo e você cadastra a cifra na edição.
        </p>
      </header>

      <form
        onSubmit={handleSearch}
        className="space-y-4 rounded-xl border border-[var(--crash-borda)] bg-black/40 p-4"
      >
        <FormField label="Central de Busca">
          <div className="flex gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔍 Buscar música no YouTube..."
              className={inputClassName}
            />
            <button
              type="button"
              onClick={handleVoiceSearch}
              className={btnSecondaryClassName}
              aria-label="Buscar por voz"
            >
              🎙️
            </button>
          </div>
        </FormField>

        <FormField label="Ministro (opcional)">
          <select
            value={ministroId}
            onChange={(e) => setMinistroId(e.target.value)}
            className={selectClassName}
          >
            <option value="">Sem ministro</option>
            {ministros.map((ministro) => (
              <option key={ministro.id} value={ministro.id}>
                {ministro.nome}
                {ministro.tom_padrao ? ` · ${ministro.tom_padrao}` : ''}
              </option>
            ))}
          </select>
        </FormField>

        {error && (
          <p className="rounded-lg border border-red-900/40 bg-red-950/20 p-3 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={searching || query.trim().length < 2}
            className={`flex-1 ${btnPrimaryClassName}`}
          >
            {searching ? 'Buscando…' : 'Buscar'}
          </button>
          <button
            type="button"
            onClick={() => setShowDirectLink((current) => !current)}
            className={`flex-1 ${btnLinkClassName} ${
              showDirectLink ? 'border-[var(--crash-cifra)] ring-1 ring-[var(--crash-cifra)]/40' : ''
            }`}
          >
            Buscar via Link
          </button>
        </div>
      </form>

      {results.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--crash-texto-sec)]">
            Resultados do YouTube
          </h2>
          <ul className="space-y-3">
            {results.map((result) => (
              <li
                key={result.id || result.youtubeUrl}
                className="rounded-xl border border-[var(--crash-borda)] bg-black/50 p-3"
              >
                <article className="flex gap-3">
                  {result.thumbnail && (
                    <img
                      src={result.thumbnail}
                      alt=""
                      className="h-20 w-28 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 font-semibold text-white">{result.titulo}</h3>
                    <p className="mt-1 text-sm text-[var(--crash-texto-sec)]">
                      {result.canal}
                      {result.duracao ? ` · ${result.duracao}` : ''}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        handleImport(result.youtubeUrl, {
                          titulo: result.titulo,
                          artista: result.canal,
                        })
                      }
                      disabled={submitting}
                      className={`mt-3 ${btnPrimaryClassName}`}
                    >
                      {submitting ? 'Importando…' : '+ Importar'}
                    </button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </section>
      )}

      {needsManualInput && (
        <form
          onSubmit={handleManualRetry}
          className="space-y-4 rounded-xl border border-amber-700/40 bg-amber-950/20 p-4"
        >
          <p className="text-sm text-amber-200">{manualHint}</p>
          <FormField label="Nome da música">
            <input
              type="text"
              required
              value={tituloManual}
              onChange={(e) => setTituloManual(e.target.value)}
              placeholder="Ex.: Me Leva Pra Casa"
              className={inputClassName}
            />
          </FormField>
          <FormField label="Artista">
            <input
              type="text"
              required
              value={artistaManual}
              onChange={(e) => setArtistaManual(e.target.value)}
              placeholder="Ex.: Israel Subira"
              className={inputClassName}
            />
          </FormField>
          <button type="submit" disabled={submitting} className={btnPrimaryClassName}>
            {submitting ? 'Salvando…' : 'Continuar importação'}
          </button>
        </form>
      )}

      {showDirectLink && !needsManualInput && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-[var(--crash-borda)] bg-black/40 p-4"
        >
          <FormField label="Link do YouTube">
            <input
              type="url"
              required
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className={inputClassName}
            />
          </FormField>
          <FormField label="Nome da música (opcional)">
            <input
              type="text"
              value={tituloManual}
              onChange={(e) => setTituloManual(e.target.value)}
              placeholder="Opcional — nome exibido na pasta"
              className={inputClassName}
            />
          </FormField>
          <FormField label="Artista (opcional)">
            <input
              type="text"
              value={artistaManual}
              onChange={(e) => setArtistaManual(e.target.value)}
              placeholder="Ex.: Israel Subira"
              className={inputClassName}
            />
          </FormField>
          <button type="submit" disabled={submitting} className={btnPrimaryClassName}>
            {submitting ? 'Importando…' : 'Importar do YouTube'}
          </button>
        </form>
      )}

      {submitting && !job?.musica_id && (
        <p className="text-sm text-[var(--crash-texto-sec)]" role="status">
          Salvando o link do vídeo na sua biblioteca…
        </p>
      )}

      {job && job.status === 'completed' && job.musica_id && (
        <article className="rounded-xl border border-[var(--crash-cifra)]/40 bg-[var(--crash-cifra)]/10 p-4">
          <p className="text-sm font-semibold text-[var(--crash-cifra)]">
            Vídeo salvo! Agora cadastre a cifra.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/musica/${job.musica_id}/editar`} className={btnPrimaryClassName}>
              Cadastrar cifra
            </Link>
            <Link to={`/musica/${job.musica_id}`} className={btnSecondaryClassName}>
              Ver música
            </Link>
          </div>
        </article>
      )}
    </section>
  )
}
