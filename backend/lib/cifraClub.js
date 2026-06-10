import * as cheerio from 'cheerio'
import {
  extractChordsFromLine,
  parseChordLyricLine,
  rebuildChordLineFromChords,
} from '@crash-cifras/shared/chord-schema'
import { TODOS_TONS } from '@crash-cifras/shared/constants'
import { normalizarBpm } from './detectBpm.js'

const CHORD_RE =
  /[A-G](?:#|b)?(?:maj|min|m|M|dim|aug|sus|add|°|º|\+)?[0-9]*(?:\/[A-G](?:#|b)?)?/g

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/json',
  'Accept-Language': 'pt-BR,pt;q=0.9',
}

const LOG_PREFIX = '[cifraClub]'

/** Similaridade mínima entre título esperado e o da página CC (0–100). */
export const MIN_TITULO_SIMILARITY_CC = 60

/** Bemóis do Cifra Club → tons com sustenido usados no app */
const BEMOL_PARA_SUSTENIDO = {
  Cb: 'B',
  Db: 'C#',
  Eb: 'D#',
  Fb: 'E',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
  Cbm: 'Bm',
  Dbm: 'C#m',
  Ebm: 'D#m',
  Fbm: 'Em',
  Gbm: 'F#m',
  Abm: 'G#m',
  Bbm: 'A#m',
}

function logDebug(...args) {
  console.log(LOG_PREFIX, ...args)
}

/** Logs temporários de diagnóstico (Railway) — remover após identificar falha de busca. */
function logDiag(...args) {
  console.log(`${LOG_PREFIX}[diag]`, ...args)
}

function htmlPareceHomepageGenerica(html) {
  return (
    /Cifra Club - Seu site de cifras/i.test(html || '') &&
    !/cifra de/i.test(html || '')
  )
}

const PALAVRAS_IGNORAR_BUSCA = [
  'ao vivo',
  'aovivo',
  'live',
  'official',
  'oficial',
  'video',
  'vídeo',
  'videoclipe',
  'clipe',
  'clip',
  'hd',
  '4k',
  'lyric',
  'lyrics',
  'letra',
  'audio',
  'ft',
  'feat',
  'featuring',
  'part',
  'parte',
  'version',
  'versao',
  'versão',
  'simplificada',
  'cover',
  'remix',
  'acoustic',
  'acustico',
  'acústico',
]

const CC_BASE = 'https://www.cifraclub.com.br'

/** Remove acentos, parênteses, palavras de vídeo/feat e caracteres especiais. */
function sanitizarTextoBusca(text) {
  let t = String(text || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()

  t = t.replace(/\([^)]*\)/g, ' ')
  t = t.replace(/\[[^\]]*\]/g, ' ')
  t = t.replace(/\{[^}]*\}/g, ' ')
  t = t.split('|')[0]

  for (const palavra of PALAVRAS_IGNORAR_BUSCA) {
    t = t.replace(new RegExp(`\\b${palavra.replace(/\s+/g, '\\s+')}\\b`, 'gi'), ' ')
  }

  return t
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugifyBusca(text) {
  const clean = sanitizarTextoBusca(text)
  if (!clean) return ''
  return clean.replace(/\s+/g, '-').replace(/^-+|-+$/g, '')
}

/** @deprecated Use slugifyBusca — mantido para chamadas internas legadas */
function slugify(text) {
  return slugifyBusca(text)
}

function variantesSlugArtista(artista) {
  const base = slugifyBusca(artista)
  if (!base) return []

  const variants = new Set([base])
  if (base.endsWith('-music')) variants.add(base.replace(/-music$/, ''))
  if (base.endsWith('-musica')) variants.add(base.replace(/-musica$/, ''))
  if (base.includes('-music-')) variants.add(base.replace(/-music-/g, '-'))

  for (const suf of ['band', 'oficial', 'channel', 'canal', 'tv']) {
    if (base.endsWith(`-${suf}`)) variants.add(base.slice(0, -(suf.length + 1)))
  }

  return [...variants].filter(Boolean)
}

function pathParaLog(url) {
  return String(url || '').replace(CC_BASE, '') || '/'
}

function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i += 1) dp[i][0] = i
  for (let j = 0; j <= n; j += 1) dp[0][j] = j
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

/**
 * Similaridade 0–100 entre dois textos (título/artista normalizados).
 */
export function similaridadeTexto(a, b) {
  const sa = sanitizarTextoBusca(a)
  const sb = sanitizarTextoBusca(b)
  if (!sa || !sb) return 0
  if (sa === sb) return 100

  if (sa.includes(sb) || sb.includes(sa)) {
    const shorter = Math.min(sa.length, sb.length)
    const longer = Math.max(sa.length, sb.length)
    return Math.round(70 + (shorter / longer) * 30)
  }

  const maxLen = Math.max(sa.length, sb.length)
  const charRatio = Math.round((1 - levenshtein(sa, sb) / maxLen) * 100)

  const wordsA = sa.split(' ').filter((w) => w.length > 1)
  const wordsB = sb.split(' ').filter((w) => w.length > 1)
  const setA = new Set(wordsA)
  const setB = new Set(wordsB)
  let inter = 0
  for (const w of setA) {
    if (setB.has(w)) inter += 1
  }
  const union = new Set([...wordsA, ...wordsB]).size
  const wordRatio = union ? Math.round((inter / union) * 100) : 0

  return Math.max(charRatio, wordRatio)
}

function extrairTituloArtistaDaUrl(url) {
  const parts = String(url || '')
    .replace(CC_BASE, '')
    .split('/')
    .filter(Boolean)
  if (parts.length < 2) return { titulo: '', artista: '' }
  const slugParaTexto = (s) =>
    sanitizarTextoBusca(String(s || '').replace(/-/g, ' '))
  return {
    artista: slugParaTexto(parts[0]),
    titulo: slugParaTexto(parts[1]),
  }
}

function extrairTituloDaPaginaCc(html) {
  const titleTag = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || ''
  const matchCifra =
    titleTag.match(/cifra\s+de\s+(.+?)\s*[-–|]/i) ||
    titleTag.match(/^(.+?)\s*[-–|]\s*cifra\s+club/i)
  if (matchCifra?.[1]) {
    return sanitizarTextoBusca(matchCifra[1])
  }
  const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim()
  if (h1) return sanitizarTextoBusca(h1)
  return ''
}

