/** Só para erros reais de permissão / captura de áudio. */
export const MSG_MICROFONE_INDISPONIVEL =
  'Microfone não disponível. Verifique as permissões do navegador.'

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
      return 'Nenhuma fala detectada. Tente novamente.'
    case 'network':
      return (
        'O serviço de voz do navegador não respondeu (erro de rede). ' +
        'Verifique sua internet, use Chrome ou Edge e acesse por localhost ou HTTPS — ' +
        'não é falha do microfone do sistema.'
      )
    case 'service-not-allowed':
      return (
        'Reconhecimento de voz bloqueado neste site. ' +
        'Permita o microfone para este endereço nas configurações do navegador.'
      )
    case 'language-not-supported':
      return 'Reconhecimento em português (pt-BR) não suportado neste navegador.'
    default:
      return `Erro no reconhecimento de voz (${errorCode || 'desconhecido'}). Veja o console [voz].`
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
    return 'O reconhecimento já estava ativo. Aguarde um instante e tente de novo.'
  }
  const detail = err instanceof Error ? err.message : String(err)
  return `Não foi possível iniciar o reconhecimento de voz (${detail}).`
}
