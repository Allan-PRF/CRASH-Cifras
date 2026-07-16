/**
 * Leitura robusta de File no celular (Google Drive / iCloud às vezes entregam 0 bytes).
 */

const MAX_RETRIES = 4
const RETRY_MS = 400

/**
 * @param {Blob | File} blob
 * @returns {Promise<ArrayBuffer>}
 */
function readWithFileReader(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (result instanceof ArrayBuffer) resolve(result)
      else reject(new Error('Leitura do arquivo falhou'))
    }
    reader.onerror = () => reject(reader.error || new Error('Leitura do arquivo falhou'))
    reader.readAsArrayBuffer(blob)
  })
}

/**
 * @param {ArrayBuffer | null | undefined} buf
 */
function isEmptyBuffer(buf) {
  return !buf || buf.byteLength === 0
}

/**
 * @param {unknown} err
 */
export function isEmptyPdfError(err) {
  const m = String(err?.message || err || '').toLowerCase()
  return (
    m.includes('size is zero') ||
    m.includes('zero bytes') ||
    m.includes('pdf file is empty') ||
    m.includes('empty pdf')
  )
}

export const MENSAGEM_ARQUIVO_VAZIO_DRIVE =
  'Não foi possível ler o arquivo (0 bytes). No celular, arquivos do Google Drive ' +
  'às vezes não baixam de verdade. Abra o Drive → baixe o PDF para o aparelho ' +
  '(Downloads/Arquivos) e importe de lá — ou use Word (.docx) / OpenDocument (.odt).'

/**
 * Lê bytes do File; tenta arrayBuffer + FileReader + retries curtos.
 * @param {File} file
 * @returns {Promise<ArrayBuffer>}
 */
export async function readArquivoCifraBytes(file) {
  if (!file) throw new Error('Nenhum arquivo selecionado')

  // size === 0 no picker do Drive (iOS/Safari) — já avisamos sem chamar pdfjs
  if (typeof file.size === 'number' && file.size === 0) {
    throw new Error(MENSAGEM_ARQUIVO_VAZIO_DRIVE)
  }

  let lastBuf = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, RETRY_MS * attempt))
    }

    try {
      const buf = await file.arrayBuffer()
      if (!isEmptyBuffer(buf)) return buf
      lastBuf = buf
    } catch {
      /* tenta FileReader */
    }

    try {
      const buf = await readWithFileReader(file)
      if (!isEmptyBuffer(buf)) return buf
      lastBuf = buf
    } catch {
      /* próxima tentativa */
    }
  }

  if (isEmptyBuffer(lastBuf) || (typeof file.size === 'number' && file.size === 0)) {
    throw new Error(MENSAGEM_ARQUIVO_VAZIO_DRIVE)
  }

  throw new Error(MENSAGEM_ARQUIVO_VAZIO_DRIVE)
}
