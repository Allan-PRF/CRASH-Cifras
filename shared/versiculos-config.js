import { SECAO_PARA_MOMENTO_VERSICULO } from './constants.js'

export const MOMENTOS_VERSICULO = [
  { id: 'verso', label: 'Verso principal' },
  { id: 'refrao', label: 'Refrão' },
  { id: 'ponte', label: 'Ponte' },
]

export const MOMENTOS_ATIVOS_PADRAO = {
  verso: true,
  refrao: true,
  ponte: true,
}

/** Toggles independentes (sem cap por quantidade 1/2/3). */
export function parseMomentosAtivos(raw) {
  const base = { verso: false, refrao: false, ponte: false }
  if (raw && typeof raw === 'object') {
    for (const m of MOMENTOS_VERSICULO) {
      if (typeof raw[m.id] === 'boolean') base[m.id] = raw[m.id]
    }
  }
  return base
}

/** Quantidade = número de toggles ligados (0–3). */
export function quantidadeFromMomentosAtivos(momentos) {
  return MOMENTOS_VERSICULO.filter((m) => momentos[m.id] === true).length
}

/**
 * @param {unknown} raw
 * @param {number} [quantidade] — legado: força OFF nos momentos além do índice
 */
export function normalizarMomentosAtivos(raw, quantidade = 3) {
  const parsed = parseMomentosAtivos(raw)
  const qty = normalizarQuantidadeVersiculos(quantidade)
  MOMENTOS_VERSICULO.forEach((m, index) => {
    if (index >= qty) parsed[m.id] = false
  })
  return parsed
}

/** @param {unknown} raw @returns {'ia' | 'manual'} */
export function parseModoVersiculo(raw) {
  return raw === 'manual' ? 'manual' : 'ia'
}

/**
 * @param {unknown} raw
 */
export function normalizarVersiculoPrefs(raw) {
  return prepararVersiculoPrefsParaSalvar(raw)
}

/**
 * Valida e normaliza prefs para salvar em musicas.versiculo_prefs.
 * @param {unknown} raw
 */
export function prepararVersiculoPrefsParaSalvar(raw) {
  if (!raw || typeof raw !== 'object') return null
  const momentos_ativos = parseMomentosAtivos(raw.momentos_ativos)
  const qty = quantidadeFromMomentosAtivos(momentos_ativos)
  if (qty === 0) return null

  const modo = parseModoVersiculo(raw.modo)
  const base = {
    versao_biblica:
      typeof raw.versao_biblica === 'string' && raw.versao_biblica.trim()
        ? raw.versao_biblica.trim()
        : 'NVI',
    quantidade_versiculos: qty,
    momentos_ativos,
    modo,
  }

  if (modo === 'manual') {
    const manual_referencia = String(raw.manual_referencia || '').trim()
    const manual_texto = String(raw.manual_texto || '').trim()
    if (!manual_referencia || !manual_texto) return null
    const manual_palavra = String(raw.manual_palavra || '').trim()
    return {
      ...base,
      manual_referencia,
      manual_texto,
      ...(manual_palavra ? { manual_palavra } : {}),
    }
  }

  return base
}

/**
 * Versículos a partir do modo manual (um texto por momento ativo).
 * @param {unknown} prefs
 * @param {Array<{ id: string, slug?: string }>} secoes
 */
export function versiculosFromManualPrefs(prefs, secoes = []) {
  const norm = prepararVersiculoPrefsParaSalvar(prefs)
  if (!norm || norm.modo !== 'manual') return []

  const base = {
    referencia: norm.manual_referencia,
    texto: norm.manual_texto,
    palavra: norm.manual_palavra || '',
    versao: norm.versao_biblica,
  }

  const lista = MOMENTOS_VERSICULO.filter((m) => norm.momentos_ativos[m.id] === true).map(
    (m) => ({ ...base, momento: m.id }),
  )

  return aplicarSecoesPadraoVersiculos(lista, secoes, norm.momentos_ativos)
}

/** @param {unknown} prefs */
export function isVersiculoModoManual(prefs) {
  return prefs && typeof prefs === 'object' && prefs.modo === 'manual'
}

