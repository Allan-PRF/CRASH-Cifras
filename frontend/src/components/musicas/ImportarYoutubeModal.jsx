import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { validateYoutubeUrl } from '@crash-cifras/shared/validate-youtube-url'
import { FormField } from '../ui/FormField'
import {
  btnPrimaryClassName,
  btnSecondaryClassName,
  inputClassName,
} from '../ui/inputClasses'
import {
  attachReconhecimentoVoz,
  criarSpeechRecognition,
  iniciarReconhecimentoVoz,
  logSpeechRecognitionDisponivel,
  mensagemErroReconhecimentoVoz,
  mensagemErroStartVoz,
} from '../../lib/voiceSearch'
import { buscarYoutube, fetchImportJob, importarYoutube } from '../../services/importacao'

const btnLinkClassName =
  'rounded-lg border border-[var(--crash-borda)] bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50'

function assertValidYoutubeUrl(url) {
  const result = validateYoutubeUrl(url)
  if (!result.valid) {
    throw new Error(result.error || 'Link inválido')
  }
  return `https://www.youtube.com/watch?v=${result.videoId}`
}

function ProgressoImportacao({ job }) {
  const progresso = Math.min(100, Math.max(0, job?.progresso ?? 0))
  const concluido = job?.status === 'completed' || job?.status === 'done' || progresso >= 100
  const aguardandoMotor = job?.status === 'processing'

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-[var(--crash-cifra)]/40 bg-[var(--crash-cifra)]/10 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--crash-cifra)]">
          {concluido
            ? 'Pronto!'
            : aguardandoMotor
              ? 'Gerando cifra no acervo…'
              : 'Salvando vídeo…'}
        </p>
        <span className="text-xs text-white">{progresso}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/40">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            concluido ? 'bg-green-500' : 'bg-[var(--crash-cifra)]'
          }`}
          style={{ width: `${progresso}%` }}
        />
      </div>
      {job?.etapa && (
        <p className="text-xs text-[var(--crash-texto-sec)]">{job.etapa}</p>
      )}
    </div>
  )
}

export function ImportarYoutubeModal({
  open,
  ministroId,
  ministroNome,
  musicaId = null,
  youtubeUrlInitial = '',
  onClose,
  onImported,
}) {
  const isReimport = Boolean(musicaId)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showDirectLink, setShowDirectLink] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [tituloManual, setTituloManual] = useState('')
  const [artistaManual, setArtistaManual] = useState('')
  const [pendingUrl, setPendingUrl] = useState('')
  const [manualHint, setManualHint] = useState('')
  const [job, setJob] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fase, setFase] = useState('form')

  useEffect(() => {
    if (!open) return
    setQuery('')
    setResults([])
    setShowDirectLink(isReimport && Boolean(youtubeUrlInitial))
    setYoutubeUrl(youtubeUrlInitial || '')
    setTituloManual('')
    setArtistaManual('')
    setPendingUrl('')
    setManualHint('')
    setJob(null)
    setError('')
    setSubmitting(false)
    setFase('form')
  }, [open, isReimport, youtubeUrlInitial])

  useEffect(() => {
    if (!job?.id || fase !== 'importando') return
    if (job.status === 'completed' || job.status === 'done' || job.status === 'failed') {
      if (job.status === 'failed') {
        setError(job.erro || 'Falha na importação.')
        setFase('form')
        setSubmitting(false)
        return
      }
      setFase('concluido')
      setSubmitting(false)
      return
    }

    const interval = setInterval(async () => {
      try {
        const atualizado = await fetchImportJob(job.id)
        setJob(atualizado)
        if (atualizado.status === 'completed' || atualizado.status === 'done') {
          setFase('concluido')
          setSubmitting(false)
        } else if (atualizado.status === 'failed') {
          setError(atualizado.erro || 'Falha na importação.')
          setFase('form')
          setSubmitting(false)
        }
      } catch {
        /* mantém job atual */
      }
    }, 1500)

    return () => clearInterval(interval)
  }, [job?.id, job?.status, fase])

  if (!open) return null

  async function executarBusca(termo) {
    const termoSafe = termo.trim()
    if (termoSafe.length < 2) return
    setError('')
    setJob(null)
    setFase('form')
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

  async function handleImport(url, { titulo = null, artista = null } = {}) {
    setError('')
    setJob({ progresso: 5, etapa: 'Salvando link do vídeo…', status: 'processing' })
    setFase('importando')
    setSubmitting(true)
    try {
      const safeUrl = assertValidYoutubeUrl(url)
      const result = await importarYoutube({
        youtubeUrl: safeUrl,
        ministroId,
        musicaId: musicaId || null,
        titulo,
        artista,
      })

      if (result?.precisa_nome_manual) {
        setPendingUrl(result.youtubeUrl || safeUrl)
        setManualHint(
          result.message ||
            'Informe o nome da música e o artista para identificar na pasta.',
        )
        setJob(result.job || null)
        setFase('manual')
        return
      }

      setJob(result)
      if (result.status === 'failed') {
        setError(result.erro || 'Falha na importação.')
        setFase('form')
      } else if (result.status === 'processing') {
        setFase('importando')
        setSubmitting(true)
      } else {
        setFase('concluido')
      }
    } catch (err) {
      setError(err.message)
      setFase('form')
      setJob(null)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleManualRetry(event) {
    event.preventDefault()
    if (!pendingUrl) return
    if (tituloManual.trim().length < 2 || artistaManual.trim().length < 2) {
      setError('Informe o nome da música e o artista (mínimo 2 caracteres cada).')
      return
    }
    await handleImport(pendingUrl, {
      titulo: tituloManual.trim(),
      artista: artistaManual.trim(),
    })
  }

  async function handleSubmitLink(event) {
    event.preventDefault()
    await handleImport(youtubeUrl, {
      titulo: tituloManual || null,
      artista: artistaManual || null,
    })
    setYoutubeUrl('')
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
    } catch {
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
      setError(mensagemErroStartVoz(err))
    }
  }

  function handleContinuarNaPasta() {
    onImported?.(job)
    onClose()
  }

  function handleClose() {
    if (submitting) return
    onClose()
  }

  const mostrarFormulario = fase === 'form'
  const mostrarManual = fase === 'manual'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="importar-youtube-title"
      onClick={handleClose}
    >
      <div
        className="my-4 w-full max-w-2xl rounded-2xl border border-[var(--crash-borda)] bg-[var(--crash-fundo-card)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="importar-youtube-title" className="text-lg font-bold text-white">
              {isReimport ? 'Reimportar do YouTube' : 'Importar do YouTube'}
            </h2>
            <p className="mt-1 text-sm text-[var(--crash-texto-sec)]">
              {isReimport
                ? 'Atualiza o link do vídeo. Cadastre ou revise a cifra na edição.'
                : ministroNome
                  ? `Cole o link do YouTube. O vídeo será salvo na pasta de ${ministroNome} e você cadastra a cifra na edição.`
                  : 'Cole o link do YouTube. O vídeo será salvo e você cadastra a cifra na edição.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-md p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {mostrarFormulario && isReimport && youtubeUrlInitial && (
          <div className="mb-4 space-y-3 rounded-lg border border-[var(--crash-borda)] bg-black/30 p-4">
            <p className="text-xs text-[var(--crash-texto-sec)]">Link atual:</p>
            <p className="break-all text-sm text-white">{youtubeUrlInitial}</p>
            <button
              type="button"
              onClick={() => handleImport(youtubeUrlInitial)}
              disabled={submitting}
              className={btnPrimaryClassName}
            >
              {submitting ? 'Reimportando…' : 'Reimportar agora'}
            </button>
          </div>
        )}

        {mostrarFormulario && (
          <>
            <form onSubmit={handleSearch} className="space-y-4">
              <FormField label="Buscar no YouTube">
                <div className="flex gap-2">
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Nome da música ou artista…"
                    className={inputClassName}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={handleVoiceSearch}
                    className={btnSecondaryClassName}
                    aria-label="Buscar por voz"
                    disabled={submitting}
                  >
                    🎙️
                  </button>
                </div>
              </FormField>

              {error && (
                <p className="rounded-lg border border-red-900/40 bg-red-950/20 p-3 text-sm text-red-400">
                  {error}
                </p>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={searching || submitting || query.trim().length < 2}
                  className={`flex-1 ${btnPrimaryClassName}`}
                >
                  {searching ? 'Buscando…' : 'Buscar'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDirectLink((v) => !v)}
                  disabled={submitting}
                  className={`flex-1 ${btnLinkClassName} ${
                    showDirectLink ? 'border-[var(--crash-cifra)] ring-1 ring-[var(--crash-cifra)]/40' : ''
                  }`}
                >
                  Colar link
                </button>
              </div>
            </form>

            {results.length > 0 && (
              <ul className="mt-4 max-h-60 space-y-2 overflow-y-auto">
                {results.map((result) => (
                  <li
                    key={result.id || result.youtubeUrl}
                    className="flex gap-3 rounded-lg border border-[var(--crash-borda)] bg-black/40 p-3"
                  >
                    {result.thumbnail && (
                      <img
                        src={result.thumbnail}
                        alt=""
                        className="h-16 w-24 shrink-0 rounded object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold text-white">{result.titulo}</p>
                      <p className="text-xs text-[var(--crash-texto-sec)]">{result.canal}</p>
                      <button
                        type="button"
                        onClick={() =>
                          handleImport(result.youtubeUrl, {
                            titulo: result.titulo,
                            artista: result.canal,
                          })
                        }
                        disabled={submitting}
                        className={`mt-2 ${btnPrimaryClassName}`}
                      >
                        {submitting ? 'Importando…' : 'Importar'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {showDirectLink && (
              <form onSubmit={handleSubmitLink} className="mt-4 space-y-3">
                <FormField label="Link do YouTube">
                  <input
                    type="url"
                    required
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className={inputClassName}
                    disabled={submitting}
                  />
                </FormField>
                <FormField label="Nome da música (opcional)">
                  <input
                    type="text"
                    value={tituloManual}
                    onChange={(e) => setTituloManual(e.target.value)}
                    placeholder="Opcional — nome exibido na pasta"
                    className={inputClassName}
                    disabled={submitting}
                  />
                </FormField>
                <FormField label="Artista (opcional)">
                  <input
                    type="text"
                    value={artistaManual}
                    onChange={(e) => setArtistaManual(e.target.value)}
                    className={inputClassName}
                    disabled={submitting}
                  />
                </FormField>
                <button type="submit" disabled={submitting} className={btnPrimaryClassName}>
                  {submitting ? 'Importando…' : 'Importar'}
                </button>
              </form>
            )}
          </>
        )}

        {mostrarManual && (
          <form onSubmit={handleManualRetry} className="mt-4 space-y-3 rounded-lg border border-amber-700/40 bg-amber-950/20 p-4">
            <p className="text-sm text-amber-200">{manualHint}</p>
            <FormField label="Nome da música">
              <input
                type="text"
                required
                value={tituloManual}
                onChange={(e) => setTituloManual(e.target.value)}
                className={inputClassName}
                disabled={submitting}
              />
            </FormField>
            <FormField label="Artista">
              <input
                type="text"
                required
                value={artistaManual}
                onChange={(e) => setArtistaManual(e.target.value)}
                className={inputClassName}
                disabled={submitting}
              />
            </FormField>
            <button type="submit" disabled={submitting} className={btnPrimaryClassName}>
              {submitting ? 'Salvando…' : 'Continuar importação'}
            </button>
          </form>
        )}

        {(fase === 'importando' || fase === 'concluido') && job && (
          <ProgressoImportacao job={job} />
        )}

        {fase === 'concluido' && job?.musica_id && (() => {
          const cifraPronta =
            job.etapa?.includes('Cifra do acervo') ||
            job.etapa?.includes('Cifra gerada')
          return (
          <div className="mt-4 space-y-3 rounded-lg border border-[var(--crash-cifra)]/40 bg-[var(--crash-cifra)]/10 p-4">
            <p className="text-sm font-semibold text-[var(--crash-cifra)]">
              {cifraPronta
                ? 'Cifra pronta! Abra a música ou revise na edição.'
                : 'Vídeo salvo! Agora cadastre a cifra.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {cifraPronta ? (
                <>
                  <Link to={`/musica/${job.musica_id}`} className={btnPrimaryClassName}>
                    Abrir música
                  </Link>
                  <Link to={`/musica/${job.musica_id}/editar`} className={btnSecondaryClassName}>
                    Revisar cifra
                  </Link>
                </>
              ) : (
                <Link to={`/musica/${job.musica_id}/editar`} className={btnPrimaryClassName}>
                  Cadastrar cifra
                </Link>
              )}
              <button
                type="button"
                onClick={handleContinuarNaPasta}
                className={btnSecondaryClassName}
              >
                Continuar na pasta
              </button>
            </div>
          </div>
          )
        })()}

        {fase === 'importando' && (
          <p className="mt-3 text-xs text-[var(--crash-texto-sec)]">
            {job?.status === 'processing'
              ? 'O motor está gerando a cifra. Isso pode levar alguns minutos…'
              : 'Salvando o link do vídeo na sua biblioteca…'}
          </p>
        )}
      </div>
    </div>
  )
}
