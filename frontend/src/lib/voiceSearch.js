import { useCallback, useEffect, useRef, useState } from 'react'

/** Só para erros reais de permissão / captura de áudio. */
export const MSG_MICROFONE_INDISPONIVEL =
  'Permita o uso do microfone ou digite o nome da música.'

/** Microfone bloqueado nas configurações do site (permissão já negada). */
export const MSG_MICROFONE_BLOQUEADO =
  'O microfone está bloqueado. Clique no cadeado 🔒 na barra de endereço → Permissões → Microfone → Permitir, e toque no microfone de novo.'

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
  recognition.interimResults = false
  recognition.continuous = false
  recognition.maxAlternatives = 1

  console.log('[voz] SpeechRecognition instanciado', {
    lang: recognition.lang,
    interimResults: recognition.interimResults,
    continuous: recognition.continuous,
  })

  return recognition
}

/** @param {string} errorCode */
export function mensagemErroReconhecimentoVoz(errorCode) {
  switch (errorCode) {
    case 'aborted':
      return null
    case 'not-allowed':
    case 'service-not-allowed':
      return MSG_MICROFONE_BLOQUEADO
    case 'audio-capture':
      return MSG_MICROFONE_INDISPONIVEL
    case 'no-speech':
      return MSG_VOZ_NAO_IDENTIFICOU
    case 'network':
      return MSG_VOZ_NAO_IDENTIFICOU
    case 'language-not-supported':
      return MSG_VOZ_NAO_IDENTIFICOU
    default:
      return MSG_VOZ_NAO_IDENTIFICOU
  }
}

/**
 * Pede permissão de microfone via getUserMedia (dispara o popup do navegador).
 * Libera o stream na hora — só precisamos do grant para o SpeechRecognition.
 * @returns {Promise<'granted'>}
 */
export async function garantirPermissaoMicrofone() {
  if (typeof window === 'undefined') {
    throw Object.assign(new Error('sem window'), { code: 'unsupported' })
  }

  if (!window.isSecureContext) {
    throw Object.assign(new Error('HTTPS necessário'), { code: 'insecure' })
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    console.log('[voz] getUserMedia indisponível — seguindo só com SpeechRecognition')
    return 'granted'
  }

  console.log('[voz] pedindo permissão do microfone (getUserMedia)')
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((track) => track.stop())
    console.log('[voz] permissão de microfone concedida')
    return 'granted'
  } catch (err) {
    const name = err?.name || ''
    console.log('[voz] getUserMedia falhou:', name, err)
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      throw Object.assign(new Error(MSG_MICROFONE_BLOQUEADO), { code: 'not-allowed' })
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      throw Object.assign(new Error(MSG_MICROFONE_INDISPONIVEL), { code: 'audio-capture' })
    }
    throw Object.assign(new Error(MSG_MICROFONE_INDISPONIVEL), {
      code: 'unknown',
      cause: err,
    })
  }
}

/**
 * @param {SpeechRecognition} recognition
 * @param {{ onStart?: () => void, onResult?: (e: SpeechRecognitionEvent) => void, onError?: (e: SpeechRecognitionErrorEvent) => void, onEnd?: () => void }} handlers
 */
export function attachReconhecimentoVoz(recognition, handlers) {
  const { onStart, onResult, onError, onEnd } = handlers

  recognition.onstart = () => {
    console.log('[voz] recognition.onstart')
    onStart?.()
  }

  recognition.onresult = (event) => {
    console.log('[voz] recognition.onresult', event.results)
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
}

/** @param {SpeechRecognition} recognition */
export function iniciarReconhecimentoVoz(recognition) {
  recognition.start()
  console.log('[voz] recognition.start() chamado')
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

/**
 * Hook compartilhado: permissão → ouvir → transcript.
 * Usado no modal YouTube (pasta do ministro), na página Importar e na busca do evento.
 *
 * @param {{ onTranscript: (text: string) => void, disabled?: boolean }} options
 */
export function useVoiceSearch({ onTranscript, disabled = false }) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const recognitionRef = useRef(null)
  const onTranscriptRef = useRef(onTranscript)
  const startingRef = useRef(false)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort()
      } catch {
        /* ignore */
      }
    }
  }, [])

  const clearError = useCallback(() => setError(''), [])

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop()
    } catch {
      /* ignore */
    }
    setListening(false)
    startingRef.current = false
  }, [])

  const start = useCallback(async () => {
    if (disabled || startingRef.current) return

    setError('')

    if (!logSpeechRecognitionDisponivel()) {
      setError(MSG_BUSCA_VOZ_INDISPONIVEL)
      return
    }

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setError(MSG_BUSCA_VOZ_SEM_HTTPS)
      return
    }

    startingRef.current = true
    setListening(true)

    try {
      await garantirPermissaoMicrofone()
    } catch (err) {
      startingRef.current = false
      setListening(false)
      if (err?.code === 'not-allowed') {
        setError(MSG_MICROFONE_BLOQUEADO)
      } else if (err?.code === 'insecure') {
        setError(MSG_BUSCA_VOZ_SEM_HTTPS)
      } else {
        setError(err?.message || MSG_MICROFONE_INDISPONIVEL)
      }
      return
    }

    let recognition
    try {
      recognition = criarSpeechRecognition()
      recognitionRef.current = recognition
    } catch (err) {
      console.log('[voz] falha ao criar instância:', err)
      startingRef.current = false
      setListening(false)
      setError(MSG_BUSCA_VOZ_INDISPONIVEL)
      return
    }

    attachReconhecimentoVoz(recognition, {
      onStart: () => {
        setListening(true)
        setError('')
      },
      onResult: (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim()
        if (transcript) {
          onTranscriptRef.current?.(transcript)
        } else {
          setError(MSG_VOZ_NAO_IDENTIFICOU)
        }
      },
      onError: (event) => {
        const mensagem = mensagemErroReconhecimentoVoz(event.error)
        if (mensagem) setError(mensagem)
      },
      onEnd: () => {
        setListening(false)
        startingRef.current = false
        recognitionRef.current = null
      },
    })

    try {
      iniciarReconhecimentoVoz(recognition)
    } catch (err) {
      console.log('[voz] recognition.start() exceção:', err)
      startingRef.current = false
      setListening(false)
      recognitionRef.current = null
      setError(mensagemErroStartVoz(err))
    }
  }, [disabled])

  const toggle = useCallback(() => {
    if (listening || startingRef.current) {
      stop()
      return
    }
    void start()
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
