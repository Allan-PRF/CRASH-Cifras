/**
 * Testes: extração PDF por coordenadas X/Y.
 */
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildChordLineForLyric,
  buildPageTextFromPdfItems,
  clusterTokensIntoLines,
  extractTextFromPdf,
  isPdfChordOnlyLine,
  lyricTokensToText,
  mapChordXToLyricPos,
} from '../src/lib/parsePdf.js'
import { extractChordsFromLine } from '@crash-cifras/shared/chord-schema'
import { parseCifraTextoImport } from '../src/lib/parseCifraTextoImport.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

console.log('=== caso real A# / Tem ciúmes (tokens sintéticos) ===')
{
  const chordTokens = [{ str: 'A#', x: 62.8, y: 800, width: 14 }]
  const lyricTokens = [
    { str: 'Tem', x: 56.8, y: 781, width: 20 },
    { str: 'ciúmes', x: 82.0, y: 781, width: 30 },
    { str: 'de', x: 110, y: 781, width: 12 },
    { str: 'mim', x: 125, y: 781, width: 18 },
  ]
  const lyricText = lyricTokensToText(lyricTokens)
  assert.equal(lyricText, 'Tem ciúmes de mim')

  const chordLine = buildChordLineForLyric(chordTokens, lyricTokens, lyricText)
  const chords = extractChordsFromLine(chordLine)
  assert.equal(chords.length, 1)
  assert.equal(chords[0].chord, 'A#')
  assert.ok(chords[0].pos >= 0 && chords[0].pos <= 3, `A# pos sobre Tem: ${chords[0].pos}`)

  const dChord = [{ str: 'D#/G', x: 56.8, y: 762, width: 22 }]
  const lyric2Tokens = [
    { str: 'O', x: 56.8, y: 743, width: 8 },
    { str: 'Seu', x: 68, y: 743, width: 18 },
    { str: 'amor', x: 90, y: 743, width: 24 },
  ]
  const lyric2 = lyricTokensToText(lyric2Tokens)
  const chordLine2 = buildChordLineForLyric(dChord, lyric2Tokens, lyric2)
  const chords2 = extractChordsFromLine(chordLine2)
  assert.equal(chords2[0].chord, 'D#/G')
  assert.equal(chords2[0].pos, 0, 'D#/G no início de "O Seu amor"')
  console.log('  ok: A# e D#/G')
}

console.log('=== cluster + classificação acorde/letra ===')
{
  const items = [
    { str: 'E', transform: [1, 0, 0, 1, 40, 779.9], width: 5.4 },
    { str: 'G#m', transform: [1, 0, 0, 1, 56.2, 779.9], width: 16.2 },
    { str: 'F#', transform: [1, 0, 0, 1, 83.2, 779.9], width: 10.8 },
    { str: 'O', transform: [1, 0, 0, 1, 40, 768.9], width: 5.4 },
    { str: 'verbo', transform: [1, 0, 0, 1, 83.2, 768.9], width: 21.6 },
  ]
  const lines = clusterTokensIntoLines(
    items.map((i) => ({
      str: i.str,
      x: i.transform[4],
      y: i.transform[5],
      width: i.width,
    })),
  )
  assert.equal(lines.length, 2)
  assert.ok(isPdfChordOnlyLine(lines[0].tokens))
  assert.ok(!isPdfChordOnlyLine(lines[1].tokens))

  const pageText = buildPageTextFromPdfItems(items)
  assert.ok(pageText.includes('E'), pageText)
  assert.ok(pageText.includes('verbo'), pageText)
  assert.ok(pageText.indexOf('E') < pageText.indexOf('verbo'), 'acorde antes da letra')
  console.log('  ok: cluster')
}

console.log('=== fixture ha-poder.pdf ===')
{
  const pdfPath = resolve(__dirname, '../fixtures/ha-poder/ha-poder.pdf')
  if (!existsSync(pdfPath)) {
    console.log('  skip: gere fixtures com npm run fixtures:ha-poder -w frontend')
  } else {
    const buf = readFileSync(pdfPath)
    const { texto, escaneado } = await extractTextFromPdf(buf)
    assert.equal(escaneado, false)
    assert.ok(texto.split('\n').length >= 50, `linhas: ${texto.split('\n').length}`)

    const parsed = parseCifraTextoImport(texto)
    const verboLine = parsed.secoes
      .flatMap((s) => s.linhas.lines)
      .find((l) => /verbo/i.test(l.lyricLine || ''))
    assert.ok(verboLine, 'linha verbo encontrada')
    assert.ok((verboLine.chords || []).length >= 2, JSON.stringify(verboLine.chords))
    const names = verboLine.chords.map((c) => c.chord)
    assert.ok(names.includes('E') && names.includes('G#m'), names.join(','))
    assert.equal(verboLine.chords[0].pos, 0)
    console.log('  ok: ha-poder.pdf', JSON.stringify(verboLine.chords))
  }
}

console.log('\nok: test-parse-pdf-coordinates')
