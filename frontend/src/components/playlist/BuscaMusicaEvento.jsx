import { useEffect, useMemo, useRef, useState } from 'react'
import { validateYoutubeUrl } from '@crash-cifras/shared/validate-youtube-url'
import {
  btnPrimaryClassName,
  btnSecondaryClassName,
  cardClassName,
  cardMutedClassName,
  inputClassName,
  selectClassName,
} from '../ui/inputClasses'
import { sanitizeText } from '../../lib/sanitize'
import {
  attachReconhecimentoVoz,
  classeAvisoVoz,
  criarSpeechRecognition,
  iniciarReconhecimentoVoz,
  logSpeechRecognitionDisponivel,
  mensagemErroReconhecimentoVoz,
  mensagemErroStartVoz,
  MSG_BUSCA_VOZ_INDISPONIVEL,
  MSG_VOZ_NAO_IDENTIFICOU,
} from '../../lib/voiceSearch'
import { useMinistros } from '../../hooks/useMinistros'
import { buscarYoutube, importarYoutube } from '../../services/importacao'
import { addMusicaToPlaylist } from '../../services/playlists'

const PLACEHOLDER_BUSCA_EVENTO = 'Digite o nome, fale ou cole o link do YouTube'

const inputBuscaClassName = `${inputClassName} h-[42px] min-w-0 flex-1 py-2`

const btnBuscaAlturaClassName =
  'inline-flex h-[42px] shrink-0 items-center justify-center px-4 text-sm font-semibold whitespace-nowrap'

function canonicalYoutubeUrl(url) {
  const result = validateYoutubeUrl(url)
  if (!result.valid) {
    throw new Error(result.error || 'Link do YouTube inválido.')
  }
  return `https://www.youtube.com/watch?v=${result.videoId}`
}

function entradaEhLinkYoutube(entrada) {
  const trimmed = entrada.trim()
  if (!trimmed) return false
  return validateYoutubeUrl(trimmed).valid
}

