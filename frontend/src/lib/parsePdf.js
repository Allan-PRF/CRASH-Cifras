/**
 * Extrai texto de PDF (camada de texto). Escaneado sem texto → aviso.
 */

/**
 * @returns {Promise<typeof import('pdfjs-dist')>}
 */
async function loadPdfjs() {
  if (typeof window === 'undefined') {
    // Node / testes — build legacy (sem DOMMatrix)
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
 * @param {ArrayBuffer | Uint8Array} data
 * @returns {Promise<{ texto: string, avisos: string[], escaneado: boolean }>}
 */
export async function extractTextFromPdf(data) {
  const pdfjs = await loadPdfjs()
  const raw = data instanceof Uint8Array ? data : new Uint8Array(data)
  // Node Buffer é Uint8Array subclass — pdfjs exige Uint8Array "puro"
  const bytes =
    typeof Buffer !== 'undefined' && Buffer.isBuffer?.(raw)
      ? Uint8Array.from(raw)
      : new Uint8Array(raw)
  const loadingTask = pdfjs.getDocument({
    data: bytes,
    useSystemFonts: true,
    isEvalSupported: false,
    disableWorker: typeof window === 'undefined',
  })
  const pdf = await loadingTask.promise
  const parts = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    const line = (content.items || [])
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    if (line.trim()) parts.push(line)
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
