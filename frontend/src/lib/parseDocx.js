/**
 * Extrai texto de DOCX (Word OOXML).
 */

import mammoth from 'mammoth'

/**
 * @param {ArrayBuffer | Uint8Array} data
 * @returns {Promise<{ texto: string, avisos: string[] }>}
 */
export async function extractTextFromDocx(data) {
  const bytes =
    data instanceof Uint8Array ? data : new Uint8Array(data)

  let result
  if (typeof window === 'undefined') {
    // Node: mammoth espera { buffer }
    result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) })
  } else {
    const arrayBuffer =
      bytes.buffer instanceof ArrayBuffer
        ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
        : bytes.slice().buffer
    result = await mammoth.extractRawText({ arrayBuffer })
  }

  const texto = String(result.value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const avisos = []
  if (result.messages?.length) {
    for (const m of result.messages) {
      if (m?.message) avisos.push(String(m.message))
    }
  }
  if (texto.length < 20) {
    avisos.push('DOCX sem texto utilizável. Verifique o arquivo.')
  }

  return { texto, avisos }
}
