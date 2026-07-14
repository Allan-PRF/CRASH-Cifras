/**
 * Gera fixtures PDF/DOCX a partir do texto do ODT "Há poder"
 * (mesma cifra, formatos do acervo real).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import JSZip from 'jszip'
import { extractTextFromOdt } from '../src/lib/parseOdt.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '../fixtures/ha-poder')

function findOdt() {
  const candidates = [
    process.argv[2],
    resolve(__dirname, '../../tmp_ha_poder.zip'),
    'C:\\Users\\PC\\OneDrive\\Desktop\\Há poder - ministério flop.odt',
  ].filter(Boolean)
  return candidates.find((p) => existsSync(p))
}

async function buildPdf(texto) {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Courier)
  const fontSize = 9
  const margin = 40
  let page = doc.addPage()
  let { width, height } = page.getSize()
  let y = height - margin
  const maxWidth = width - margin * 2
  const lines = String(texto).split('\n')

  for (const raw of lines) {
    const line = raw || ' '
    // quebra manual se linha visual longa (aprox)
    const chunkSize = Math.max(20, Math.floor(maxWidth / (fontSize * 0.55)))
    for (let i = 0; i < line.length || i === 0; i += chunkSize) {
      const chunk = line.slice(i, i + chunkSize) || ' '
      if (y < margin + fontSize) {
        page = doc.addPage()
        ;({ width, height } = page.getSize())
        y = height - margin
      }
      page.drawText(chunk.replace(/[^\x00-\x7F]/g, (ch) => {
        // pdf-lib StandardFonts is WinAnsi — simplify accents for fixture
        return ch
          .normalize('NFD')
          .replace(/\p{M}/gu, '')
          .replace(/[^\x20-\x7E]/g, '?')
      }), {
        x: margin,
        y,
        size: fontSize,
        font,
      })
      y -= fontSize + 2
      if (i + chunkSize >= line.length) break
    }
  }
  return Buffer.from(await doc.save())
}

async function buildDocx(texto) {
  const paragraphs = String(texto)
    .split('\n')
    .map((line) => {
      const esc = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      return `<w:p><w:r><w:t xml:space="preserve">${esc || ' '}</w:t></w:r></w:p>`
    })
    .join('')

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${paragraphs}<w:sectPr/></w:body>
</w:document>`

  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  )
  zip.folder('_rels')?.file(
    '.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  )
  zip.folder('word')?.file('document.xml', documentXml)
  const buf = await zip.generateAsync({ type: 'nodebuffer' })
  return buf
}

const odtPath = findOdt()
if (!odtPath) {
  console.error('ODT fonte não encontrado')
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })
const odtBuf = readFileSync(odtPath)
const texto = extractTextFromOdt(odtBuf)
writeFileSync(resolve(outDir, 'ha-poder.txt'), texto, 'utf8')

const pdf = await buildPdf(texto)
writeFileSync(resolve(outDir, 'ha-poder.pdf'), pdf)

const docx = await buildDocx(texto)
writeFileSync(resolve(outDir, 'ha-poder.docx'), docx)

console.log('Fixtures em', outDir)
console.log('texto chars', texto.length, 'pdf', pdf.length, 'docx', docx.length)
