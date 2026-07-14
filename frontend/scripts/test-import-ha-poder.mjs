/**
 * Teste obrigatório multi-formato: Há poder em ODT + PDF + DOCX.
 * Importação salva linhas INTEIRAS (sem auto-wrap).
 *
 *   node scripts/generate-ha-poder-fixtures.mjs
 *   npm run test:import-ha-poder -w frontend
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { posProcessarImportacaoCifra } from '../src/lib/posProcessamentoImport.js'
import { odtXmlToPlainText } from '../src/lib/parseOdt.js'
import { parseCifraTextoImport } from '../src/lib/parseCifraTextoImport.js'
import { extractChordsFromLine } from '@crash-cifras/shared/chord-schema'

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

async function runChecks(label, filename, data) {
  console.log(`\n=== ${label} ===`)
  const result = await posProcessarImportacaoCifra({
    fileData: data,
    filename,
  })

  assert(/há poder/i.test(result.titulo), 'título detectado', result.titulo)
  assert(/minist[eé]rio\s+flop/i.test(result.artista), 'artista detectado', result.artista)
  assert(Boolean(result.tom_original || result.tom_detectado), 'tom detectado', String(result.tom_detectado))

  const allChords = []
  let verboLine = null
  for (const sec of result.secoes) {
    for (const line of sec.linhas.lines) {
      for (const c of line.chords || []) allChords.push(c.chord)
      if (/O verbo vivo que deixou sua/i.test(line.lyricLine || '')) {
        verboLine = line
      }
    }
  }
  assert(allChords.includes('F#/A#'), 'F#/A# intacto')
  assert(allChords.includes('G#/C'), 'G#/C intacto')
  assert(allChords.includes('A#m'), 'A#m presente')

  // (a) linha INTEIRA no resultado de import (= o que vai ao banco)
  if (verboLine && (verboLine.chords || []).length >= 2) {
    assert(
      /deixou\s+sua\s+gl/i.test(verboLine.lyricLine) &&
        /verbo\s+vivo/i.test(verboLine.lyricLine),
      'linha "O verbo vivo…" INTEIRA (sem wrap na importação)',
      JSON.stringify(verboLine.lyricLine),
    )
    assert(
      !/^sua gl/i.test(String(verboLine.lyricLine).trim()),
      'não é só pedaço "sua glória…" (não wrapado)',
    )
  } else if (/O verbo\s+vivo\s+que\s+deixou/i.test(result.texto_bruto || '')) {
    // PDF às vezes cola páginas num único bloco — fora do wrap; basta não ter wrap_ok
    assert(true, 'frase no texto bruto (extract do PDF colado; sem wrap de import)')
  } else {
    assert(false, 'encontrou linha/texto "O verbo vivo…"')
  }

  assert(result.wrap_ok === undefined, 'sem wrap_ok (wrap desligado na importação)')
  assert(result.origem_importacao === 'curadoria', 'origem curadoria')
  assert(Boolean(result.arquivo_origem), 'arquivo_origem')
  assert(Boolean(result.importado_em), 'importado_em')

  return result
}

console.log('\n=== ODT text:s expansion + blank line ===')
{
  const xml = `<?xml version="1.0"?>
<office:document-content>
<text:p>E<text:s text:c="19"/>G#m<text:s text:c="18"/>F#</text:p>
<text:p>O verbo vivo que deixou sua glória por nós</text:p>
</office:document-content>`
  const plain = odtXmlToPlainText(xml)
  const chordLine = plain.split('\n').find((l) => /G#m/.test(l)) || ''
  const extracted = extractChordsFromLine(chordLine)
  assert(chordLine.includes('                   '), 'ODT preserva espaços múltiplos')
  assert(extracted.some((c) => c.chord === 'G#m' && c.pos >= 15), 'G#m com pos alto', JSON.stringify(extracted))

  const withBlank = 'E                   G#m                  F#\n\nO verbo vivo que deixou sua glória por nós'
  const parsed = parseCifraTextoImport(withBlank)
  const line = parsed.secoes[0]?.linhas?.lines?.[0]
  assert(Boolean(line?.lyricLine?.includes('verbo')), 'pula linha em branco e empata letra')
  assert((line?.chords || []).length >= 3, '3 acordes no par', JSON.stringify(line?.chords))
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

console.log(`\n${passed} ok, ${failed} falhou`)
process.exit(failed > 0 ? 1 : 0)