export function BuscaMusicaEvento({ playlistId, disabled = false, onMusicaAdicionada }) {
  const { ministros } = useMinistros()
  const [query, setQuery] = useState('')
  const [ministroId, setMinistroId] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [importingId, setImportingId] = useState(null)
  const [importingLink, setImportingLink] = useState(false)
  const [erroBusca, setErroBusca] = useState('')
  const [erroVoz, setErroVoz] = useState('')
  const [erroAdicionar, setErroAdicionar] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [ouvindo, setOuvindo] = useState(false)
  const [manualPending, setManualPending] = useState(null)
  const [tituloManual, setTituloManual] = useState('')
  const [artistaManual, setArtistaManual] = useState('')
  const recognitionRef = useRef(null)

  const importando = searching || !!importingId || importingLink
  const camposBloqueados = disabled
  const queryTrimmed = query.trim()
  const ehLink = useMemo(() => entradaEhLinkYoutube(query), [query])

  useEffect(() => {
    if (!ministroId && ministros.length === 1) {
      setMinistroId(ministros[0].id)
    }
  }, [ministroId, ministros])

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort()
      } catch {
        /* ignore */
      }
    }
  }, [])

  function resetarBuscaAposAdicionar() {
    setQuery('')
    setResults([])
    setErroBusca('')
  }

  async function executarBusca(termo) {
    const termoSafe = sanitizeText(termo).trim()
    if (termoSafe.length < 2) {
      setErroBusca('Digite pelo menos 2 caracteres para buscar.')
      setResults([])
      return
    }

    setSearching(true)
    setErroBusca('')
    setResults([])

    try {
      const data = await buscarYoutube(termoSafe)
      if (!data?.length) {
        setErroBusca('Nenhum resultado encontrado.')
        return
      }
      setResults(
        data.map((item) => ({
          ...item,
          titulo: sanitizeText(item.titulo),
          canal: sanitizeText(item.canal),
        })),
      )
    } catch {
      setErroBusca('Erro na busca, tente novamente.')
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!queryTrimmed) {
      setErroBusca('Digite o nome da música ou cole um link do YouTube.')
      return
    }

    if (ehLink) {
      await handleAdicionarPorLink()
      return
    }

    await executarBusca(query)
  }

  function pararReconhecimentoVoz() {
    try {
      recognitionRef.current?.stop()
    } catch {
      /* ignore */
    }
    setOuvindo(false)
  }

  function handleVoiceSearch() {
    if (ouvindo) {
      pararReconhecimentoVoz()
      return
    }

    if (!logSpeechRecognitionDisponivel()) {
      setErroVoz(MSG_BUSCA_VOZ_INDISPONIVEL)
      return
    }

    setErroVoz('')

    let recognition
    try {
      recognition = criarSpeechRecognition()
      recognitionRef.current = recognition
    } catch (err) {
      console.log('[voz] falha ao criar instância:', err)
      setErroVoz(MSG_BUSCA_VOZ_INDISPONIVEL)
      return
    }

    attachReconhecimentoVoz(recognition, {
      onStart: () => {
        setOuvindo(true)
        setErroVoz('')
      },
      onResult: (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim()
        if (transcript) {
          setQuery(transcript)
          void executarBusca(transcript)
        } else {
          setErroVoz(MSG_VOZ_NAO_IDENTIFICOU)
        }
      },
      onError: (event) => {
        const mensagem = mensagemErroReconhecimentoVoz(event.error)
        if (mensagem) setErroVoz(mensagem)
      },
      onEnd: () => {
        setOuvindo(false)
        recognitionRef.current = null
      },
    })

    try {
      iniciarReconhecimentoVoz(recognition)
    } catch (err) {
      console.log('[voz] recognition.start() exceção:', err)
      setOuvindo(false)
      recognitionRef.current = null
      setErroVoz(mensagemErroStartVoz(err))
    }
  }

  async function importarEAdicionarNaPlaylist(
    youtubeUrl,
    { tituloExibicao = null, titulo = null, artista = null } = {},
  ) {
    const result = await importarYoutube({
      youtubeUrl,
      ministroId: ministroId || null,
      titulo,
      artista,
    })

    if (result?.precisa_nome_manual) {
      return {
        needsManual: true,
        youtubeUrl: result.youtubeUrl || youtubeUrl,
        tituloExibicao,
        message: result.message,
      }
    }

    if (!result?.musica_id) {
      throw new Error('A importação não gerou uma música. Tente novamente.')
    }

    await addMusicaToPlaylist(playlistId, result.musica_id)
    const tituloMsg = tituloExibicao || result.titulo || 'Música'
    setSucesso(`"${tituloMsg}" importada e adicionada à playlist.`)
    onMusicaAdicionada?.()
    setTimeout(() => setSucesso(''), 5000)
    return result
  }

  async function handleAdicionar(result) {
    if (!result?.youtubeUrl || importingId || importingLink) return

    setImportingId(result.id || result.youtubeUrl)
    setErroAdicionar('')
    setSucesso('')
    setManualPending(null)

    try {
      const outcome = await importarEAdicionarNaPlaylist(result.youtubeUrl, {
        tituloExibicao: result.titulo,
        titulo: result.titulo,
        artista: result.canal,
      })

      if (outcome?.needsManual) {
        setManualPending({
          youtubeUrl: outcome.youtubeUrl,
          tituloExibicao: outcome.tituloExibicao,
          message: outcome.message,
        })
        setTituloManual(result.titulo || '')
        setArtistaManual(result.canal || '')
        return
      }

      resetarBuscaAposAdicionar()
    } catch (err) {
      setErroAdicionar(err.message || 'Erro ao adicionar. Tente novamente.')
    } finally {
      setImportingId(null)
    }
  }

  async function handleAdicionarPorLink() {
    if (importingLink || importingId) return

    const trimmed = queryTrimmed
    if (!trimmed) {
      setErroBusca('Cole um link do YouTube.')
      return
    }

    setImportingLink(true)
    setErroBusca('')
    setErroAdicionar('')
    setSucesso('')
    setManualPending(null)

    try {
      const youtubeUrl = canonicalYoutubeUrl(trimmed)
      const outcome = await importarEAdicionarNaPlaylist(youtubeUrl, {
        titulo: tituloManual || null,
        artista: artistaManual || null,
      })

      if (outcome?.needsManual) {
        setManualPending({
          youtubeUrl: outcome.youtubeUrl,
          message: outcome.message,
        })
        return
      }

      resetarBuscaAposAdicionar()
      setTituloManual('')
      setArtistaManual('')
    } catch (err) {
      setErroBusca(err.message || 'Erro ao importar. Tente novamente.')
    } finally {
      setImportingLink(false)
    }
  }

  async function handleManualRetry(event) {
    event.preventDefault()
    if (!manualPending?.youtubeUrl) return
    if (tituloManual.trim().length < 2 || artistaManual.trim().length < 2) {
      setErroAdicionar('Informe o nome da música e o artista.')
      return
    }

    setImportingLink(true)
    setErroAdicionar('')

    try {
      const outcome = await importarEAdicionarNaPlaylist(manualPending.youtubeUrl, {
        tituloExibicao: manualPending.tituloExibicao,
        titulo: tituloManual.trim(),
        artista: artistaManual.trim(),
      })

      if (outcome?.needsManual) {
        setManualPending({
          youtubeUrl: outcome.youtubeUrl,
          tituloExibicao: manualPending.tituloExibicao,
          message: outcome.message,
        })
        return
      }

      setManualPending(null)
      resetarBuscaAposAdicionar()
      setTituloManual('')
      setArtistaManual('')
    } catch (err) {
      setErroAdicionar(err.message || 'Erro ao importar. Tente novamente.')
    } finally {
      setImportingLink(false)
    }
  }

  const acaoDesabilitada =
    camposBloqueados || importando || !queryTrimmed || (!ehLink && queryTrimmed.length < 2)

  const labelAcao = (() => {
    if (importingLink || importingId) return 'Importando…'
    if (searching) return 'Buscando…'
    return ehLink ? 'Adicionar' : 'Buscar'
  })()

  if (camposBloqueados) {
    return null
  }

  return (
    <div className={`relative z-10 p-4 ${cardMutedClassName}`}>
      <p className="text-sm font-medium text-white">Buscar música no YouTube</p>
      <p className="mt-1 text-xs text-[var(--crash-texto-sec)]">
        Digite o nome, fale ou cole o link — um único campo para tudo.
      </p>

      <form onSubmit={handleSubmit} className="relative z-10 mt-4 space-y-3">
        <div className="space-y-2">
          <div className="flex items-stretch gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setErroVoz('')
                setErroBusca('')
              }}
              placeholder={PLACEHOLDER_BUSCA_EVENTO}
              className={inputBuscaClassName}
              disabled={camposBloqueados}
              maxLength={200}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={handleVoiceSearch}
              disabled={camposBloqueados || (importando && !ouvindo)}
              aria-pressed={ouvindo}
              aria-label={ouvindo ? 'Parar busca por voz' : 'Buscar por voz'}
              className={
                ouvindo
                  ? `${btnBuscaAlturaClassName} min-w-[4.5rem] border border-red-500 bg-red-600 text-white animate-pulse`
                  : `${btnSecondaryClassName} ${btnBuscaAlturaClassName} min-w-[4.5rem] font-medium`
              }
            >
              Voz
            </button>
            <button
              type="submit"
              disabled={acaoDesabilitada}
              className={`${btnPrimaryClassName} ${btnBuscaAlturaClassName} min-w-[5.75rem]`}
            >
              {labelAcao}
            </button>
          </div>
          {ouvindo && (
            <p className="text-sm text-[var(--crash-cifra)]" role="status" aria-live="polite">
              Ouvindo... fale o nome da música
            </p>
          )}
          {erroVoz && (
            <p className={classeAvisoVoz} role="alert">
              {erroVoz}
            </p>
          )}
          {erroBusca && (
            <p className="text-sm text-red-400" role="alert">
              {erroBusca}
            </p>
          )}
        </div>

        <label className="block">
          <span className="text-xs text-[var(--crash-texto-sec)]">Ministro (pasta)</span>
          <select
            value={ministroId}
            onChange={(e) => setMinistroId(e.target.value)}
            className={`${selectClassName} mt-1`}
            disabled={camposBloqueados}
          >
            <option value="">Sem ministro</option>
            {ministros.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </label>
      </form>

      {manualPending && (
        <form
          onSubmit={handleManualRetry}
          className="mt-4 space-y-3 rounded-lg border border-amber-700/40 bg-amber-950/20 p-4"
        >
          <p className="text-sm text-amber-200">
            {manualPending.message ||
              'Informe o nome da música e o artista para identificar na pasta.'}
          </p>
          <label className="block">
            <span className="text-xs text-[var(--crash-texto-sec)]">Nome da música</span>
            <input
              type="text"
              required
              value={tituloManual}
              onChange={(e) => setTituloManual(e.target.value)}
              className={`${inputClassName} mt-1`}
            />
          </label>
          <label className="block">
            <span className="text-xs text-[var(--crash-texto-sec)]">Artista</span>
            <input
              type="text"
              required
              value={artistaManual}
              onChange={(e) => setArtistaManual(e.target.value)}
              className={`${inputClassName} mt-1`}
            />
          </label>
          <button type="submit" disabled={importando} className={btnPrimaryClassName}>
            {importingLink ? 'Salvando…' : 'Continuar e adicionar à playlist'}
          </button>
        </form>
      )}

      {erroAdicionar && (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {erroAdicionar}
        </p>
      )}

      {importando && (
        <p className="mt-3 text-sm text-[var(--crash-cifra)]" role="status" aria-live="polite">
          {importingLink
            ? 'Salvando o link do vídeo…'
            : searching
              ? 'Buscando…'
              : 'Processando…'}
        </p>
      )}

      {sucesso && (
        <p className="mt-3 text-sm text-emerald-400" role="status" aria-live="polite">
          {sucesso}
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-4 space-y-2">
          {results.map((result) => {
            const key = result.id || result.youtubeUrl
            const isImporting = importingId === key
            return (
              <li
                key={key}
                className={`flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap ${cardClassName}`}
              >
                {result.thumbnail && (
                  <img
                    src={result.thumbnail}
                    alt=""
                    className="h-14 w-20 shrink-0 rounded object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium text-white">{result.titulo}</p>
                  <p className="mt-0.5 text-xs text-[var(--crash-texto-sec)]">
                    {result.canal}
                    {result.duracao ? ` · ${result.duracao}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAdicionar(result)}
                  disabled={camposBloqueados || importando}
                  className={`${btnPrimaryClassName} shrink-0`}
                >
                  {isImporting ? 'Importando…' : 'Adicionar'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
