import { useCallback, useEffect, useRef, useState } from 'react'

/** Só para erros reais de permissão / captura de áudio. */
export const MSG_MICROFONE_INDISPONIVEL =
  'Permita o uso do microfone ou digite o nome da música.'

/** Microfone bloqueado nas configurações do site (permissão já negada). */
export const MSG_MICROFONE_BLOQUEADO =
  'O microfone está bloqueado. Clique no cadeado 🔒 na barra de endereço → Permissões → Microfone → Permitir, e toque no microfone de novo.'

/** Bloqueado pelo cabeçalho Permissions-Policy do servidor (não é permissão do navegador). */
export const MSG_MICROFONE_BLOQUEADO_PELO_SITE =
  'O microfone está bloqueado pela política de segurança deste site (Permissions-Policy). Isso é configuração do servidor, não do cadeado do navegador.'

/** Placeholder unificado — campos com busca por texto + voz. */
export const PLACEHOLDER_BUSCA_VOZ = 'Digite o nome da música ou fale'

/** Aviso quando o reconhecimento de voz não obtém resultado utilizável. */
export const MSG_VOZ_NAO_IDENTIFICOU =
  'Não conseguimos identificar por áudio. Por favor, digite o nome da música.'

export const MSG_BUSCA_VOZ_INDISPONIVEL =
  'Seu navegador não suporta busca por voz. Use o Chrome (ou Edge) ou digite o nome da música.'

export const MSG_BUSCA_VOZ_SEM_HTTPS =
  'A busca por voz precisa de conexão segura (HTTPS). Digite o nome da música.'

/** @type {string} */
export const classeAvisoVoz =
  'rounded-lg border border-amber-600/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100'

/** @returns {typeof SpeechRecognition | null} */
export function getSpeechRecognition() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

/** @deprecated alias */
export const getSpeechRecognitionCtor = getSpeechRecognition

export function logSpeechRecognitionDisponivel() {
  const disponivel = getSpeechRecognition()
  console.log('[voz] SpeechRecognition disponível?', !!disponivel, {
    'window.SpeechRecognition': Boolean(window.SpeechRecognition),
    'window.webkitSpeechRecognition': Boolean(window.webkitSpeechRecognition),
    secureContext: typeof window !== 'undefined' ? window.isSecureContext : null,
    origin: typeof window !== 'undefined' ? window.location.origin : null,
  })
  return disponivel
}

/** @param {SpeechRecognitionErrorEvent} event */
export function logErroReconhecimentoVoz(event) {
  const code = event?.error ?? 'desconhecido'
  console.log('[voz] recognition.onerror — código:', code, '| evento completo:', event)
}

/**
 * Cria instância nativa do navegador.
 * @returns {SpeechRecognition}
 */
export function criarSpeechRecognition() {
  const SpeechRecognition = getSpeechRecognition()
  if (!SpeechRecognition) {
    throw new Error('SpeechRecognition não suportado neste navegador')
  }

  const recognition = new SpeechRecognition()
  recognition.lang = 'pt-BR'
  // interimResults ajuda mobile/Chrome a emitir onresult antes do onend
  recognition.interimResults = true
  recognition.continuous = false
  recognition.maxAlternatives = 1

  console.log('[voz] SpeechRecognition instanciado', {
    lang: recognition.lang,
    interimResults: recognition.interimResults,
    continuous: recognition.continuous,
  })

  return recognition
}

/** Extrai o melhor transcript do evento onresult (itera a partir de resultIndex). */
export function extrairTranscriptDoResultado(event) {
  const results = event?.results
  if (!results?.length) return ''

  let finalText = ''
  let interimText = ''

  const from = typeof event.resultIndex === 'number' ? event.resultIndex : 0
  for (let i = from; i < results.length; i++) {
    const piece = results[i]?.[0]?.transcript
    if (!piece) continue
    if (results[i].isFinal) {
      finalText += piece
    } else {
      interimText += piece
    }
  }

  return (finalText || interimText).trim()
}

/** @param {string} errorCode */
export function mensagemErroReconhecimentoVoz(errorCode) {
  switch (errorCode) {
    case 'aborted':
      return null
    case 'not-allowed':
      return MSG_MICROFONE_BLOQUEADO
    case 'service-not-allowed':
      return MSG_MICROFONE_BLOQUEADO_PELO_SITE
    case 'audio-capture':
      return MSG_MICROFONE_INDISPONIVEL
    case 'no-speech':
      return MSG_VOZ_NAO_IDENTIFICOU
    case 'network':
      return 'Busca por voz precisa de internet e acesso aos servidores do Google. Verifique a conexão ou a política CSP do site.'
    case 'language-not-supported':
      return 'Idioma pt-BR não suportado neste navegador para voz. Digite o nome da música.'
    default:
      return MSG_VOZ_NAO_IDENTIFICOU
  }
}

/** Mensagem para a UI com o código bruto do recognition.onerror (diagnóstico visível). */
export function formatarErroVozNaTela(errorCode) {
  if (!errorCode || errorCode === 'aborted') return ''
  const base = mensagemErroReconhecimentoVoz(errorCode)
  if (base) return `${base} [erro: ${errorCode}]`
  return `Falha no reconhecimento de voz [erro: ${errorCode}]`
}

/**
 * @param {SpeechRecognition} recognition
 * @param {{ onStart?: () => void, onResult?: (e: SpeechRecognitionEvent) => void, onError?: (e: SpeechRecognitionErrorEvent) => void, onEnd?: () => void, onNoMatch?: () => void }} handlers
 */
