/**
 * Parser de texto estilo Cifra Club (marcadores [Seção] + pares acorde/letra)
 * para importação de arquivo — espelha a lógica de backend/lib/cifraClub.js
 * o suficiente para uso no cliente.
 */

import {
  extractChordsFromLine,
  isValidChordSymbol,
  rebuildChordLineFromChords,
} from '@crash-cifras/shared/chord-schema'
import { serializeChordLine } from './cifraEdit.js'
import { inferTomFromChords } from './graus.js'

const CHORD_RE =
  /[A-G](?:#|b)?(?:maj|min|m|M|dim|aug|sus|add|°|º|\+)?[0-9]*M?(?:\/[A-G](?:#|b)?)?/g

function mapNomeSecaoParaSlug(nome) {
  const n = String(nome || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
  if (n.includes('intro')) return 'intro'
  if (n.includes('pre') && n.includes('refra')) return 'pre_refrao'
  if (n.includes('refra') || n.includes('chorus')) return 'refrao'
  if (n.includes('ponte') || n.includes('bridge')) return 'ponte'
  if (n.includes('solo')) return 'solo'
  if (n.includes('outro') || n.includes('final')) return 'outro'
  if (n.includes('verso') || n.includes('verse') || n.includes('parte')) return 'verso'
  return 'verso'
}

function isChordOnlyLine(line) {
  const trimmed = line.trim()
  if (!trimmed) return false
  const withoutChords = trimmed.replace(CHORD_RE, '').replace(/[\s|]/g, '')
  const chordCount = (trimmed.match(CHORD_RE) || []).length
  return chordCount > 0 && withoutChords.length <= 2
}

function parseBlocoLinhas(texto) {
  const linhas = String(texto || '').split('\n')
  const pares = []
  let i = 0

  while (i < linhas.length) {
    const line = linhas[i]
    if (!line.trim() || /^página\s*\d+/i.test(line.trim())) {
      i += 1
      continue
    }

    if (isChordOnlyLine(line)) {
      const plain = line.replace(/\s+$/, '')
      const chords = extractChordsFromLine(plain).filter((c) => isValidChordSymbol(c.chord))
      const chordLine =
        chords.length > 0 ? rebuildChordLineFromChords(chords) : plain
      let lyricLine = ''
      if (i + 1 < linhas.length) {
        const next = linhas[i + 1]
        if (!isChordOnlyLine(next) && next.trim() && !/^\[.+\]$/.test(next.trim()) && !/^página\s*\d+/i.test(next.trim())) {
          lyricLine = next.replace(/\s+$/, '')
          i += 2
        } else {
          i += 1
        }
      } else {
        i += 1
      }
      pares.push(serializeChordLine(lyricLine, chords))
      continue
    }

    // letra sem linha de acorde acima
    pares.push(serializeChordLine(line.replace(/\s+$/, ''), []))
    i += 1
  }

  return pares
}

/**
 * @param {string} raw
 * @returns {{ secoes: { nome: string, slug: string, linhas: { lines: object[] }, ordem_original: number }[] }}
 */
export function parseCifraTextoImport(raw) {
  const texto = String(raw || '').replace(/\r/g, '')
  const partes = texto.split(/(\[[^\]\n]+\])/g).filter((p) => p !== '')
  const secoes = []

  let atual = { nome: 'Música', slug: 'verso', texto: '' }

  function flush() {
    const lines = parseBlocoLinhas(atual.texto)
    if (!lines.length) return
    secoes.push({
      nome: atual.nome,
      slug: atual.slug,
      ordem_original: secoes.length,
      linhas: { lines },
    })
  }

  for (const parte of partes) {
    const marcador = parte.match(/^\[([^\]]+)\]$/)
    if (marcador) {
      const nome = marcador[1].trim()
      if (/^tab\b/i.test(nome)) continue
      if (/^página\b/i.test(nome)) continue
      flush()
      atual = { nome, slug: mapNomeSecaoParaSlug(nome), texto: '' }
      continue
    }
    atual.texto += parte
  }
  flush()

  return { secoes }
}

/**
 * Tom a partir dos acordes da primeira seção com cifra.
 * @param {{ linhas?: { lines?: object[] } }[]} secoes
 */
export function detectarTomPrimeiraSecao(secoes) {
  for (const sec of secoes || []) {
    const names = []
    for (const line of sec?.linhas?.lines || []) {
      for (const c of line?.chords || []) {
        if (c?.chord) names.push(c.chord)
      }
    }
    if (names.length) {
      return inferTomFromChords(names)
    }
  }
  return null
}