/** Mescla prefs da música com prefs do evento (evento sobrescreve só o que faltar na música). */
export function mesclarVersiculoPrefs(prefsMusica, prefsEvento, versaoUsuario = 'NVI') {
  const musica = normalizarVersiculoPrefs(prefsMusica)
  const eventoMomentos = prefsEvento
    ? parseMomentosAtivos(prefsEvento.momentos_ativos)
    : { verso: false, refrao: false, ponte: false }
  const musicaMomentos = musica?.momentos_ativos ?? {
    verso: false,
    refrao: false,
    ponte: false,
  }

  const momentos_ativos = {
    verso: musicaMomentos.verso || eventoMomentos.verso,
    refrao: musicaMomentos.refrao || eventoMomentos.refrao,
    ponte: musicaMomentos.ponte || eventoMomentos.ponte,
  }

  const quantidade = quantidadeFromMomentosAtivos(momentos_ativos)

  const musicaRaw =
    prefsMusica && typeof prefsMusica === 'object' ? prefsMusica : null
  const modo = isVersiculoModoManual(musicaRaw) ? 'manual' : 'ia'

  const merged = {
    versao_biblica:
      musica?.versao_biblica ||
      prefsEvento?.versao_biblica ||
      versaoUsuario ||
      'NVI',
    quantidade_versiculos: quantidade,
    momentos_ativos,
    modo,
  }

  if (modo === 'manual' && musica) {
    merged.manual_referencia = musica.manual_referencia
    merged.manual_texto = musica.manual_texto
    if (musica.manual_palavra) merged.manual_palavra = musica.manual_palavra
  }

  return merged
}

const SLUGS_POR_MOMENTO = {
  verso: ['verso', 'intro'],
  refrao: ['refrao', 'pre_refrao'],
  ponte: ['ponte', 'outro'],
}

/**
 * @param {unknown} value
 * @returns {1 | 2 | 3}
 */
export function normalizarQuantidadeVersiculos(value) {
  const n = Number(value)
  if (n === 2) return 2
  if (n === 3) return 3
  return 1
}

/**
 * @param {Array<{ id: string, slug?: string, nome?: string, ordem_original?: number }>} secoes
 * @param {'verso'|'refrao'|'ponte'} momento
 */
export function secaoPadraoParaMomento(secoes, momento) {
  if (!Array.isArray(secoes) || secoes.length === 0) return null
  const slugs = SLUGS_POR_MOMENTO[momento] || ['verso']
  for (const slug of slugs) {
    const found = secoes.find((s) => s.slug === slug)
    if (found?.id) return found.id
  }
  return secoes.find((s) => s.id)?.id ?? null
}

/**
 * @param {Array<{ id: string, nome?: string, slug?: string }>} secoes
 * @param {string | null | undefined} secaoId
 */
export function rotuloSecaoPorId(secoes, secaoId) {
  if (!secaoId) return '—'
  const sec = secoes.find((s) => s.id === secaoId)
  return sec?.nome || sec?.slug || 'Seção'
}

/**
 * Garante secao_id em cada versículo conforme quantidade ativa.
 * @param {Array<Record<string, unknown>>} versiculos
 * @param {Array<{ id: string, slug?: string, nome?: string }>} secoes
 * @param {number} quantidade
 */
export function aplicarSecoesPadraoVersiculos(versiculos, secoes, quantidadeOuMomentos) {
  const momentos =
    typeof quantidadeOuMomentos === 'object' && quantidadeOuMomentos !== null
      ? parseMomentosAtivos(quantidadeOuMomentos)
      : normalizarMomentosAtivos(MOMENTOS_ATIVOS_PADRAO, quantidadeOuMomentos)

  return (Array.isArray(versiculos) ? versiculos : []).map((item) => {
    if (!item.momento || momentos[item.momento] !== true) return item
    const secaoId = item.secao_id || secaoPadraoParaMomento(secoes, item.momento)
    return secaoId ? { ...item, secao_id: secaoId } : item
  })
}

