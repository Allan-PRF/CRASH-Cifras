/**
 * Extrai texto plano de ODT (OpenDocument) a partir de ArrayBuffer.
 */

import { unzipSync, strFromU8 } from 'fflate'

/**
 * @param {ArrayBuffer | Uint8Array} data
 * @returns {string}
 */
export function extractTextFromOdt(data) {
  const bytes =
    data instanceof Uint8Array ? data : new Uint8Array(data)
  const files = unzipSync(bytes)
  const contentEntry =
    files['content.xml'] ||
    files['Content.xml'] ||
    Object.entries(files).find(([k]) => /content\.xml$/i.test(k))?.[1]

  if (!contentEntry) {
    throw new Error('ODT inválido: content.xml não encontrado')
  }

  const xml = strFromU8(contentEntry)
  return odtXmlToPlainText(xml)
}

/**
 * Converte content.xml ODT em texto com quebras de linha por parágrafo.
 * @param {string} xml
 */
export function odtXmlToPlainText(xml) {
  let text = String(xml || '')
  text = text.replace(/<\/text:p>/gi, '\n')
  text = text.replace(/<\/text:h>/gi, '\n')
  text = text.replace(/<text:line-break\b[^>]*?\/>/gi, '\n')
  text = text.replace(/<text:tab\b[^>]*?\/>/gi, '\t')
  // <text:s/> = 1 espaço; <text:s text:c="N"/> = N espaços (alinhamento mono).
  text = text.replace(/<text:s\b([^>]*)\/>/gi, (_m, attrs) => {
    const c = /(?:\s|^)(?:text:)?c\s*=\s*["'](\d+)["']/i.exec(String(attrs || ''))
    const n = c ? Number.parseInt(c[1], 10) : 1
    return ' '.repeat(Number.isFinite(n) && n > 0 ? n : 1)
  })
  text = text.replace(/<[^>]+>/g, '')
  text = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\u00a0/g, ' ')
  return text.replace(/\n{3,}/g, '\n\n').trim()
}
