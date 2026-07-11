import { createHash } from 'crypto'
import { normalizeChordLine } from './chord-schema.js'

/** Pesos do ranking (seção 5.3 do esquema do acervo). */
export const ACERVO_PESO_ACEITACAO = 2
export const ACERVO_PESO_CONVERGENCIA = 3

/** Quantização de coluna `pos` ao normalizar (±N chars → mesma versão). */
export const ACERVO_POS_QUANTUM = 4

/**
 * Normaliza título/artista para casar pedidos (minúsculo, sem acento, espaços colapsados).
 * @param {string} value
 */
export function normalizeAcervoText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * @param {string} chord
 */
function normalizeChordSymbol(chord) {
  return String(chord || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/♯/g, '#')
    .replace(/♭/g, 'b')
}

function quantizePos(pos) {
  const n = Number(pos) || 0
  return Math.round(n / ACERVO_POS_QUANTUM) * ACERVO_POS_QUANTUM
}

/**
 * Normaliza letra para hash (espaços/maiúsculas).
 * @param {string} lyric
 */
function normalizeLyricForHash(lyric) {
  return String(lyric || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Snapshot canônico para hash e comparação.
 * @param {object} cifra
 */
export function normalizeCifraForHash(cifra) {
  if (!cifra || typeof cifra !== 'object') return { secoes: [] }

  const secoes = (cifra.secoes || []).map((sec) => {
    const lines = (sec.linhas?.lines || []).map((raw) => {
      const line = normalizeChordLine(raw)
      const chords = (line.chords.length ? line.chords : [])
        .map((c) => ({
          pos: quantizePos(c.pos),
          chord: normalizeChordSymbol(c.chord),
        }))
        .filter((c) => c.chord)
        .sort((a, b) => a.pos - b.pos || a.chord.localeCompare(b.chord))

      return {
        slug: sec.slug || '',
        lyricLine: normalizeLyricForHash(line.lyricLine),
        chords,
      }
    })

    return {
      slug: sec.slug || '',
      nome: String(sec.nome || '').trim(),
      ordem_original: Number(sec.ordem_original) || 0,
      lines,
    }
  })

  secoes.sort((a, b) => a.ordem_original - b.ordem_original)

  return {
    tom_original: normalizeChordSymbol(cifra.tom_original || ''),
    bpm: cifra.bpm != null ? Math.round(Number(cifra.bpm)) : null,
    secoes,
  }
}

/**
 * @param {object} cifra
 */
export function hashCifraNorm(cifra) {
  const normalized = normalizeCifraForHash(cifra)
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex')
}

/** Hash estável só das seções normalizadas (ignora tom_original e bpm). */
export function hashSecoesNorm(cifra) {
  const { secoes } = normalizeCifraForHash(cifra)
  return createHash('sha256').update(JSON.stringify(secoes)).digest('hex')
}

/**
 * Atualiza apenas tom_original no snapshot jsonb — secoes, intro e bpm permanecem.
 * @param {object} cifra
 * @param {string|null} tomOriginal
 */
export function aplicarTomOriginalNaCifra(cifra, tomOriginal) {
  return {
    ...cifra,
    tom_original: tomOriginal || null,
  }
}

/**
 * Monta snapshot completo da cifra (campo jsonb em acervo_versoes).
 * @param {object} params
 * @param {string|null} params.tomOriginal
 * @param {number|null} params.bpm
 * @param {object|null} params.intro
 * @param {Array<object>} params.secoes — { slug, nome, ordem_original, linhas }
 */
export function buildCifraSnapshot({ tomOriginal, bpm, intro, secoes }) {
  return {
    tom_original: tomOriginal || null,
    bpm: bpm != null ? Math.round(Number(bpm)) : null,
    intro: intro || { lines: [] },
    secoes: (secoes || []).map((sec) => ({
      slug: sec.slug,
      nome: sec.nome,
      ordem_original: sec.ordem_original,
      linhas: sec.linhas || { lines: [] },
    })),
  }
}

/**
 * Desempacota snapshot do acervo em linhas de secoes_musica.
 * @param {object} cifra
 * @returns {Array<{ slug, nome, ordem_original, linhas }>}
 */
export function unpackCifraToSecoes(cifra) {
  if (!cifra?.secoes?.length) return []
  return cifra.secoes.map((sec) => ({
    slug: sec.slug,
    nome: sec.nome,
    ordem_original: sec.ordem_original,
    linhas: sec.linhas || { lines: [] },
  }))
}

/**
 * @param {object} cifraA
 * @param {object} cifraB
 */
export function cifrasEssencialmenteIguais(cifraA, cifraB) {
  return hashCifraNorm(cifraA) === hashCifraNorm(cifraB)
}

/**
 * @param {{ aceitacao_count?: number, convergencia_count?: number, created_at?: string }} versao
 */
export function calcularScoreVersao(versao) {
  const aceitacao = Number(versao.aceitacao_count) || 0
  const convergencia = Number(versao.convergencia_count) || 0
  const recenciaBonus = versao.created_at
    ? new Date(versao.created_at).getTime() / 1e15
    : 0
  return (
    aceitacao * ACERVO_PESO_ACEITACAO +
    convergencia * ACERVO_PESO_CONVERGENCIA +
    recenciaBonus
  )
}

/**
 * Monta snapshot a partir das seções pessoais + metadados da música.
 */
export function buildCifraSnapshotFromMusica({ tomOriginal, bpm, secoes }) {
  return buildCifraSnapshot({
    tomOriginal,
    bpm,
    intro: { lines: [] },
    secoes,
  })
}
