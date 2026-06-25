/** Só para erros reais de permissão / captura de áudio. */
export const MSG_MICROFONE_INDISPONIVEL =
  'Permita o uso do microfone ou digite o nome da música.'

/** Placeholder unificado — campos com busca por texto + voz. */
export const PLACEHOLDER_BUSCA_VOZ = 'Digite o nome da música ou fale'

/** Aviso quando o reconhecimento de voz não obtém resultado utilizável. */
export const MSG_VOZ_NAO_IDENTIFICOU =
  'Não conseguimos identificar por áudio. Por favor, digite o nome da música.'

export const MSG_BUSCA_VOZ_INDISPONIVEL =
  'Busca por voz não disponível aqui. Digite o nome da música.'

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
    secureContext: window.isSecureContext,
    origin: window.location.origin,
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
    case 'audio-capture':
      return MSG_MICROFONE_INDISPONIVEL
    case 'no-speech':
      return MSG_VOZ_NAO_IDENTIFICOU
    case 'network':
      return MSG_VOZ_NAO_IDENTIFICOU
    case 'service-not-allowed':
      return MSG_VOZ_NAO_IDENTIFICOU
    case 'language-not-supported':
      return MSG_VOZ_NAO_IDENTIFICOU
    default:
      return MSG_VOZ_NAO_IDENTIFICOU
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
  return MSG_VOZ_NAO_IDENTIFICOU
}
