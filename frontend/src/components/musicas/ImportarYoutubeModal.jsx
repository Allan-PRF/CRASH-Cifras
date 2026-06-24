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
  attachReconhecimentoVoz,
  criarSpeechRecognition,
  iniciarReconhecimentoVoz,
  logSpeechRecognitionDisponivel,
  mensagemErroReconhecimentoVoz,
  mensagemErroStartVoz,
} from '../../lib/voiceSearch'
import { buscarYoutube, fetchImportJob, importarYoutube } from '../../services/importacao'
import { useProgressoEstimadoMotor } from '../../hooks/useProgressoEstimadoMotor.js'
import { PROGRESSO_MOTOR_TETO } from '../../lib/progressoImportacaoEstimado.js'

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
  const [avisoFecharMotor, setAvisoFecharMotor] = useState(false)

  const motorGerando = job?.status === 'processing'
  const podeFecharModal = !motorGerando && !submitting

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
    setAvisoFecharMotor(false)
  }, [open, isReimport, youtubeUrlInitial])

  useEffect(() => {
    if (!motorGerando) setAvisoFecharMotor(false)
  }, [motorGerando])

  useEffect(() => {
    if (!open || !motorGerando) return undefined
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setAvisoFecharMotor(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, motorGerando])

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

  function handleCloseRequest() {
    if (motorGerando) {
      setAvisoFecharMotor(true)
      return
    }
    if (submitting) return
    onClose()
  }

  function handleBackdropClick() {
    if (!podeFecharModal) {
      if (motorGerando) setAvisoFecharMotor(true)
      return
    }
    onClose()
  }

  const mostrarFormulario = fase === 'form'
  const mostrarManual = fase === 'manual'

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 ${
        motorGerando ? 'bg-black/90' : 'bg-black/80'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="importar-youtube-title"
      aria-describedby={motorGerando ? 'importar-youtube-processing-hint' : undefined}
      onClick={handleBackdropClick}
    >
      <div
        className={`my-4 w-full max-w-2xl rounded-2xl border bg-[var(--crash-fundo-card)] p-6 shadow-xl ${
          motorGerando
            ? 'border-[var(--crash-cifra)] ring-2 ring-[var(--crash-cifra)]/50'
            : 'border-[var(--crash-borda)]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {motorGerando && (
          <p
            id="importar-youtube-processing-hint"
            className="mb-4 rounded-lg border border-[var(--crash-cifra)]/50 bg-[var(--crash-cifra)]/15 px-3 py-2 text-sm text-[var(--crash-cifra)]"
            role="status"
            aria-live="polite"
          >
            Cifra em geração — mantenha esta janela aberta para acompanhar o progresso.
          </p>
        )}

        {avisoFecharMotor && (
          <p
            className="mb-4 rounded-lg border border-amber-600/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-100"
            role="alert"
          >
            Sua cifra está sendo gerada e continuará processando. Você pode acompanhar aqui.
          </p>
        )}

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
            onClick={handleCloseRequest}
            disabled={submitting && !motorGerando}
            className={`rounded-md p-1 transition ${
              motorGerando
                ? 'cursor-default text-zinc-500 hover:bg-amber-950/40 hover:text-amber-200'
                : 'text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-50'
            }`}
            aria-label={motorGerando ? 'Aviso: cifra em geração' : 'Fechar'}
            title={
              motorGerando
                ? 'A cifra continua sendo gerada — acompanhe nesta janela'
                : 'Fechar'
            }
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

      </div>
    </div>
  )
}