export function attachReconhecimentoVoz(recognition, handlers) {
  const { onStart, onResult, onError, onEnd, onNoMatch } = handlers

  recognition.onstart = () => {
    console.log('[voz] recognition.onstart')
    onStart?.()
  }

  recognition.onresult = (event) => {
    const transcript = extrairTranscriptDoResultado(event)
    console.log('[voz] recognition.onresult', {
      resultIndex: event.resultIndex,
      length: event.results?.length,
      transcript,
      results: event.results,
    })
    onResult?.(event)
  }

  recognition.onerror = (event) => {
    logErroReconhecimentoVoz(event)
    onError?.(event)
  }

  recognition.onend = () => {
    console.log('[voz] recognition.onend')
    onEnd?.()
  }

  recognition.onnomatch = () => {
    console.log('[voz] recognition.onnomatch')
    onNoMatch?.()
  }
}

/** @param {SpeechRecognition} recognition */
export function iniciarReconhecimentoVoz(recognition) {
  recognition.start()
  console.log('[voz] recognition.start() chamado (síncrono no gesto do clique)')
}

/** @param {unknown} err */
export function mensagemErroStartVoz(err) {
  if (err instanceof Error && err.name === 'InvalidStateError') {
    return MSG_VOZ_NAO_IDENTIFICOU
  }
  if (err?.code === 'not-allowed') return MSG_MICROFONE_BLOQUEADO
  if (err?.code === 'insecure') return MSG_BUSCA_VOZ_SEM_HTTPS
  if (err?.code === 'unsupported' || err?.code === 'audio-capture') {
    return err.message || MSG_MICROFONE_INDISPONIVEL
  }
  return MSG_VOZ_NAO_IDENTIFICOU
}

function abortarReconhecimentoAtual(recognitionRef) {
  try {
    recognitionRef.current?.abort()
  } catch {
    /* ignore */
  }
  recognitionRef.current = null
}

/**
 * Hook compartilhado: ouvir → transcript.
 * IMPORTANTE: recognition.start() roda de forma síncrona no clique (sem await antes),
 * pois Chrome exige gesto do usuário ativo — await getUserMedia quebrava a captura.
 *
 * @param {{ onTranscript: (text: string) => void, disabled?: boolean }} options
 */
export function useVoiceSearch({ onTranscript, disabled = false }) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const recognitionRef = useRef(null)
  const onTranscriptRef = useRef(onTranscript)
  const transcriptEntregueRef = useRef(false)
  const ultimoTranscriptRef = useRef('')

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  useEffect(() => {
    return () => abortarReconhecimentoAtual(recognitionRef)
  }, [])

  const clearError = useCallback(() => setError(''), [])

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop()
    } catch {
      try {
        recognitionRef.current?.abort()
      } catch {
        /* ignore */
      }
    }
    setListening(false)
    recognitionRef.current = null
  }, [])

  const start = useCallback(() => {
    if (disabled) return

    setError('')
    transcriptEntregueRef.current = false
    ultimoTranscriptRef.current = ''

    if (!logSpeechRecognitionDisponivel()) {
      setError(MSG_BUSCA_VOZ_INDISPONIVEL)
      return
    }

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setError(MSG_BUSCA_VOZ_SEM_HTTPS)
      return
    }

    abortarReconhecimentoAtual(recognitionRef)

    let recognition
    try {
      recognition = criarSpeechRecognition()
      recognitionRef.current = recognition
    } catch (err) {
      console.log('[voz] falha ao criar instância:', err)
      setError(MSG_BUSCA_VOZ_INDISPONIVEL)
      return
    }

    attachReconhecimentoVoz(recognition, {
      onStart: () => {
        setListening(true)
        setError('')
      },
      onResult: (event) => {
        const transcript = extrairTranscriptDoResultado(event)
        if (!transcript) return

        ultimoTranscriptRef.current = transcript

        const lastIdx = event.results.length - 1
        const isFinal = event.results[lastIdx]?.isFinal

        if (isFinal && !transcriptEntregueRef.current) {
          transcriptEntregueRef.current = true
          console.log('[voz] entregando transcript final:', transcript)
          onTranscriptRef.current?.(transcript)
        }
      },
      onError: (event) => {
        const code = event?.error || 'desconhecido'
        const mensagem = formatarErroVozNaTela(code)
        if (mensagem) setError(mensagem)
      },
      onNoMatch: () => {
        if (!transcriptEntregueRef.current) {
          setError(`${MSG_VOZ_NAO_IDENTIFICOU} [erro: no-match]`)
        }
      },
      onEnd: () => {
        setListening(false)
        recognitionRef.current = null

        if (!transcriptEntregueRef.current && ultimoTranscriptRef.current) {
          transcriptEntregueRef.current = true
          console.log('[voz] entregando transcript no onend:', ultimoTranscriptRef.current)
          onTranscriptRef.current?.(ultimoTranscriptRef.current)
          return
        }

        if (!transcriptEntregueRef.current) {
          console.log('[voz] onend sem transcript')
        }
      },
    })

    try {
      iniciarReconhecimentoVoz(recognition)
    } catch (err) {
      console.log('[voz] recognition.start() exceção:', err)
      setListening(false)
      recognitionRef.current = null
      const base = mensagemErroStartVoz(err)
      const extra = err instanceof Error ? err.name : 'erro'
      setError(base ? `${base} [start: ${extra}]` : `Falha ao iniciar voz [start: ${extra}]`)
    }
  }, [disabled])

  const toggle = useCallback(() => {
    if (listening) {
      stop()
      return
    }
    start()
  }, [listening, start, stop])

  return {
    listening,
    error,
    clearError,
    start,
    stop,
    toggle,
    supported: Boolean(getSpeechRecognition()),
  }
}
