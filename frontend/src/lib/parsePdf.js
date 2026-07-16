/**
 * Extrai texto de PDF usando coordenadas X/Y (pdfjs getTextContent).
 * Reconstrói linhas de acorde e letra para o mesmo pipeline do ODT/DOCX.
 */

import {
  isValidChordSymbol,
  rebuildChordLineFromChords,
} from '@crash-cifras/shared/chord-schema'

const CHORD_RE =
  /[A-G](?:#|b)?(?:maj|min|m|M|dim|aug|sus|add|°|º|\+)?[0-9]*M?(?:\/[A-G](?:#|b)?)?/g

const Y_TOLERANCE_PX = 4

/** @typedef {{ str: string, x: number, y: number, width: number }} PdfToken */
/** @typedef {{ y: number, tokens: PdfToken[] }} PdfLine */

/**
 * @returns {Promise<typeof import('pdfjs-dist')>}
 */
async function loadPdfjs() {
  if (typeof window === 'undefined') {
    return import('pdfjs-dist/legacy/build/pdf.mjs')
  }
  const mod = await import('pdfjs-dist')
  try {
    const { GlobalWorkerOptions } = mod
    GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString()
  } catch {
    /* ignore */
  }
  return mod
}

/**
 * @param {import('pdfjs-dist').TextItem} item
 * @returns {PdfToken | null}
 */
export function pdfItemToToken(item) {
  if (!item || !('str' in item) || !String(item.str)) return null
  const t = item.transform || []
  return {
    str: String(item.str),
    x: Number(t[4]) || 0,
    y: Number(t[5]) || 0,
    width: Number(item.width) || 0,
  }
}

/**
 * Agrupa tokens por linha horizontal (Y próximo).
 * @param {PdfToken[]} tokens
 * @param {number} [yTol]
 * @returns {PdfLine[]}
 */
export function clusterTokensIntoLines(tokens, yTol = Y_TOLERANCE_PX) {
  const sorted = [...tokens].sort((a, b) => b.y - a.y || a.x - b.x)
  /** @type {PdfLine[]} */
  const lines = []
  for (const tok of sorted) {
    let line = lines.find((l) => Math.abs(l.y - tok.y) <= yTol)
    if (!line) {
      line = { y: tok.y, tokens: [] }
      lines.push(line)
    } else {
      line.y = (line.y * line.tokens.length + tok.y) / (line.tokens.length + 1)
    }
    line.tokens.push(tok)
  }
  return lines.sort((a, b) => b.y - a.y)
}

/**
 * @param {PdfToken[]} tokens
 */
function medianCharWidth(tokens) {
  const widths = tokens
    .filter((t) => t.str.length > 0 && t.width > 0)
    .map((t) => t.width / t.str.length)
    .sort((a, b) => a - b)
  return widths[Math.floor(widths.length / 2)] || 6
}

/**
 * @param {PdfToken[]} tokens
 */
export function isPdfChordOnlyLine(tokens) {
  const parts = tokens
    .map((t) => t.str.trim())
    .filter(Boolean)
    .flatMap((s) => s.split(/\s+/))
    .filter(Boolean)
  if (!parts.length) return false
  const chordParts = parts.filter((p) => isValidChordSymbol(p))
  if (!chordParts.length) return false
  const joined = tokens.map((t) => t.str).join('')
  const withoutChords = joined.replace(CHORD_RE, '').replace(/[\s|]/g, '')
  return withoutChords.length <= 2
}

/**
 * Letra: tokens por X, palavras separadas por espaço.
 * @param {PdfToken[]} tokens
 */
export function lyricTokensToText(tokens) {
  const sorted = [...tokens].sort((a, b) => a.x - b.x)
  return sorted
    .map((t) => t.str.trim())
    .filter(Boolean)
    .join(' ')
}

/**
 * Mapa x → índice de coluna na letra (referência = x mínimo da letra).
 * @param {number} chordX
 * @param {PdfToken[]} lyricTokens
 * @param {string} lyricText
 */
export function mapChordXToLyricPos(chordX, lyricTokens, lyricText) {
  const sorted = [...lyricTokens].sort((a, b) => a.x - b.x)
  if (!sorted.length) return 0
  const minX = sorted[0].x
  const cw = medianCharWidth(sorted)
  let pos = Math.round((chordX - minX) / cw)
  pos = Math.max(0, Math.min(pos, lyricText.length))
  return pos
}

/**
 * Linha de acorde alinhada à letra logo abaixo (mesmo formato ODT).
 * @param {PdfToken[]} chordTokens
 * @param {PdfToken[]} lyricTokens
 * @param {string} lyricText
 */
export function buildChordLineForLyric(chordTokens, lyricTokens, lyricText) {
  const chords = [...chordTokens]
    .sort((a, b) => a.x - b.x)
    .map((t) => {
      const symbol = t.str.trim()
      if (!isValidChordSymbol(symbol)) return null
      return {
        pos: mapChordXToLyricPos(t.x, lyricTokens, lyricText),
        chord: symbol,
      }
    })
    .filter(Boolean)
  return rebuildChordLineFromChords(chords)
}

/**
 * Fallback: linha mono sem letra de referência (cabeçalhos, intro).
 * @param {PdfToken[]} tokens
 */
export function tokensToMonospaceLine(tokens) {
  const sorted = [...tokens].sort((a, b) => a.x - b.x)
  if (!sorted.length) return ''
  const cw = medianCharWidth(sorted)
  const minX = sorted[0].x
  let out = ''
  let col = 0
  for (const t of sorted) {
    const target = Math.round((t.x - minX) / cw)
    if (target > col) out += ' '.repeat(target - col)
    out += t.str
    col = out.length
  }
  return out.replace(/\s+$/, '')
}

/**
 * Converte items de uma página em linhas de texto plano.
 * @param {import('pdfjs-dist').TextItem[]} items
 */
export function buildPageTextFromPdfItems(items) {
  const tokens = (items || []).map(pdfItemToToken).filter(Boolean)
  const lines = clusterTokensIntoLines(tokens)
  const out = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const text = line.tokens.map((t) => t.str).join('').trim()
    if (!text || /^página\s*\d+/i.test(text)) continue

    if (isPdfChordOnlyLine(line.tokens)) {
      let j = i + 1
      while (j < lines.length && !lines[j].tokens.some((t) => t.str.trim())) j += 1
      const next = lines[j]
      if (next && !isPdfChordOnlyLine(next.tokens)) {
        const lyricText = lyricTokensToText(next.tokens)
        out.push(buildChordLineForLyric(line.tokens, next.tokens, lyricText))
        continue
      }
      out.push(tokensToMonospaceLine(line.tokens))
      continue
    }

    out.push(lyricTokensToText(line.tokens) || tokensToMonospaceLine(line.tokens))
  }

  return out.join('\n')
}

