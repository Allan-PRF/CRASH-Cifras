/**
 * Teste obrigatório multi-formato: Há poder em ODT + PDF + DOCX (mesmos 13 checks).
 *
 *   node scripts/generate-ha-poder-fixtures.mjs
 *   npm run test:import-ha-poder -w frontend
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { posProcessarImportacaoCifra } from '../src/lib/posProcessamentoImport.js'
import { effectiveLineWidth } from '../src/lib/cifraAutoWrap.js'
import { getTeleprompterMaxCols } from '../src/lib/teleprompterMaxCols.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixtures = resolve(__dirname, '../fixtures/ha-poder')

let passed = 0
let failed = 0

function assert(cond, label, detail = '') {
  if (cond) {
    passed++
    console.log(`  ✓ ${label}`)
  } else {
    failed++
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

const cols = getTeleprompterMaxCols({
  measureCharWidth: (fs) => fs * 0.6,
})

async function runChecks(label, filename, data) {
  console.log(`\n=== ${label} ===`)
  const result = await posProcessarImportacaoCifra({
    fileData: data,
    filename,
    maxCols: cols.maxCols,
  })

  assert(/há poder/i.test(result.titulo), 'título detectado', result.titulo)
  assert(/minist[eé]rio\s+flop/i.test(result.artista), 'artista detectado', result.artista)
  assert(Boolean(result.tom_original || result.tom_detectado), 'tom detectado', String(result.tom_detectado))

  const allChords = []
  for (const sec of result.secoes) {
    for (const line of sec.linhas.lines) {
      for (const c of line.chords || []) allChords.push(c.chord)
    }
  }
  assert(allChords.includes('F#/A#'), 'F#/A# intacto')
  assert(allChords.includes('G#/C'), 'G#/C intacto')
  assert(allChords.includes('A#m'), 'A#m presente')

  const preciosos = []
  for (const sec of result.secoes) {
    for (const line of sec.linhas.lines) {
      if (/Precioso/i.test(line.lyricLine || '')) preciosos.push(line)
    }
  }
  assert(preciosos.length >= 1, 'linhas Precioso encontradas', String(preciosos.length))
  for (const line of preciosos) {
    const w = effectiveLineWidth(line)
    assert(w <= cols.maxCols, `Precioso cabe em ${cols.maxCols}`, `width=${w}`)
  }

  assert(result.wrap_ok, 'wrap_ok')
  assert(result.wrap_overflow.length === 0, 'nenhuma linha overflow')

  let maxW = 0
  for (const sec of result.secoes) {
    for (const line of sec.linhas.lines) {
      maxW = Math.max(maxW, effectiveLineWidth(line))
    }
  }
  assert(maxW <= cols.maxCols, 'máximo global ≤ maxCols', String(maxW))

  assert(result.origem_importacao === 'curadoria', 'origem curadoria')
  assert(Boolean(result.arquivo_origem), 'arquivo_origem')
  assert(Boolean(result.importado_em), 'importado_em')

  return result
}

const odtCandidates = [
  process.argv[2],
  resolve(__dirname, '../../tmp_ha_poder.zip'),
  'C:\\Users\\PC\\OneDrive\\Desktop\\Há poder - ministério flop.odt',
].filter(Boolean)
const odtPath = odtCandidates.find((p) => existsSync(p))
if (!odtPath) {
  console.error('ODT não encontrado')
  process.exit(1)
}

const pdfPath = resolve(fixtures, 'ha-poder.pdf')
const docxPath = resolve(fixtures, 'ha-poder.docx')
if (!existsSync(pdfPath) || !existsSync(docxPath)) {
  console.error('Gere fixtures antes: node frontend/scripts/generate-ha-poder-fixtures.mjs')
  process.exit(1)
}

await runChecks('ODT', 'Há poder - ministério flop.odt', readFileSync(odtPath))
await runChecks('PDF', 'Há poder - ministério flop.pdf', readFileSync(pdfPath))
await runChecks('DOCX', 'Há poder - ministério flop.docx', readFileSync(docxPath))

console.log(`\n${passed} ok, ${failed} falhou (esperado ≥ 39 = 13×3)`)
process.exit(failed > 0 ? 1 : 0)