function extrairArtistaDaPaginaCc(html) {
  const titleTag = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || ''
  const parts = titleTag.split(/\s*[-–|]\s*/)
  if (parts.length >= 2) {
    const candidato = parts[1]?.replace(/cifra club/i, '').trim()
    if (candidato) return sanitizarTextoBusca(candidato)
  }
  return ''
}

/**
 * Valida se a página CC corresponde à música importada.
 * @returns {{ aceito: boolean, similarity: number, tituloEncontrado: string, tituloEsperado: string, artistaEncontrado: string, artistaEsperado: string }}
 */
export function validarTituloCifraClub({
  tituloEsperado,
  artistaEsperado,
  html,
  url,
}) {
  const tituloEsp = sanitizarTextoBusca(tituloEsperado)
  const artistaEsp = sanitizarTextoBusca(artistaEsperado)

  const tituloPagina = extrairTituloDaPaginaCc(html)
  const artistaPagina = extrairArtistaDaPaginaCc(html)
  const daUrl = extrairTituloArtistaDaUrl(url)

  const tituloEncontrado = tituloPagina || daUrl.titulo || ''
  const artistaEncontrado = artistaPagina || daUrl.artista || ''

  const simTitulo = Math.max(
    similaridadeTexto(tituloEsp, tituloEncontrado),
    similaridadeTexto(tituloEsp, daUrl.titulo),
  )

  const simArtista = artistaEsp
    ? Math.max(
        similaridadeTexto(artistaEsp, artistaEncontrado),
        similaridadeTexto(artistaEsp, daUrl.artista),
      )
    : 100

  const similarity = Math.round(simTitulo * 0.75 + simArtista * 0.25)
  const aceito = similarity >= MIN_TITULO_SIMILARITY_CC

  logDebug(
    'título encontrado vs esperado:',
    tituloEncontrado || '(vazio)',
    'vs',
    tituloEsp || '(vazio)',
  )
  if (artistaEsp) {
    logDebug(
      'artista encontrado vs esperado:',
      artistaEncontrado || '(vazio)',
      'vs',
      artistaEsp,
    )
  }
  logDebug(
    'similarity:',
    `${similarity}%`,
    `(título ${simTitulo}%, artista ${simArtista}%)`,
    '→',
    aceito ? 'aceito' : 'rejeitado',
  )

  if (!aceito) {
    logDiag('validação rejeitou candidato', {
      url: pathParaLog(url),
      tituloEsperado: tituloEsp,
      tituloEncontrado,
      tituloDaUrl: daUrl.titulo,
      simTitulo,
      artistaEsperado: artistaEsp || '(vazio)',
      artistaEncontrado,
      artistaDaUrl: daUrl.artista,
      simArtista,
      similarityFinal: similarity,
      minimo: MIN_TITULO_SIMILARITY_CC,
      formula: 'similarity = titulo*0.75 + artista*0.25',
    })
  } else {
    logDiag('validação aceitou candidato', {
      url: pathParaLog(url),
      similarity,
      simTitulo,
      simArtista,
    })
  }

  return {
    aceito,
    similarity,
    simTitulo,
    simArtista,
    tituloEncontrado,
    tituloEsperado: tituloEsp,
    artistaEncontrado,
    artistaEsperado: artistaEsp,
  }
}