/**
 * @param {ArrayBuffer | Uint8Array} data
 * @returns {Promise<{ texto: string, avisos: string[], escaneado: boolean }>}
 */
export async function extractTextFromPdf(data) {
  const pdfjs = await loadPdfjs()
  const raw = data instanceof Uint8Array ? data : new Uint8Array(data)
  const bytes =
    typeof Buffer !== 'undefined' && Buffer.isBuffer?.(raw)
      ? Uint8Array.from(raw)
      : new Uint8Array(raw)

  if (bytes.byteLength === 0) {
    throw new Error(
      'Não foi possível ler o PDF (arquivo vazio). No celular, baixe o PDF do Drive ' +
        'para o aparelho e importe de Downloads/Arquivos — ou use Word (.docx) / ODT.',
    )
  }

  const loadingTask = pdfjs.getDocument({
    data: bytes,
    useSystemFonts: true,
    isEvalSupported: false,
    disableWorker: typeof window === 'undefined',
  })
  let pdf
  try {
    pdf = await loadingTask.promise
  } catch (err) {
    const m = String(err?.message || err || '').toLowerCase()
    if (
      m.includes('size is zero') ||
      m.includes('zero bytes') ||
      m.includes('pdf file is empty')
    ) {
      throw new Error(
        'Não foi possível ler o PDF (arquivo vazio). No celular, baixe o PDF do Drive ' +
          'para o aparelho e importe de Downloads/Arquivos — ou use Word (.docx) / ODT.',
      )
    }
    throw err
  }
  const parts = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    const pageText = buildPageTextFromPdfItems(content.items)
    if (pageText.trim()) parts.push(pageText)
  }

  const texto = parts.join('\n').replace(/[ \t]+\n/g, '\n').trim()
  const escaneado = texto.length < 40
  const avisos = []
  if (escaneado) {
    avisos.push(
      'Este PDF parece escaneado (sem camada de texto útil). ' +
        'Converta em PDF com texto selecionável ou use ODT/DOCX/TXT.',
    )
  }

  return { texto, avisos, escaneado }
}
