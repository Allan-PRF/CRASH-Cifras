/**
 * Roteador de extração de texto por tipo de arquivo de cifra.
 */

import { extractTextFromOdt } from './parseOdt.js'
import { extractTextFromPdf } from './parsePdf.js'
import { extractTextFromDocx } from './parseDocx.js'

export const EXTENSOES_CIFRA_SUPORTADAS = ['.odt', '.txt', '.md', '.pdf', '.docx']

/**
 * @param {string} filename
 */
export function extensaoArquivo(filename = '') {
  const m = String(filename).toLowerCase().match(/(\.[a-z0-9]+)$/)
  return m ? m[1] : ''
}

/**
 * @param {{ filename: string, data: ArrayBuffer | Uint8Array, texto?: string }} input
 * @returns {Promise<{ texto: string, avisos: string[], formato: string, escaneado?: boolean }>}
 */
export async function extractTextoArquivoCifra(input) {
  const filename = input.filename || ''
  const ext = extensaoArquivo(filename)

  if (input.texto != null && String(input.texto).trim()) {
    return { texto: String(input.texto), avisos: [], formato: 'texto' }
  }

  if (ext === '.txt' || ext === '.md') {
    const bytes = input.data instanceof Uint8Array ? input.data : new Uint8Array(input.data)
    const texto = new TextDecoder('utf-8').decode(bytes)
    return { texto, avisos: [], formato: ext.slice(1) }
  }

  if (ext === '.odt') {
    const texto = extractTextFromOdt(input.data)
    return { texto, avisos: [], formato: 'odt' }
  }

  if (ext === '.pdf') {
    const { texto, avisos, escaneado } = await extractTextFromPdf(input.data)
    return { texto, avisos, formato: 'pdf', escaneado }
  }

  if (ext === '.docx') {
    const { texto, avisos } = await extractTextFromDocx(input.data)
    return { texto, avisos, formato: 'docx' }
  }

  throw new Error(
    `Formato não suportado (${ext || 'desconhecido'}). Use: ${EXTENSOES_CIFRA_SUPORTADAS.join(', ')}`,
  )
}