/**
 * Versículos ativos conforme quantidade configurada.
 * @param {Array<{ momento?: string }> | null | undefined} versiculos
 * @param {number} quantidade
 */
export function versiculosAtivosPorQuantidade(
  versiculos,
  quantidade,
  momentosAtivos = MOMENTOS_ATIVOS_PADRAO,
) {
  const ativosMap = parseMomentosAtivos(momentosAtivos)
  const lista = Array.isArray(versiculos) ? versiculos : []
  return MOMENTOS_VERSICULO.map((m) => lista.find((v) => v.momento === m.id)).filter(
    (v) => v && ativosMap[v.momento] === true,
  )
}

/**
 * Monta registro no formato versiculos_playlist a partir de musicas.versiculo_prefs.
 * @param {object} params
 * @param {unknown} params.prefs — musicas.versiculo_prefs
 * @param {Array<Record<string, unknown>>} [params.versiculos]
 * @param {Array<{ id: string, slug?: string }>} [params.secoes]
 * @param {string | null} [params.tema]
 * @param {Record<string, unknown>} [params.extras]
 */
export function montarRegistroVersiculosFromPrefs({
  prefs,
  versiculos = [],
  secoes = [],
  tema = null,
  extras = {},
}) {
  const norm = normalizarVersiculoPrefs(prefs)
  if (!norm) return null

  const filtrados = (Array.isArray(versiculos) ? versiculos : []).filter(
    (v) => norm.momentos_ativos[v.momento] === true,
  )
  const versiculosAplicados = aplicarSecoesPadraoVersiculos(
    filtrados,
    secoes,
    norm.momentos_ativos,
  )

  return {
    versao_biblica: norm.versao_biblica,
    tema_identificado: tema,
    versiculos: versiculosAplicados,
    quantidade_versiculos: norm.quantidade_versiculos,
    momentos_ativos: norm.momentos_ativos,
    ...extras,
  }
}

/**
 * Registro versiculos_playlist → mapa de toggles (com fallback legado).
 * @param {{ momentos_ativos?: unknown, versiculos?: unknown, quantidade_versiculos?: number, versiculo_prefs?: unknown } | null} record
 */
export function momentosAtivosFromRecord(record) {
  if (!record) return { verso: false, refrao: false, ponte: false }

  const prefsMomentos = normalizarVersiculoPrefs(record.versiculo_prefs)
  if (prefsMomentos && quantidadeFromMomentosAtivos(prefsMomentos.momentos_ativos) > 0) {
    return prefsMomentos.momentos_ativos
  }

  const parsed = parseMomentosAtivos(record.momentos_ativos)
  if (quantidadeFromMomentosAtivos(parsed) > 0) return parsed

  const vers = Array.isArray(record.versiculos) ? record.versiculos : []
  const inferred = { verso: false, refrao: false, ponte: false }
  for (const v of vers) {
    if (v?.momento && Object.hasOwn(inferred, v.momento)) {
      inferred[v.momento] = true
    }
  }
  if (quantidadeFromMomentosAtivos(inferred) > 0) return inferred

  const qty = normalizarQuantidadeVersiculos(record.quantidade_versiculos)
  MOMENTOS_VERSICULO.forEach((m, index) => {
    inferred[m.id] = index < qty
  })
  return inferred
}

export function escolherVersiculoParaSecao({
  versiculos,
  quantidadeVersiculos = 1,
  momentosAtivos = MOMENTOS_ATIVOS_PADRAO,
  secao,
}) {
  if (!secao) return null

  const ativos = versiculosAtivosPorQuantidade(
    versiculos,
    quantidadeVersiculos,
    momentosAtivos,
  )
  if (ativos.length === 0) return null

  if (secao.id) {
    const porSecaoId = ativos.find((v) => v.secao_id && String(v.secao_id) === String(secao.id))
    if (porSecaoId) return porSecaoId
  }

  const momento = SECAO_PARA_MOMENTO_VERSICULO[secao.slug] || 'verso'
  return ativos.find((v) => v.momento === momento) || null
}
