/**
 * Testa fallback htmlBlocoCifraParaTexto + parseCifraTexto (sem cheerio HTML parser).
 * Rode: node scripts/test-htmlBloco-fallback.mjs
 */
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import {
  extractChordsFromLine,
  rebuildChordLineFromChords,
} from '@crash-cifras/shared/chord-schema'
import { buscarCifraNoCifraClub } from '../lib/cifraClub.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Mesma lógica de htmlBlocoCifraParaTexto (após correção)
function htmlTagAcordeParaTexto(_match, inner) {
  return String(inner ?? '')
}

function htmlBlocoCifraParaTextoTest(htmlChunk) {
  let t = String(htmlChunk || '')
  t = t.replace(/\u00a0/g, ' ')
  t = t.replace(/<br\s*\/?>/gi, '\n')
  t = t.replace(/<b[^>]*>([^<]*)<\/b>/gi, htmlTagAcordeParaTexto)
  t = t.replace(/<strong[^>]*>([^<]*)<\/strong>/gi, htmlTagAcordeParaTexto)
  t = t.replace(
    /<span[^>]*class="[^"]*acorde[^"]*"[^>]*>([^<]*)<\/span>/gi,
    htmlTagAcordeParaTexto,
  )
  t = t.replace(/<[^>]+>/g, '')
  return t
}

const sampleColada =
  '<b>G</b>  <b>D</b>  <b>Em</b>  <b>C</b>\nLinha de letra'
const oldColada = sampleColada
  .replace(/<b[^>]*>([^<]*)<\/b>/gi, (_, c) => c.trim())
  .replace(/<[^>]+>/g, '')
const newColada = htmlBlocoCifraParaTextoTest(sampleColada)
console.log('=== Caso GDEmC (espaços entre tags) ===')
console.log('ANTES trim:', JSON.stringify(oldColada.split('\n')[0]))
console.log('DEPOIS:', JSON.stringify(newColada.split('\n')[0]))
console.log('pos DEPOIS:', extractChordsFromLine(newColada.split('\n')[0]))

const sample =
  '      <b>G/B</b>         <b>Am7</b>\nConhecendo meu pecado'
const oldLine = sample
  .replace(/<b[^>]*>([^<]*)<\/b>/gi, (_, c) => c.trim())
  .replace(/<[^>]+>/g, '')
const newLine = htmlBlocoCifraParaTextoTest(sample)

console.log('=== Fallback htmlBloco (amostra) ===')
console.log('ANTES (trim):', JSON.stringify(oldLine))
console.log('DEPOIS (sem trim):', JSON.stringify(newLine))

const chordsOld = extractChordsFromLine(oldLine.split('\n')[0])
const chordsNew = extractChordsFromLine(newLine.split('\n')[0])
console.log('pos ANTES trim:', chordsOld)
console.log('pos DEPOIS:', chordsNew)
console.log(
  'rebuild DEPOIS:',
  JSON.stringify(rebuildChordLineFromChords(chordsNew)),
)

const r = await buscarCifraNoCifraClub({
  titulo: 'Me Leva Pra Casa',
  artista: 'Israel Subira',
})
const parte = r.secoes.find((s) => s.nome === 'Primeira Parte')
const linha = parte?.linhas?.lines?.[1]
console.log('\n=== Parser HTML principal (8 seções) ===')
console.log(JSON.stringify(linha))
