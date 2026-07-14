/**
 * Pós-processamento de importação de cifra (arquivo ODT/PDF/DOCX/TXT).
 * 1) título/artista  2) tom original  3) corte automático obrigatório
 */

import { detectarTituloArtista } from './detectTituloArtista.js'
import {
  detectarTomPrimeiraSecao,
  parseCifraTextoImport,
} from './parseCifraTextoImport.js'
import { autoWrapSecoes } from './cifraAutoWrap.js'
import { getTeleprompterMaxCols } from './teleprompterMaxCols.js'
import { extractTextoArquivoCifra } from './extractTextoArquivo.js'

/**
 * @param {{
 *   texto?: string,
 *   filename?: string,
 *   fileData?: ArrayBuffer | Uint8Array,
 *   odtData?: ArrayBuffer | Uint8Array,
 *   maxCols?: number,
 *   titulo?: string,
 *   artista?: string,
 *   tomOriginal?: string,
 * }} input
 */
export async function posProcessarImportacaoCifra(input = {}) {
  let texto = input.texto || ''
  let avisos = []
  let formato = 'texto'
  let escaneado = false

  const rawData = input.fileData || input.odtData
  if (!texto && rawData) {
    const extracted = await extractTextoArquivoCifra({
      filename: input.filename || 'arquivo.odt',
      data: rawData,
    })
    texto = extracted.texto
    avisos = extracted.avisos || []
    formato = extracted.formato
    escaneado = Boolean(extracted.escaneado)
  }

  if (!texto.trim()) {
    const err = new Error(
      escaneado
        ? 'PDF escaneado sem texto. Converta para PDF pesquisável ou DOCX/ODT/TXT.'
        : 'Texto da cifra vazio',
    )
    err.avisos = avisos
    err.escaneado = escaneado
    throw err
  }

  const metaDetectada = detectarTituloArtista({
    filename: input.filename,
    texto,
  })
  const titulo = (input.titulo ?? metaDetectada.titulo ?? '').trim()
  const artista = (input.artista ?? metaDetectada.artista ?? '').trim()

  const { secoes } = parseCifraTextoImport(texto)
  const tomDetectado = detectarTomPrimeiraSecao(secoes)
  const tomOriginal = (input.tomOriginal ?? tomDetectado ?? '').trim() || null

  const colsInfo =
    input.maxCols != null
      ? { maxCols: input.maxCols, fonteLetraPx: null, charWidthPx: null, usableWidthPx: null }
      : getTeleprompterMaxCols()

  const wrap = autoWrapSecoes(secoes, colsInfo.maxCols)

  return {
    titulo,
    artista,
    tom_original: tomOriginal,
    tom_detectado: tomDetectado,
    meta_fonte: metaDetectada.fonte,
    maxCols: colsInfo.maxCols,
    colsInfo,
    secoes: wrap.secoes,
    wrap_ok: wrap.ok,
    wrap_warnings: wrap.warnings,
    wrap_overflow: wrap.overflow,
    texto_bruto: texto,
    avisos,
    formato,
    escaneado,
    arquivo_origem: input.filename || null,
    origem_importacao: 'curadoria',
    importado_em: new Date().toISOString(),
    status_revisao: wrap.ok && !escaneado && !(avisos || []).length ? 'ok' : 'precisa_revisao',
  }
}

/**
 * Monta payload de seções para createMusica / upsertSecao.
 * @param {Awaited<ReturnType<typeof posProcessarImportacaoCifra>>} result
 */
export function secoesParaCreateMusica(result) {
  return (result.secoes || []).map((sec, i) => ({
    slug: sec.slug || 'verso',
    nome: sec.nome || `Seção ${i + 1}`,
    ordem_original: sec.ordem_original ?? i,
    linhas: sec.linhas || { lines: [] },
  }))
}
