import { TODOS_TONS } from '@crash-cifras/shared/constants'
import { getSupabaseAdmin } from './supabase.js'
import { usuarioPossuiCopiaLigadaAVersao } from './acervo.js'
import { enviarEmailReportTom } from './reportTomEmail.js'

function admin() {
  return getSupabaseAdmin()
}

/**
 * Etapa D — reporte de tom errado após correção única na fonte.
 */
export async function criarReportTom({
  acervoVersaoId,
  musicaId,
  userId,
  tomSugerido,
  comentario,
  userEmail,
}) {
  if (!acervoVersaoId || !musicaId || !tomSugerido) {
    const err = new Error('acervoVersaoId, musicaId e tomSugerido são obrigatórios.')
    err.status = 400
    throw err
  }
  if (!TODOS_TONS.includes(tomSugerido)) {
    const err = new Error('tomSugerido inválido.')
    err.status = 400
    throw err
  }

  const db = admin()

  const possuiCopia = await usuarioPossuiCopiaLigadaAVersao({ userId, acervoVersaoId })
  if (!possuiCopia) {
    const err = new Error('Sem permissão: você precisa ter uma cópia ligada a esta versão.')
    err.status = 403
    throw err
  }

  const { data: musica, error: mErr } = await db
    .from('musicas')
    .select('id, user_id, titulo, artista')
    .eq('id', musicaId)
    .eq('user_id', userId)
    .maybeSingle()

  if (mErr) throw mErr
  if (!musica) {
    const err = new Error('Música não encontrada.')
    err.status = 404
    throw err
  }

  const { data: versao, error: vErr } = await db
    .from('acervo_versoes')
    .select('id, origem, tom_original, tom_original_corrigido_em')
    .eq('id', acervoVersaoId)
    .eq('origem', 'motor')
    .maybeSingle()

  if (vErr) throw vErr
  if (!versao) {
    const err = new Error('Versão motor não encontrada.')
    err.status = 404
    throw err
  }
  if (!versao.tom_original_corrigido_em) {
    const err = new Error('Reporte disponível apenas após correção na fonte.')
    err.status = 400
    throw err
  }

  const { data: report, error: insertErr } = await db
    .from('report_tom')
    .insert({
      acervo_versao_id: acervoVersaoId,
      musica_id: musicaId,
      user_id: userId,
      tom_sugerido: tomSugerido,
      comentario: comentario?.trim() || null,
      status: 'pendente',
    })
    .select()
    .single()

  if (insertErr) throw insertErr

  await enviarEmailReportTom({
    tituloMusica: musica.titulo,
    artista: musica.artista,
    tomAtual: versao.tom_original,
    tomSugerido,
    comentario: comentario?.trim() || null,
    reportadoPor: userEmail || userId,
    reportId: report.id,
  })

  return { report }
}

export async function resolverReportTom({ reportId }) {
  if (!reportId) {
    const err = new Error('reportId é obrigatório.')
    err.status = 400
    throw err
  }

  const { data, error } = await admin()
    .from('report_tom')
    .update({ status: 'resolvido' })
    .eq('id', reportId)
    .eq('status', 'pendente')
    .select()
    .maybeSingle()

  if (error) throw error
  if (!data) {
    const err = new Error('Report não encontrado ou já resolvido.')
    err.status = 404
    throw err
  }

  return { report: data }
}