function paginaTemCifra(html) {
  if (!html || html.length < 3000) return false
  if (!/cifra_cnt|id=["']cifra_cnt["']/i.test(html)) return false
  if (/Cifra Club - Seu site de cifras/i.test(html) && !/cifra de/i.test(html)) {
    return false
  }
  return true
}

function pontuarLinkBusca(artistSlug, songSlug, tituloSlug, variantesArtista) {
  if (!songSlug || !tituloSlug) return -1
  let score = 0
  if (songSlug === tituloSlug) score += 20
  else if (songSlug.includes(tituloSlug) || tituloSlug.includes(songSlug)) score += 12

  for (const a of variantesArtista) {
    if (!a) continue
    if (artistSlug === a) score += 15
    else if (artistSlug.includes(a) || a.includes(artistSlug)) score += 8
  }
  return score
}

async function buscarUrlsViaBuscaHtml(query) {
  if (!query?.trim()) return []
  const url = `${CC_BASE}/busca/?q=${encodeURIComponent(query.trim())}`
  logDiag('busca HTML — request', { query: query.trim(), url })
  const html = await fetchHtml(url)
  if (!html) {
    logDiag('busca HTML — sem HTML', { query: query.trim(), url })
    return []
  }

  const paths = new Set()
  const re = /href="(\/[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*)\/?"/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const path = m[1]
    if (
      path.includes('/busca') ||
      path.includes('/blog') ||
      path.includes('/pro') ||
      path.endsWith('/simplificada.html')
    ) {
      continue
    }
    paths.add(path)
  }

  const urls = [...paths].map((p) => `${CC_BASE}${p}/`)
  logDiag('busca HTML — resultado', {
    query: query.trim(),
    url,
    htmlChars: html.length,
    pareceHomepage: htmlPareceHomepageGenerica(html),
    pathsEncontrados: paths.size,
    amostraPaths: [...paths].slice(0, 10),
    amostraUrls: urls.slice(0, 5).map((u) => pathParaLog(u)),
  })

  return urls
}

async function tentativasViaApi(titulo, artista) {
  const tituloSlug = slugifyBusca(titulo)
  const artistaVariants = variantesSlugArtista(artista)
  const queries = [
    `${titulo} ${artista}`.trim(),
    titulo,
    artista,
  ].filter((q, i, arr) => q && arr.indexOf(q) === i)

  const tentativas = []

  for (const query of queries) {
    const apiUrl = `${CC_BASE}/api/v1/songs/search?q=${encodeURIComponent(query)}&limit=12`
    logDiag('API busca — request', { query, apiUrl })
    const { data, status, ok } = await fetchJson(apiUrl)
    if (!ok || !Array.isArray(data) || data.length === 0) {
      logDiag('API busca — sem resultados', {
        query,
        apiUrl,
        httpStatus: status,
        ok,
        isArray: Array.isArray(data),
        count: Array.isArray(data) ? data.length : 0,
      })
      continue
    }

    const ranked = data
      .map((song) => {
        const artistSlug =
          song.artist?.url || song.artist_url || slugifyBusca(song.artist?.name || song.artist)
        const songSlug = song.url || song.song_url || slugifyBusca(song.name || song.song)
        if (!artistSlug || !songSlug) return null
        const score = pontuarLinkBusca(artistSlug, songSlug, tituloSlug, artistaVariants)
        return {
          url: `${CC_BASE}/${artistSlug}/${songSlug}/`,
          score,
          metadados: metadadosDaBuscaApi(song),
          origem: 'api',
          nomeApi: song.name || song.song || '',
          artistaApi: song.artist?.name || song.artist || '',
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)

    logDiag('API busca — resultados', {
      query,
      httpStatus: status,
      count: data.length,
      ranked: ranked.slice(0, 8).map((item) => ({
        url: pathParaLog(item.url),
        score: item.score,
        nome: item.nomeApi,
        artista: item.artistaApi,
        aceitoScore: item.score >= 0,
      })),
    })

    for (const item of ranked) {
      if (item.score < 0) continue
      tentativas.push(item)
    }
  }

  return tentativas
}

async function montarTentativasBusca(titulo, artista) {
  const tituloSlug = slugifyBusca(titulo)
  const artistaVariants = variantesSlugArtista(artista)
  const vistos = new Set()
  const lista = []

  function add(url, origem, metadados = null, score = 0) {
    if (!url || vistos.has(url)) return
    vistos.add(url)
    lista.push({ url, origem, metadados, score })
  }

  const apiTentativas = await tentativasViaApi(titulo, artista)
  for (const t of apiTentativas) add(t.url, t.origem, t.metadados, t.score)

  for (const artistSlug of artistaVariants) {
    if (artistSlug && tituloSlug) {
      add(`${CC_BASE}/${artistSlug}/${tituloSlug}/`, 'slug-artista-titulo', null, 10)
    }
  }

  if (tituloSlug && artistaVariants[0]) {
    add(
      `${CC_BASE}/${tituloSlug}/${artistaVariants[0]}/`,
      'slug-invertido',
      null,
      3,
    )
  }

  const buscaCompleta = await buscarUrlsViaBuscaHtml(`${titulo} ${artista}`.trim())
  for (const url of buscaCompleta) {
    const parts = url.replace(CC_BASE, '').split('/').filter(Boolean)
    if (parts.length < 2) continue
    const [artistSlug, songSlug] = parts
    const score = pontuarLinkBusca(artistSlug, songSlug, tituloSlug, artistaVariants)
    add(url, 'busca-html', null, score)
  }

  if (tituloSlug) {
    const buscaTitulo = await buscarUrlsViaBuscaHtml(titulo)
    for (const url of buscaTitulo) {
      const parts = url.replace(CC_BASE, '').split('/').filter(Boolean)
      if (parts.length < 2) continue
      const [artistSlug, songSlug] = parts
      const score = pontuarLinkBusca(artistSlug, songSlug, tituloSlug, artistaVariants)
      add(url, 'busca-html-titulo', null, score)
    }
  }

  lista.sort((a, b) => b.score - a.score)

  logDiag('tentativas montadas (ordenadas por score)', {
    titulo,
    artista,
    tituloSlug,
    artistaSlugs: artistaVariants,
    urlDireta: artistaVariants[0] && tituloSlug
      ? `${CC_BASE}/${artistaVariants[0]}/${tituloSlug}/`
      : null,
    total: lista.length,
    top15: lista.slice(0, 15).map((t) => ({
      url: pathParaLog(t.url),
      origem: t.origem,
      score: t.score,
    })),
  })

  return lista
}

function decodeHtmlEntities(text) {
  return String(text)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/<br\s*\/?>/gi, '\n')
}

function normalizarTomCifraClub(tom) {
  if (!tom) return null
  const raw = String(tom).trim().replace(/\s+/g, '')
  if (TODOS_TONS.includes(raw)) return raw
  const enharmonic = BEMOL_PARA_SUSTENIDO[raw]
  if (enharmonic && TODOS_TONS.includes(enharmonic)) return enharmonic
  const menor = /^([A-G](?:#|b)?)m$/i.exec(raw)
  if (menor) {
    const fmt = `${menor[1].charAt(0).toUpperCase()}${menor[1].slice(1)}m`
    if (TODOS_TONS.includes(fmt)) return fmt
    const fromFlat = BEMOL_PARA_SUSTENIDO[fmt]
    if (fromFlat && TODOS_TONS.includes(fromFlat)) return fromFlat
  }
  const maior = /^([A-G](?:#|b)?)$/i.exec(raw)
  if (maior) {
    const fmt = `${maior[1].charAt(0).toUpperCase()}${maior[1].slice(1)}`
    if (TODOS_TONS.includes(fmt)) return fmt
    const fromFlat = BEMOL_PARA_SUSTENIDO[fmt]
    if (fromFlat && TODOS_TONS.includes(fromFlat)) return fromFlat
  }
  return null
}

function mapNomeSecaoParaSlug(nome) {
  const n = String(nome || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
  if (n.includes('intro')) return 'intro'
  if (n.includes('pre') && n.includes('refra')) return 'pre_refrao'
  if (n.includes('refra') || n.includes('chorus')) return 'refrao'
  if (n.includes('ponte') || n.includes('bridge')) return 'ponte'
  if (n.includes('outro') || n.includes('final')) return 'outro'
  if (n.includes('verso') || n.includes('verse') || n.includes('parte')) return 'verso'
  return 'verso'
}

const ACORDE_ENTRE_COLCHETES_RE =
  /\[(?:[A-G][#b]?(?:m|maj|min|M|dim|aug|sus|add|°|º|\+)?[0-9]*(?:\/[A-G][#b]?)?)\]/gi

/** Linha só com [C][G][Am7]… — graus do CC; não é letra. */
function isLinhaGrausColchetes(line) {
  const t = line.trim()
  if (!t || !t.includes('[')) return false
  const semColchetes = t.replace(ACORDE_ENTRE_COLCHETES_RE, '').replace(/\s+/g, '')
  return semColchetes.length === 0 && /\[[A-G]/i.test(t)
}

function limparColchetesDaLetra(line) {
  return String(line || '')
    .replace(ACORDE_ENTRE_COLCHETES_RE, '')
    .replace(/\[\s*\]/g, '')
    .replace(/\[/g, '')
    .replace(/\]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trimEnd()
}

function isChordOnlyLine(line) {
  const trimmed = line.trim()
  if (!trimmed) return false
  const withoutChords = trimmed.replace(CHORD_RE, '').replace(/[\s|]/g, '')
  const chordCount = (trimmed.match(CHORD_RE) || []).length
  return chordCount > 0 && withoutChords.length <= 2
}

function parseBlocoLinhas(texto) {
  const linhas = texto.split('\n')
  const pares = []
  let i = 0

  while (i < linhas.length) {
    const line = linhas[i]
    if (!line.trim()) {
      i += 1
      continue
    }

    if (isLinhaGrausColchetes(line)) {
      i += 1
      continue
    }

    if (isChordOnlyLine(line)) {
      const plain = line.replace(/\s+$/, '')
      const chords = extractChordsFromLine(plain)
      const chordLine =
        chords.length > 0 ? rebuildChordLineFromChords(chords) : plain
      let lyricLine = ''
      if (i + 1 < linhas.length) {
        const next = linhas[i + 1]
        if (isLinhaGrausColchetes(next)) {
          i += 2
          pares.push({ chordLine, lyricLine: '', chords })
          continue
        }
        if (!isChordOnlyLine(next) && next.trim()) {
          lyricLine = limparColchetesDaLetra(next)
          i += 2
        } else {
          i += 1
        }
      } else {
        i += 1
      }
      pares.push({ chordLine, lyricLine, chords })
      continue
    }

    pares.push({ chordLine: '', lyricLine: limparColchetesDaLetra(line), chords: [] })
    i += 1
  }

  return pares
}

/** `<b>`, `<strong>` ou `<span class="acorde">` do Cifra Club. */
function isAcordeHtmlElement($, el) {
  if (!el || el.type !== 'tag') return false
  const name = el.name?.toLowerCase()
  if (name === 'b' || name === 'strong') return true
  const cls = $(el).attr('class') || ''
  return /\bacorde\b/i.test(cls)
}

/**
 * Percorre nós HTML preservando coluna `pos` de cada acorde.
 * ALINHAMENTO CIFRA CLUB - NÃO ALTERAR
 * Acordes em <b> / .acorde não entram na letra; espaços iniciais são mantidos.
 */
function walkHtmlLinha($, nodes) {
  let chordLineText = ''
  let lyricLine = ''
  const chords = []

  function visit(node) {
    if (!node) return
    if (node.type === 'text') {
      const chunk = String(node.data || '').replace(/\u00a0/g, ' ')
      chordLineText += chunk
      lyricLine += chunk
      return
    }
    if (node.type !== 'tag') return

    const name = node.name?.toLowerCase()
    if (name === 'br') return

    const $el = $(node)
    if (isAcordeHtmlElement($, node)) {
      const raw = $el.text().trim()
      const match = raw.match(new RegExp(`^${CHORD_RE.source}$`))
      if (match) {
        const chord = match[0]
        chords.push({ pos: chordLineText.length, chord })
        chordLineText += chord
      }
      return
    }

    $el.contents().each((_, child) => visit(child))
  }

  for (const node of nodes) visit(node)

  return {
    chordLineText: chordLineText.replace(/\s+$/, ''),
    lyricLine: limparColchetesDaLetra(lyricLine.replace(/\s+$/, '')),
    chords,
  }
}

/** Quebra HTML do bloco .cifra_cnt em linhas lógicas (preserva tags). */
function htmlParaLinhasEstruturadas(htmlChunk) {
  const $ = cheerio.load(`<div id="cc-parse-root">${htmlChunk}</div>`, {
    decodeEntities: false,
  })
  const root = $('#cc-parse-root')
  const linhas = []
  let buffer = []

  const CONTAINER_TAGS = new Set(['pre', 'div', 'span', 'p', 'article', 'section'])

  function flush() {
    if (buffer.length === 0) return
    linhas.push(buffer)
    buffer = []
  }

  function walk(node) {
    if (!node) return
    if (node.type === 'text') {
      const parts = String(node.data || '').replace(/\u00a0/g, ' ').split('\n')
      for (let i = 0; i < parts.length; i += 1) {
        if (i > 0) flush()
        if (parts[i].length > 0) {
          buffer.push({ type: 'text', data: parts[i] })
        }
      }
      return
    }
    if (node.type !== 'tag') return

    const name = node.name?.toLowerCase()
    if (name === 'br') {
      flush()
      return
    }
    if (name === 'script' || name === 'style') return

    if (CONTAINER_TAGS.has(name)) {
      $(node).contents().each((_, child) => walk(child))
      return
    }

    buffer.push(node)
  }

  root.contents().each((_, child) => walk(child))
  flush()

  return { $, linhas }
}

function htmlLinhaParaPar(linhaNodes, $) {
  const { chordLineText, lyricLine, chords: fromWalk } = walkHtmlLinha($, linhaNodes)
  const plain = chordLineText.replace(/\s+$/, '')

  if (isChordOnlyLine(plain)) {
    const chords = fromWalk.length ? fromWalk : extractChordsFromLine(plain)
    return {
      chordLine: plain,
      lyricLine: '',
      chords,
    }
  }

  if (fromWalk.length > 0) {
    return {
      chordLine: plain,
      lyricLine,
      chords: fromWalk,
    }
  }

  return {
    chordLine: '',
    lyricLine: limparColchetesDaLetra(plain || lyricLine),
    chords: [],
  }
}

function parearLinhasHtml(pares) {
  const blocos = []
  let i = 0

  while (i < pares.length) {
    const atual = pares[i]
    const plain = atual.chordLine.replace(/\s+$/, '')

    if (!plain && !atual.lyricLine.trim()) {
      i += 1
      continue
    }

    if (isLinhaGrausColchetes(plain || atual.lyricLine)) {
      i += 1
      continue
    }

    if (isChordOnlyLine(plain)) {
      const chordLine = plain
      const chords = atual.chords.length ? atual.chords : extractChordsFromLine(chordLine)
      let lyricLine = ''
      if (i + 1 < pares.length) {
        const next = pares[i + 1]
        const nextPlain = next.chordLine.replace(/\s+$/, '') || next.lyricLine.trim()
        if (isLinhaGrausColchetes(nextPlain)) {
          i += 2
          blocos.push({ chordLine, lyricLine: '', chords })
          continue
        }
        if (!isChordOnlyLine(nextPlain) && nextPlain) {
          lyricLine = next.lyricLine || limparColchetesDaLetra(nextPlain)
          i += 2
        } else {
          i += 1
        }
      } else {
        i += 1
      }
      blocos.push({ chordLine, lyricLine, chords })
      continue
    }

    blocos.push({
      chordLine: '',
      lyricLine: atual.lyricLine || limparColchetesDaLetra(plain),
      chords: [],
    })
    i += 1
  }

  return blocos
}

function blocosParaSecaoLinhas(blocos) {
  const lines = blocos
    .filter((b) => b.chordLine.trim() || b.lyricLine.trim())
    .map((b) => parseChordLyricLine(b.chordLine, b.lyricLine, b.chords))

  return lines.length ? { lines } : { lines: [] }
}

/** Texto bruto da linha HTML (preserva colchetes de marcadores de seção). */
function textoBrutoLinhaNodes($, nodes) {
  let text = ''

  function visit(node) {
    if (!node) return
    if (node.type === 'text') {
      text += String(node.data || '').replace(/\u00a0/g, ' ')
      return
    }
    if (node.type !== 'tag') return
    if (node.name?.toLowerCase() === 'br') return

    const $el = $(node)
    if (isAcordeHtmlElement($, node)) {
      text += $el.text()
      return
    }
    $el.contents().each((_, child) => visit(child))
  }

  for (const node of nodes) visit(node)
  return text.replace(/\s+$/, '')
}

const MARCADOR_SECAO_RE = /^\s*\[([^\]]+)\]\s*(.*)$/

function extrairMarcadorSecao(textoBruto, par) {
  const raw = String(textoBruto || '').trim()
  const m = raw.match(MARCADOR_SECAO_RE)
  if (!m) return null

  const nome = m[1].trim()
  const rest = m[2].replace(/\s+$/, '')
  const markerLen = raw.length - rest.length

  const chords = (par.chords || [])
    .map(({ pos, chord }) => ({ pos: pos - markerLen, chord }))
    .filter(({ pos }) => pos >= 0)

  const temConteudo =
    rest.length > 0 ||
    (par.chordLine || '').trim().length > 0 ||
    (par.chords || []).length > 0

  return {
    nome,
    rest,
    parAjustado: temConteudo
      ? {
          chordLine: rest || (par.chordLine || '').trim(),
          lyricLine: '',
          chords: chords.length ? chords : extractChordsFromLine(rest || par.chordLine || ''),
        }
      : null,
  }
}

/**
 * Parse HTML bruto do .cifra_cnt preservando posição `pos` de cada acorde.
 */
function parseHtmlCifraCnt(htmlChunk) {
  logDebug('HTML bruto antes do parse (800 chars):', String(htmlChunk).slice(0, 800))

  const { $, linhas } = htmlParaLinhasEstruturadas(htmlChunk)
  const pares = linhas.map((nodes) => htmlLinhaParaPar(nodes, $))

  if (pares.length > 0) {
    logDebug('HTML parse — amostra linha 0:', {
      chordLine: pares[0].chordLine?.slice(0, 80),
      lyricLine: pares[0].lyricLine?.slice(0, 80),
      chords: pares[0].chords,
    })
  }

  const partes = []
  let buffer = []

  for (let idx = 0; idx < pares.length; idx += 1) {
    const par = pares[idx]
    const bruto = textoBrutoLinhaNodes($, linhas[idx])
    const marcador = extrairMarcadorSecao(bruto, par)
    if (marcador) {
      if (/^tab\b/i.test(marcador.nome)) {
        continue
      }
      if (buffer.length) partes.push({ type: 'blocos', blocos: buffer })
      partes.push({ type: 'secao', nome: marcador.nome })
      buffer = []
      if (marcador.parAjustado) buffer.push(marcador.parAjustado)
      continue
    }

    buffer.push(par)
  }
  if (buffer.length) partes.push({ type: 'blocos', blocos: buffer })

  const secoes = []
  let atual = { nome: 'Música', slug: 'verso', blocos: [] }

  for (const parte of partes) {
    if (parte.type === 'secao') {
      if (atual.blocos?.length) {
        secoes.push({
          nome: atual.nome,
          slug: atual.slug,
          linhas: blocosParaSecaoLinhas(parearLinhasHtml(atual.blocos)),
        })
      }
      atual = {
        nome: parte.nome,
        slug: mapNomeSecaoParaSlug(parte.nome),
        blocos: [],
      }
      continue
    }
    if (!atual.blocos) atual.blocos = []
    atual.blocos.push(...parte.blocos)
  }

  if (atual.blocos?.length) {
    secoes.push({
      nome: atual.nome,
      slug: atual.slug,
      linhas: blocosParaSecaoLinhas(parearLinhasHtml(atual.blocos)),
    })
  }

  return secoes
}

function extrairBpmDoTexto(texto) {
  if (!texto) return null
  const patterns = [
    /"bpm"\s*:\s*(\d{2,3})/i,
    /"tempo"\s*:\s*(\d{2,3})/i,
    /(?:^|\s)(?:BPM|bpm|Andamento)\s*[:\-]?\s*(\d{2,3})\b/i,
    /\b(\d{2,3})\s*bpm\b/i,
  ]
  for (const re of patterns) {
    const m = texto.match(re)
    if (m) {
      const bpm = normalizarBpm(m[1])
      if (bpm) return bpm
    }
  }
  return null
}

/** Tom oficial exibido no topo da cifra (#cifra_tom). */
function extrairTomDoBlocoCifraTom(html) {
  if (!html) return null
  const bloco = html.match(/<span[^>]*id=["']cifra_tom["'][^>]*>([\s\S]*?)<\/span>/i)
  if (!bloco) return null
  const anchor = bloco[1].match(
    /<a[^>]*>([A-G](?:#|b)?m?)<\/a>/i,
  )
  if (anchor) {
    const tom = normalizarTomCifraClub(anchor[1])
    if (tom) return tom
  }
  return null
}

function extrairTomDoTexto(texto) {
  if (!texto) return null
  const patterns = [
    /id=["']cifra_tom["'][\s\S]*?<a[^>]*>([A-G](?:#|b)?m?)<\/a>/i,
    /"tom(?:Original)?"\s*:\s*"([A-G](?:#|b)?m?)"/i,
    /"tone"\s*:\s*"([A-G](?:#|b)?m?)"/i,
  ]
  for (const re of patterns) {
    const m = texto.match(re)
    if (m) {
      const tom = normalizarTomCifraClub(m[1])
      if (tom) return tom
    }
  }
  return null
}

/** Metadados da página HTML/JSON embutido (BPM e tom oficiais). */
function extrairMetadadosPagina(html) {
  if (!html) return { tom: null, bpm: null }

  const bpm =
    extrairBpmDoTexto(html) ??
    normalizarBpm(html.match(/"speed"\s*:\s*(\d{2,3})/i)?.[1])

  const tom =
    extrairTomDoBlocoCifraTom(html) ??
    extrairTomDoTexto(html)

  return { tom, bpm }
}

/**
 * Extrai somente o HTML dentro de #cifra_cnt / .cifra_cnt (sem anúncios fora do bloco).
 */
function extrairHtmlCifraCnt(pageHtml) {
  const $ = cheerio.load(pageHtml, { decodeEntities: false })
  const root = $('#cifra_cnt').length ? $('#cifra_cnt').first() : $('.cifra_cnt').first()
  if (!root.length) {
    logDebug('cheerio: elemento .cifra_cnt não encontrado na página')
    return null
  }

  const clone = root.clone()
  clone.find('script, style').remove()
  clone
    .find(
      '#js-marketing-card-wrapper, [id^="js-marketing"], .bandsintownButton, .pub, [class*="pub-"]',
    )
    .remove()
  clone.find('[class*="offer"], [class*="Offer"], .offerCard, a.offerCard').remove()
  clone.find('span.tablatura, .tablatura, span.cnt, .cnt').remove()
  clone.find('#cifra_tom, #cifra_afi, #cifra_capo').remove()
  clone.find('input, iframe, noscript').remove()

  let html = clone.html()?.trim() || ''

  // Tablatura costuma ficar em <span class="tablatura">; às vezes sobra E|... solto antes de </pre>
  const tabSpan = html.search(/<span[^>]*class="[^"]*tablatura/i)
  if (tabSpan >= 0) html = html.slice(0, tabSpan)
  html = html.replace(/\bE\s*\|[^\n<]*[\s\S]*?(?=<\/pre\s*>|$)/gi, '')
  html = html.replace(/<\/pre\s*>[\s\S]*$/i, '')

  logDebug('cheerio .cifra_cnt:', { htmlLength: html.length })
  if (html.length > 0) {
    logDebug('cheerio .cifra_cnt fim (últimos 600 chars):', html.slice(-600))
  }
  return html || null
}

function extrairUltimaSecaoBruta(textoBruto) {
  const partes = String(textoBruto).split(/(\[[^\]\n]+\])/g).filter((p) => p !== '')
  let ultimaSecao = { nome: 'Música', texto: '' }
  let atual = { nome: 'Música', texto: '' }

  for (const parte of partes) {
    const marcador = parte.match(/^\[([^\]]+)\]$/)
    if (marcador) {
      const nome = marcador[1].trim()
      if (/^tab\b/i.test(nome)) continue
      if (atual.texto.trim()) ultimaSecao = { nome: atual.nome, texto: atual.texto }
      atual = { nome, texto: '' }
      continue
    }
    atual.texto += parte
  }
  if (atual.texto.trim()) ultimaSecao = { nome: atual.nome, texto: atual.texto }
  return ultimaSecao
}

const HTML_FRAGMENTO_LINHA_RE =
  /(?:<|>|class\s*=|target\s*=|data-[a-z]|href\s*=|src\s*=|offerCard|handlebars|<%|\{\{|\/script|type\s*=)/i

const TAB_CORDA_LINHA_RE = /^[EADGBe]\s*\|/i

const PROMO_CC_LINHA_RE =
  /offerCard|login-modal|blackFriday|js-marketing|Cifra Club Pro|benef[ií]cios do Cifra|content-wrapper|logo-cifra/i

/** Linha só com traços, pipes e números típicos de tablatura. */
function isLinhaTablatura(line) {
  const t = line.trim()
  if (!t) return false
  if (TAB_CORDA_LINHA_RE.test(t)) return true
  if (!t.includes('|')) return false
  if (/[a-záàâãéêíóôõúç]{3,}/i.test(t)) return false
  return /^[\s|EeADGB\-~xXpP0-9bhr\/\\(\).,]+$/.test(t)
}

function isLinhaLixoCifra(line) {
  const t = line.trim()
  if (!t) return false
  if (HTML_FRAGMENTO_LINHA_RE.test(t)) return true
  if (PROMO_CC_LINHA_RE.test(t)) return true
  if (isLinhaTablatura(t)) return true
  if (/^Parte\s+\d+\s+de\s+\d+\s*$/i.test(t)) return true
  if (/^E\s*\|\s*-*\s*<\/pre>/i.test(t)) return true
  return false
}

/** Remove blocos [Tab ...] e linhas inválidas; colapsa linhas vazias. */
function limparTextoCifra(texto) {
  let t = String(texto || '')
    .replace(/\r/g, '')
    .replace(/\n?\[Tab[^\]]*\][\s\S]*?(?=\n\[(?!Tab)|$)/gi, '')

  const linhas = []
  for (const line of t.split('\n')) {
    if (isLinhaLixoCifra(line)) continue
    linhas.push(line.replace(/\s+$/, ''))
  }

  const semVaziasExtras = []
  let vaziasSeguidas = 0
  for (const line of linhas) {
    if (!line.trim()) {
      vaziasSeguidas += 1
      if (vaziasSeguidas <= 1) semVaziasExtras.push('')
      continue
    }
    vaziasSeguidas = 0
    semVaziasExtras.push(line)
  }

  return semVaziasExtras.join('\n').trim()
}

// ALINHAMENTO CIFRA CLUB - NÃO ALTERAR
/** Mantém o texto interno da tag (espaços entre acordes ficam fora da tag no HTML). */
function htmlTagAcordeParaTexto(_match, inner) {
  return String(inner ?? '')
}

function htmlBlocoCifraParaTexto(htmlChunk) {
  let t = String(htmlChunk || '')
  t = t.replace(/<script[\s\S]*?<\/script>/gi, '')
  t = t.replace(/<style[\s\S]*?<\/style>/gi, '')
  t = t.replace(/<div[^>]*id="js-marketing[^"]*"[\s\S]*?<\/div>/gi, '')
  t = t.replace(/<div[^>]*bandsintown[^>]*>[\s\S]*?<\/div>/gi, '')
  t = t.replace(/<div[^>]*class="[^"]*offer[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
  t = t.replace(/<a[^>]*class="[^"]*offerCard[^"]*"[\s\S]*?<\/a>/gi, '')
  t = t.replace(/<span[^>]*id="cifra_(?:tom|afi|capo)"[^>]*>[\s\S]*?<\/span>/gi, '')
  t = t.replace(/<input[^>]*>/gi, '')

  for (let i = 0; i < 8; i += 1) {
    const antes = t
    t = t.replace(/<span[^>]*class="[^"]*tablatura[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
    t = t.replace(/<span[^>]*class="[^"]*cnt[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
    if (t === antes) break
  }

  t = decodeHtmlEntities(t)
  t = t.replace(/\u00a0/g, ' ')
  t = t.replace(/<br\s*\/?>/gi, '\n')

  // Não usar .trim() no acorde — apaga espaços que alinham colunas no Cifra Club
  t = t.replace(/<b[^>]*>([^<]*)<\/b>/gi, htmlTagAcordeParaTexto)
  t = t.replace(/<strong[^>]*>([^<]*)<\/strong>/gi, htmlTagAcordeParaTexto)
  t = t.replace(
    /<span[^>]*class="[^"]*acorde[^"]*"[^>]*>([^<]*)<\/span>/gi,
    htmlTagAcordeParaTexto,
  )

  t = t.replace(/<[^>]+>/g, '')
  return limparTextoCifra(t)
}

function metadadosDaBuscaApi(song) {
  if (!song || typeof song !== 'object') return { tom: null, bpm: null }
  const bpm = normalizarBpm(song.bpm ?? song.tempo ?? song.speed)
  const tom = normalizarTomCifraClub(
    song.tone ?? song.key ?? song.tom ?? song.tom_original ?? song.tomOriginal,
  )
  return { tom, bpm }
}

function mergeMetadados(...fontes) {
  let tom = null
  let bpm = null
  for (const f of fontes) {
    if (!f) continue
    if (!tom && f.tom) tom = f.tom
    if (!bpm && f.bpm) bpm = f.bpm
  }
  return { tom, bpm }
}

function parseCifraTexto(raw) {
  const textoBruto = decodeHtmlEntities(raw).replace(/\r/g, '')
  const ultimaSecao = extrairUltimaSecaoBruta(textoBruto)
  console.log('[cifraClub] ultima secao bruta:', ultimaSecao)

  const texto = limparTextoCifra(textoBruto)
  // Tom oficial só vem de #cifra_tom na página (extrairMetadadosPagina), não dos acordes na letra
  const tom = null
  const bpm = extrairBpmDoTexto(texto)

  const partes = texto.split(/(\[[^\]\n]+\])/g).filter((p) => p !== '')
  const secoes = []

  let atual = { nome: 'Música', slug: 'verso', texto: '' }

  function flush() {
    const blocos = parseBlocoLinhas(atual.texto)
    if (blocos.length === 0) return
    const linhas = blocosParaSecaoLinhas(blocos)
    const chordsText = blocos.map((b) => b.chordLine).join('\n')
    const lyricsText = blocos.map((b) => b.lyricLine).join('\n')
    secoes.push({
      nome: atual.nome,
      slug: atual.slug,
      linhas_cifras: chordsText.split('\n'),
      linhas_letra: lyricsText.split('\n'),
      linhas,
    })
  }

  for (const parte of partes) {
    const marcador = parte.match(/^\[([^\]]+)\]$/)
    if (marcador) {
      const nome = marcador[1].trim()
      if (/^tab\b/i.test(nome)) continue
      flush()
      atual = { nome, slug: mapNomeSecaoParaSlug(nome), texto: '' }
      continue
    }
    atual.texto += parte
  }
  flush()

  return { tom, bpm, secoes }
}

function extrairCifraDoHtml(html) {
  const metaPagina = extrairMetadadosPagina(html)

  const jsonMatch = html.match(/"content"\s*:\s*"((?:\\.|[^"\\])*)"/)
  if (jsonMatch) {
    try {
      const content = JSON.parse(`"${jsonMatch[1]}"`)
      if (content && content.length > 40) {
        const parsed = parseCifraTexto(content)
        const merged = mergeMetadados(metaPagina, parsed)
        return {
          ...parsed,
          tom: merged.tom ?? parsed.tom,
          bpm: merged.bpm ?? parsed.bpm,
        }
      }
    } catch {
      /* fallback HTML */
    }
  }

  const htmlCifra = extrairHtmlCifraCnt(html)
  if (htmlCifra) {
    logDebug('HTML bruto .cifra_cnt (amostra seção):', htmlCifra.slice(0, 1200))
    const secoesHtml = parseHtmlCifraCnt(htmlCifra)
    if (secoesHtml.length > 0) {
      const merged = mergeMetadados(metaPagina, { tom: null, bpm: extrairBpmDoTexto(htmlCifra) })
      return {
        tom: merged.tom,
        bpm: merged.bpm,
        secoes: secoesHtml,
      }
    }

    const texto = htmlBlocoCifraParaTexto(htmlCifra)
    if (texto.length > 40) {
      const parsed = parseCifraTexto(texto)
      const merged = mergeMetadados(metaPagina, parsed)
      return {
        ...parsed,
        tom: merged.tom ?? parsed.tom,
        bpm: merged.bpm ?? parsed.bpm,
      }
    }
    logDebug('cheerio: texto da cifra vazio após conversão')
  }

  const preMatch =
    html.match(/<pre[^>]*class="[^"]*cifra[^"]*"[^>]*>([\s\S]*?)<\/pre>/i) ||
    html.match(/<pre[^>]*id="cifra"[^>]*>([\s\S]*?)<\/pre>/i)

  if (!preMatch) return null

  const inner = htmlBlocoCifraParaTexto(preMatch[1])
  const parsed = parseCifraTexto(inner)
  const merged = mergeMetadados(metaPagina, parsed)
  return {
    ...parsed,
    tom: merged.tom ?? parsed.tom,
    bpm: merged.bpm ?? parsed.bpm,
  }
}

async function fetchJson(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS, signal: controller.signal })
    clearTimeout(timeout)
    const ct = res.headers.get('content-type') || ''
    if (!res.ok) {
      logDiag('fetchJson HTTP erro', { url, status: res.status, contentType: ct })
      return { data: null, status: res.status, ok: false }
    }
    if (!ct.includes('json')) {
      const peek = (await res.text()).slice(0, 120)
      logDiag('fetchJson resposta não-JSON', { url, status: res.status, contentType: ct, peek })
      return { data: null, status: res.status, ok: false }
    }
    const data = await res.json()
    logDiag('fetchJson OK', {
      url,
      status: res.status,
      isArray: Array.isArray(data),
      count: Array.isArray(data) ? data.length : null,
    })
    return { data, status: res.status, ok: true }
  } catch (err) {
    clearTimeout(timeout)
    logDiag('fetchJson exceção', { url, erro: err?.message || String(err) })
    return { data: null, status: 0, ok: false }
  }
}

async function fetchHtml(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS, signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) {
      logDiag('fetchHtml HTTP erro', { url, status: res.status })
      return null
    }
    const text = await res.text()
    logDiag('fetchHtml OK', {
      url,
      status: res.status,
      htmlChars: text.length,
      pareceHomepage: htmlPareceHomepageGenerica(text),
      temCifraCnt: /cifra_cnt|id=["']cifra_cnt["']/i.test(text),
      titleTag: text.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || null,
    })
    return text
  } catch (err) {
    clearTimeout(timeout)
    logDiag('fetchHtml exceção', { url, erro: err?.message || String(err) })
    return null
  }
}

/**
 * Resolve URL + HTML válido testando várias estratégias (slug, busca web, API).
 */
async function resolverDestinoCifraClub(titulo, artista) {
  const tituloLimpo = sanitizarTextoBusca(titulo)
  const artistaLimpo = sanitizarTextoBusca(artista)
  logDebug('busca normalizada:', {
    titulo: tituloLimpo,
    artista: artistaLimpo,
    tituloSlug: slugifyBusca(titulo),
    artistaSlugs: variantesSlugArtista(artista),
  })

  const tentativas = await montarTentativasBusca(titulo, artista)
  if (tentativas.length === 0) {
    logDebug('nenhuma tentativa de URL gerada')
    return null
  }

  let n = 0
  for (const tentativa of tentativas) {
    n += 1
    const path = pathParaLog(tentativa.url)
    const label =
      tentativa.origem === 'busca-html-titulo'
        ? `${path} (busca só pelo título)`
        : tentativa.origem === 'slug-invertido'
          ? `${path} (título/artista invertidos)`
          : path

    logDebug(`tentativa ${n}:`, label)

    const html = await fetchHtml(tentativa.url)
    if (!html) {
      logDebug('resultado: não encontrou (fetch falhou)')
      logDiag('tentativa descartada', {
        n,
        url: pathParaLog(tentativa.url),
        origem: tentativa.origem,
        score: tentativa.score,
        motivo: 'fetch falhou',
      })
      continue
    }

    if (!paginaTemCifra(html)) {
      logDebug('resultado: não encontrou (página sem cifra)')
      logDiag('tentativa descartada', {
        n,
        url: pathParaLog(tentativa.url),
        origem: tentativa.origem,
        score: tentativa.score,
        motivo: 'paginaTemCifra=false',
        htmlChars: html.length,
        pareceHomepage: htmlPareceHomepageGenerica(html),
      })
      continue
    }

    const parsed = extrairCifraDoHtml(html)
    if (!parsed?.secoes?.length) {
      logDebug('resultado: não encontrou (cifra não extraída)')
      logDiag('tentativa descartada', {
        n,
        url: pathParaLog(tentativa.url),
        origem: tentativa.origem,
        score: tentativa.score,
        motivo: 'extrairCifraDoHtml sem seções',
        htmlChars: html.length,
      })
      continue
    }

    const validacao = validarTituloCifraClub({
      tituloEsperado: titulo,
      artistaEsperado: artista,
      html,
      url: tentativa.url,
    })

    if (!validacao.aceito) {
      logDebug('resultado: rejeitado (título não confere com a importação)', {
        url: tentativa.url,
        similarity: validacao.similarity,
      })
      continue
    }

    logDebug('resultado: encontrou', {
      origem: tentativa.origem,
      secoes: parsed.secoes.length,
      url: tentativa.url,
      similarity: validacao.similarity,
    })

    return {
      url: tentativa.url,
      html,
      parsed,
      metadados: tentativa.metadados ?? { tom: null, bpm: null },
      origemUrl: tentativa.origem,
      validacaoTitulo: validacao,
    }
  }

  logDebug('resultado: não encontrou em nenhuma tentativa')
  logDiag('busca esgotada sem match', {
    titulo,
    artista,
    tentativasTestadas: n,
    tituloSlug: slugifyBusca(titulo),
    artistaSlugs: variantesSlugArtista(artista),
  })
  return null
}

/**
 * Busca cifra real no Cifra Club (título + artista).
 * Inclui BPM e tom oficiais quando disponíveis na página/API.
 * @returns {Promise<{ titulo?: string, artista?: string, tom: string|null, bpm: number|null, secoes: object[], fonte: 'cifraclub' }|null>}
 */
export async function buscarCifraNoCifraClub({ titulo, artista }) {
  if (!titulo?.trim()) return null

  logDebug('--- início busca ---', { titulo, artista })

  const tituloSlug = slugifyBusca(titulo)
  const artistaSlugs = variantesSlugArtista(artista)
  logDiag('entrada buscarCifraNoCifraClub', {
    titulo,
    artista,
    tituloSlug,
    artistaSlugs,
    urlDiretaProvavel:
      artistaSlugs[0] && tituloSlug
        ? `${CC_BASE}/${artistaSlugs[0]}/${tituloSlug}/`
        : null,
    estrategias: [
      '1) API /api/v1/songs/search (3 queries)',
      '2) URL direta /artista/musica (slug)',
      '3) URL invertida /musica/artista',
      '4) scraping /busca/?q= (HTML)',
    ],
  })

  const destino = await resolverDestinoCifraClub(titulo, artista)
  if (!destino?.parsed?.secoes?.length) {
    logDiag('buscarCifraNoCifraClub retornando null', { titulo, artista })
    return null
  }

  const { html, parsed, url, metadados } = destino

  logDebug('HTML recebido, tamanho:', html.length, 'chars')
  logDebug('URL da página:', url, '| origem:', destino.origemUrl ?? '?')

  const tituloNaPagina = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim()
  logDebug('título na página:', tituloNaPagina ?? '(não encontrado)')
  if (destino.validacaoTitulo) {
    logDebug('validação título:', destino.validacaoTitulo)
  }

  const metaPagina = extrairMetadadosPagina(html)
  logDebug('metadados página:', metaPagina)
  logDebug('metadados fonte:', metadados)

  const meta = {
    tom: metaPagina.tom ?? metadados?.tom ?? parsed.tom ?? null,
    bpm: metadados?.bpm ?? metaPagina.bpm ?? parsed.bpm ?? null,
  }

  logDebug('tom/BPM finais:', meta)
  logDebug('tom retornado pelo Cifra Club (para importação):', meta.tom)
  logDebug('--- fim busca (sucesso) ---', {
    url,
    tom: meta.tom,
    bpm: meta.bpm,
    secoes: parsed.secoes.length,
  })

  return {
    titulo,
    artista,
    tom: meta.tom,
    tom_original: meta.tom,
    bpm: meta.bpm,
    secoes: parsed.secoes,
    fonte: 'cifraclub',
    url,
  }
}
