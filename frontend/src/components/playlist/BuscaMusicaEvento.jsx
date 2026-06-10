import { useEffect, useRef, useState } from 'react'
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
  criarSpeechRecognition,
  iniciarReconhecimentoVoz,
  logSpeechRecognitionDisponivel,
  mensagemErroReconhecimentoVoz,
  mensagemErroStartVoz,
} from '../../lib/voiceSearch'
import { useMinistros } from '../../hooks/useMinistros'
import { buscarYoutube, importarYoutube } from '../../services/importacao'
import { addMusicaToPlaylist } from '../../services/playlists'

function canonicalYoutubeUrl(url) {
  const result = validateYoutubeUrl(url)
  if (!result.valid) {
    throw new Error(result.error || 'Link do YouTube inválido.')
  }
  return `https://www.youtube.com/watch?v=${result.videoId}`
}

export function BuscaMusicaEvento({ playlistId, disabled = false, onMusicaAdicionada }) {
  const { ministros } = useMinistros()
  const [query, setQuery] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [ministroId, setMinistroId] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [importingId, setImportingId] = useState(null)
  const [importingLink, setImportingLink] = useState(false)
  const [erroBusca, setErroBusca] = useState('')
  const [erroLink, setErroLink] = useState('')
  const [erroAdicionar, setErroAdicionar] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [ouvindo, setOuvindo] = useState(false)
  const [manualPending, setManualPending] = useState(null)
  const [tituloManual, setTituloManual] = useState('')
  const [artistaManual, setArtistaManual] = useState('')
  const recognitionRef = useRef(null)

  const importando = searching || !!importingId || importingLink
  const camposBloqueados = disabled

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

  async function handleSearch(event) {
    event.preventDefault()
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
      setErroBusca('Seu navegador não suporta busca por voz. Use o campo de texto.')
      return
    }

    setErroBusca('')

    let recognition
    try {
      recognition = criarSpeechRecognition()
      recognitionRef.current = recognition
    } catch (err) {
      console.log('[voz] falha ao criar instância:', err)
      setErroBusca('Seu navegador não suporta busca por voz. Use o campo de texto.')
      return
    }

    attachReconhecimentoVoz(recognition, {
      onStart: () => {
        setOuvindo(true)
        setErroBusca('')
      },
      onResult: (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim()
        if (transcript) {
          setQuery(transcript)
          void executarBusca(transcript)
        } else {
          setErroBusca('Não foi possível entender. Tente novamente.')
        }
      },
      onError: (event) => {
        const mensagem = mensagemErroReconhecimentoVoz(event.error)
        if (mensagem) setErroBusca(mensagem)
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
      setErroBusca(mensagemErroStartVoz(err))
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

      setResults((prev) =>
        prev.filter((r) => (r.id || r.youtubeUrl) !== (result.id || result.youtubeUrl)),
      )
    } catch (err) {
      setErroAdicionar(err.message || 'Erro ao adicionar. Tente novamente.')
    } finally {
      setImportingId(null)
    }
  }

  async function handleAdicionarPorLink() {
    if (importingLink || importingId) return

    const trimmed = linkUrl.trim()
    if (!trimmed) {
      setErroLink('Cole um link do YouTube.')
      return
    }

    setImportingLink(true)
    setErroLink('')
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

      setLinkUrl('')
      setTituloManual('')
      setArtistaManual('')
    } catch (err) {
      setErroLink(err.message || 'Erro ao importar. Tente novamente.')
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
      setLinkUrl('')
      setTituloManual('')
      setArtistaManual('')
    } catch (err) {
      setErroAdicionar(err.message || 'Erro ao importar. Tente novamente.')
    } finally {
      setImportingLink(false)
    }
  }

  function handleLinkKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleAdicionarPorLink()
    }
  }

  if (camposBloqueados) {
    return null
  }

  return (
    <div className={`relative z-10 p-4 ${cardMutedClassName}`}>
      <p className="text-sm font-medium text-white">Buscar música no YouTube</p>
      <p className="mt-1 text-xs text-[var(--crash-texto-sec)]">
        Busque por nome ou cole um link — cada opção funciona de forma independente.
      </p>

      <form onSubmit={handleSearch} className="relative z-10 mt-4 space-y-3">
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nome da música ou artista"
              className={inputClassName}
              disabled={camposBloqueados}
              maxLength={100}
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
                  ? 'shrink-0 rounded-lg border border-red-500 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white animate-pulse'
                  : `${btnSecondaryClassName} shrink-0`
              }
            >
              Voz
            </button>
          </div>
          {ouvindo && (
            <p className="text-sm text-[var(--crash-cifra)]" role="status" aria-live="polite">
              Ouvindo... fale o nome da música
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={handleLinkKeyDown}
            placeholder="Ou cole o link do YouTube aqui..."
            className={inputClassName}
            disabled={camposBloqueados}
            maxLength={200}
            autoComplete="off"
            inputMode="url"
          />
          <button
            type="button"
            onClick={handleAdicionarPorLink}
            disabled={camposBloqueados || importando || !linkUrl.trim()}
            className={`${btnPrimaryClassName} shrink-0`}
          >
            {importingLink ? 'Importando…' : 'Adicionar'}
          </button>
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

        <button
          type="submit"
          disabled={camposBloqueados || importando || query.trim().length < 2}
          className={btnPrimaryClassName}
        >
          {searching ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {manualPending && (
        <form
          onSubmit={handleManualRetry}
          className="mt-4 space-y-3 rounded-lg border border-amber-700/40 bg-amber-950/20 p-4"
        >
          <p className="text-sm text-amber-200">
            {manualPending.message ||
              'Não conseguimos ler o título do YouTube. Digite o nome da música e o artista.'}
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
            {importingLink ? 'Buscando cifra…' : 'Continuar e adicionar à playlist'}
          </button>
        </form>
      )}

      {erroBusca && (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {erroBusca}
        </p>
      )}

      {erroLink && (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {erroLink}
        </p>
      )}

      {erroAdicionar && (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {erroAdicionar}
        </p>
      )}

      {importando && (
        <p className="mt-3 text-sm text-[var(--crash-cifra)]" role="status" aria-live="polite">
          {importingLink ? 'Importando…' : searching ? 'Buscando…' : 'Processando…'}
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
