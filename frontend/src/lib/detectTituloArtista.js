/**
 * Detecção de título/artista a partir do nome do arquivo e/ou primeira linha útil.
 */

/**
 * @param {string} [filename]
 * @returns {{ titulo: string | null, artista: string | null }}
 */
export function detectarTituloArtistaDoArquivo(filename = '') {
  const base = String(filename || '')
    .replace(/^.*[\\/]/, '')
    .replace(/\.(odt|txt|md|docx)$/i, '')
    .trim()
  if (!base) return { titulo: null, artista: null }

  if (base.includes(' - ')) {
    const [a, ...rest] = base.split(' - ')
    const b = rest.join(' - ').trim()
    // Arquivos locale geralmente "Título - Artista"
    return { titulo: a.trim() || null, artista: b || null }
  }
  return { titulo: base, artista: null }
}

/**
 * Procura linhas iniciais estilo "Artista - Título" ou título isolado (não marcador de seção).
 * @param {string} texto
 */
export function detectarTituloArtistaDaPrimeiraLinha(texto = '') {
  const linhas = String(texto || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  for (const linha of linhas.slice(0, 8)) {
    if (/^\[.+\]$/.test(linha)) continue
    if (/^página\s*\d+/i.test(linha)) continue
    // linha só de acordes
    if (/^[A-G][#b]?(?:m|maj|min|M|dim|aug|sus|add|\+|°|º)?[\d/A-Gb#m]*(\s+[A-G][#b]?[\w#b/]*)*\s*$/.test(linha)) {
      continue
    }
    if (linha.includes(' - ')) {
      const [a, ...rest] = linha.split(' - ')
      return { titulo: rest.join(' - ').trim() || a.trim(), artista: a.trim() }
    }
    if (linha.length >= 2 && linha.length <= 80) {
      return { titulo: linha, artista: null }
    }
  }
  return { titulo: null, artista: null }
}

/**
 * Combina arquivo + texto; arquivo tem prioridade no título quando presente.
 * @param {{ filename?: string, texto?: string }} opts
 */
export function detectarTituloArtista({ filename = '', texto = '' } = {}) {
  const fromFile = detectarTituloArtistaDoArquivo(filename)
  const fromText = detectarTituloArtistaDaPrimeiraLinha(texto)
  return {
    titulo: fromFile.titulo || fromText.titulo || '',
    artista: fromFile.artista || fromText.artista || '',
    fonte: fromFile.titulo ? 'arquivo' : fromText.titulo ? 'texto' : 'vazio',
  }
}
