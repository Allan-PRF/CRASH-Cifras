import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { validateYoutubeUrl } from '@crash-cifras/shared/validate-youtube-url'
import { FormField } from '../ui/FormField'
import {
  btnPrimaryClassName,
  btnSecondaryClassName,
  inputClassName,
} from '../ui/inputClasses'
import {
  classeAvisoVoz,
  PLACEHOLDER_BUSCA_VOZ,
  useVoiceSearch,
} from '../../lib/voiceSearch'
import { buscarYoutube, cancelarImportJob, fetchImportJob, importarYoutube } from '../../services/importacao'
import { clearImportJobRef, saveImportJobRef } from '../../lib/importJobStorage'
import { useProgressoEstimadoMotor } from '../../hooks/useProgressoEstimadoMotor.js'
import { PROGRESSO_MOTOR_TETO } from '../../lib/progressoImportacaoEstimado.js'

function assertValidYoutubeUrl(url) {
  const result = validateYoutubeUrl(url)
  if (!result.valid) {
    throw new Error(result.error || 'Link inválido')
  }
  return `https://www.youtube.com/watch?v=${result.videoId}`
}

function ProgressoImportacao({ job }) {
  const maxExibidoRef = useRef(5)
  const concluido = job?.status === 'completed' || job?.status === 'done'
  const aguardandoMotor = job?.status === 'processing' && !concluido

  useEffect(() => {
    maxExibidoRef.current = 5
  }, [job?.id])

  const { progresso: estimado, noTeto } = useProgressoEstimadoMotor(
    aguardandoMotor,
    job?.id,
  )

  let bruto
  if (concluido) {
    bruto = 100
  } else if (aguardandoMotor) {
    const doServidor = Math.min(PROGRESSO_MOTOR_TETO, job?.progresso ?? 0)
    bruto = Math.max(estimado, doServidor)
  } else {
    bruto = Math.min(PROGRESSO_MOTOR_TETO, job?.progresso ?? 5)
  }

  const progresso = Math.round(Math.max(maxExibidoRef.current, bruto))
  maxExibidoRef.current = progresso

  const titulo = concluido
    ? 'Pronto!'
    : aguardandoMotor
      ? noTeto
        ? 'Quase lá, finalizando…'
        : 'Gerando cifra no acervo…'
      : 'Salvando vídeo…'

  const subtitulo =
    aguardandoMotor && noTeto
      ? 'O motor está finalizando a cifra. Isso pode levar mais alguns instantes.'
      : job?.etapa

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-[var(--crash-cifra)]/40 bg-[var(--crash-cifra)]/10 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--crash-cifra)]">{titulo}</p>
        <span className="text-xs text-white">{progresso}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/40">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${
            concluido ? 'bg-green-500' : 'bg-[var(--crash-cifra)]'
          }`}
          style={{ width: `${progresso}%` }}
        />
      </div>
      {subtitulo && (
        <p className="text-xs text-[var(--crash-texto-sec)]">{subtitulo}</p>
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
  resumeJob = null,
  onClose,
  onImported,
}) {
  const isReimport = Boolean(musicaId)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [job, setJob] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fase, setFase] = useState('form')
  const [cancelando, setCancelando] = useState(false)

  const motorGerando = job?.status === 'processing'

  const voice = useVoiceSearch({
    disabled: submitting,
    onTranscript: (transcript) => {
      setQuery(transcript)
      void executarBuscaRef.current?.(transcript)
    },
  })

  const executarBuscaRef = useRef(null)

  useEffect(() => {
    if (!open) return
    if (resumeJob?.id && resumeJob.status === 'processing') {
      setJob(resumeJob)
      setFase('importando')
      setSubmitting(false)
      setQuery('')
      setResults([])
      setYoutubeUrl(youtubeUrlInitial || '')
      setError('')
      voice.clearError()
      voice.stop()
      return
    }
    setQuery('')
    setResults([])
    setYoutubeUrl(youtubeUrlInitial || '')
    setJob(null)
    setError('')
    setSubmitting(false)
    setFase('form')
    setCancelando(false)
    voice.clearError()
    voice.stop()
  }, [open, isReimport, youtubeUrlInitial, resumeJob?.id, resumeJob?.status])

  useEffect(() => {
    if (!job?.id || fase !== 'importando') return
    if (job.status === 'completed' || job.status === 'done' || job.status === 'failed') {
      if (job.status === 'failed') {
        clearImportJobRef(ministroId)
        setError(job.erro || 'Falha na importação.')
        setFase('form')
        setSubmitting(false)
        return
      }
      clearImportJobRef(ministroId)
      setFase('concluido')
      setSubmitting(false)
      return
    }

    if (ministroId && job.status === 'processing') {
      saveImportJobRef(ministroId, { jobId: job.id, musicaId: job.musica_id ?? null })
    }

    const interval = setInterval(async () => {
      try {
        const atualizado = await fetchImportJob(job.id)
        setJob(atualizado)
        if (atualizado.status === 'completed' || atualizado.status === 'done') {
          clearImportJobRef(ministroId)
          setFase('concluido')
          setSubmitting(false)
        } else if (atualizado.status === 'failed') {
          clearImportJobRef(ministroId)
          setError(atualizado.erro || 'Falha na importação.')
          setFase('form')
          setSubmitting(false)
        }
      } catch {
        /* mantém job atual */
      }
    }, 1500)

    return () => clearInterval(interval)
  }, [job?.id, job?.status, job?.musica_id, fase, ministroId])

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

  executarBuscaRef.current = executarBusca

  if (!open) return null

  async function handleSearch(event) {
    event.preventDefault()
    await executarBusca(query)
  }

  async function handleImport(url) {
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
      })

      setJob(result)
      if (result.status === 'failed') {
        setError(result.erro || 'Falha na importação.')
        setFase('form')
      } else if (result.status === 'processing') {
        if (ministroId) {
          saveImportJobRef(ministroId, {
            jobId: result.id,
            musicaId: result.musica_id ?? null,
          })
        }
        setFase('importando')
        setSubmitting(false)
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

  async function handleImportLink() {
    if (!youtubeUrl.trim()) return
    await handleImport(youtubeUrl)
    setYoutubeUrl('')
  }

  function handleLinkKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void handleImportLink()
    }
  }

  function handleContinuarNaPasta() {
    onImported?.(job)
    onClose()
  }

  async function handleCancelarImportacao() {
    if (!job?.id || cancelando) return
    setCancelando(true)
    setError('')
    try {
      const cancelado = await cancelarImportJob(job.id)
      clearImportJobRef(ministroId)
      setJob(cancelado)
      setError(cancelado.erro || 'Importação cancelada.')
      setFase('form')
    } catch (err) {
      setError(err.message || 'Não foi possível cancelar.')
    } finally {
      setCancelando(false)
      setSubmitting(false)
    }
  }

  function handleCloseRequest() {
    if (submitting) return
    onClose()
  }

  function handleBackdropClick() {
    if (submitting) return
    onClose()
  }

  const mostrarFormulario = fase === 'form'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="importar-youtube-title"
      onClick={handleBackdropClick}
    >
      <div
        className="my-4 w-full max-w-2xl rounded-2xl border border-[var(--crash-borda)] bg-[var(--crash-fundo-card)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {motorGerando && (
          <p
            className="mb-4 rounded-lg border border-[var(--crash-cifra)]/50 bg-[var(--crash-cifra)]/15 px-3 py-2 text-sm text-[var(--crash-cifra)]"
            role="status"
            aria-live="polite"
          >
            A cifra está sendo gerada no servidor — pode fechar esta janela e acompanhar pela pasta do
            ministro.
          </p>
        )}

        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="importar-youtube-title" className="text-lg font-bold text-white">
              {isReimport ? 'Reimportar do YouTube' : 'Importar do YouTube'}
            </h2>
            <p className="mt-1 text-sm text-[var(--crash-texto-sec)]">
              {isReimport
                ? 'Atualiza o link do vídeo. O nome vem do título do YouTube.'
                : ministroNome
                  ? `Busque ou cole o link. O nome da música será salvo na pasta de ${ministroNome}.`
                  : 'Busque ou cole o link do YouTube. O nome da música vem do título do vídeo.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCloseRequest}
            disabled={submitting}
            className="rounded-md p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            aria-label="Fechar"
            title="Fechar"
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
                    onChange={(e) => {
                      setQuery(e.target.value)
                      voice.clearError()
                    }}
                    placeholder={PLACEHOLDER_BUSCA_VOZ}
                    className={inputClassName}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={voice.toggle}
                    className={
                      voice.listening
                        ? `${btnSecondaryClassName} shrink-0 animate-pulse border-red-500 bg-red-600 text-white hover:bg-red-500`
                        : `${btnSecondaryClassName} shrink-0`
                    }
                    aria-label={voice.listening ? 'Parar busca por voz' : 'Buscar por voz'}
                    aria-pressed={voice.listening}
                    disabled={submitting}
                    title={
                      voice.supported
                        ? 'Falar o nome da música'
                        : 'Navegador sem suporte a voz — use Chrome'
                    }
                  >
                    🎙️
                  </button>
                </div>
                {voice.listening && (
                  <p className="mt-2 text-sm text-[var(--crash-cifra)]" role="status" aria-live="polite">
                    Ouvindo… fale o nome da música
                  </p>
                )}
                {voice.error && (
                  <p className={`mt-2 ${classeAvisoVoz}`} role="alert">
                    {voice.error}
                  </p>
                )}
              </FormField>

              <FormField label="Ou cole o link">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    onKeyDown={handleLinkKeyDown}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className={inputClassName}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => void handleImportLink()}
                    disabled={submitting || !youtubeUrl.trim()}
                    className={`${btnPrimaryClassName} shrink-0`}
                  >
                    {submitting ? 'Importando…' : 'Importar'}
                  </button>
                </div>
              </FormField>

              {error && (
                <p className="rounded-lg border border-red-900/40 bg-red-950/20 p-3 text-sm text-red-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={searching || submitting || query.trim().length < 2}
                className={btnPrimaryClassName}
              >
                {searching ? 'Buscando…' : 'Buscar'}
              </button>
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
                        onClick={() => handleImport(result.youtubeUrl)}
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
          </>
        )}

        {(fase === 'importando' || fase === 'concluido') && job && (
          <ProgressoImportacao job={job} />
        )}

        {fase === 'importando' && motorGerando && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleCancelarImportacao()}
              disabled={cancelando}
              className={btnSecondaryClassName}
            >
              {cancelando ? 'Cancelando…' : 'Cancelar importação'}
            </button>
            <button type="button" onClick={onClose} className={btnSecondaryClassName}>
              Continuar em segundo plano
            </button>
          </div>
        )}

        {fase === 'concluido' && job?.musica_id && (() => {
          const cifraPronta =
            job.etapa?.includes('Cifra do acervo') ||
            job.etapa?.includes('Cifra gerada')
          return (
          <div className="mt-4 space-y-3 rounded-lg border border-[var(--crash-cifra)]/40 bg-[var(--crash-cifra)]/10 p-4">
            <p className="text-sm font-semibold text-[var(--crash-cifra)]">
              {cifraPronta
                ? 'Cifra pronta! Toque ou revise na edição.'
                : 'Vídeo salvo! Agora cadastre a cifra.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {cifraPronta ? (
                <>
                  <Link to={`/teleprompter/musica/${job.musica_id}`} className={btnPrimaryClassName}>
                    Tocar
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

      </div>
    </div>
  )
}
