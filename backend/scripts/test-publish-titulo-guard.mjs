/**
 * Guarda de publish: 409 sem gravar; confirmar_mesmo_link libera.
 * Pré: SUPABASE_URL + SUPABASE_SERVICE_KEY
 * node --env-file=../.env scripts/test-publish-titulo-guard.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildCifraSnapshot,
  hashCifraNorm,
  normalizeAcervoText,
} from '@crash-cifras/shared'

const __dirname = dirname(fileURLToPath(import.meta.url))
const acervoLibUrl = pathToFileURL(resolve(__dirname, '../lib/acervo.js')).href

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY
if (!url || !key) {
  console.error('Faltam SUPABASE_URL e SUPABASE_SERVICE_KEY')
  process.exit(1)
}
process.env.SUPABASE_URL = url
process.env.SUPABASE_SERVICE_KEY = key

const { publicarCopiaPessoalNoAcervo, registrarVersaoCuradoria } =
  await import(acervoLibUrl)

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

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

function yt(id11) {
  return `https://www.youtube.com/watch?v=${id11}`
}

function makeCifra(tom = 'C') {
  return buildCifraSnapshot({
    tomOriginal: tom,
    bpm: 70,
    intro: { lines: [] },
    secoes: [
      {
        slug: 'verso',
        nome: 'Verso',
        ordem_original: 1,
        linhas: {
          lines: [{ lyricLine: 'Guarda titulo', chords: [{ pos: 0, chord: 'C' }] }],
        },
      },
    ],
  })
}

async function main() {
  const suffix = randomUUID().slice(0, 8)
  const urlExistente = yt(`gex${suffix}xx`.slice(0, 11))
  const email = `guard-pub-${suffix}@crash.local`

  console.log('Setup…')
  const { data: createdUser, error: userErr } = await db.auth.admin.createUser({
    email,
    password: `Tmp-${randomUUID()}`,
    email_confirm: true,
  })
  if (userErr) throw userErr
  const userId = createdUser.user.id

  let ministroId
  let acervoExistenteId
  let versaoExistenteId
  let musicaId
  const cleanupMusicas = []
  const cleanupAcervos = []

  try {
    const { data: ministro, error: mErr } = await db
      .from('ministros')
      .insert({ user_id: userId, nome: `Guard ${suffix}` })
      .select('id')
      .single()
    if (mErr) throw mErr
    ministroId = ministro.id

    const tituloAcervo = `Com Muito Louvor Guard ${suffix}`
    const { data: acervo, error: aErr } = await db
      .from('acervo_musicas')
      .insert({
        titulo: tituloAcervo,
        artista: 'Cassiane',
        titulo_norm: normalizeAcervoText(tituloAcervo),
        artista_norm: normalizeAcervoText('Cassiane'),
        fonte_url: urlExistente,
        status: 'ready',
      })
      .select('*')
      .single()
    if (aErr) throw aErr
    acervoExistenteId = acervo.id
    cleanupAcervos.push(acervo.id)

    const cifraAcervo = makeCifra('Bb')
    const { data: versao, error: vErr } = await db
      .from('acervo_versoes')
      .insert({
        acervo_musica_id: acervo.id,
        cifra: cifraAcervo,
        tom_original: 'Bb',
        bpm: 70,
        hash_norm: hashCifraNorm(cifraAcervo),
        origem: 'curadoria',
        criado_por: userId,
        score: 1,
      })
      .select('id')
      .single()
    if (vErr) throw vErr
    versaoExistenteId = versao.id
    await db
      .from('acervo_musicas')
      .update({ versao_top_id: versao.id })
      .eq('id', acervo.id)

    const cifraCopia = makeCifra('E')
    const { data: musica, error: muErr } = await db
      .from('musicas')
      .insert({
        user_id: userId,
        ministro_id: ministroId,
        titulo: 'Me Ama',
        artista: 'John Dias',
        youtube_url: urlExistente,
        tom_original: 'E',
        bpm: 70,
        import_status: 'manual',
      })
      .select('*')
      .single()
    if (muErr) throw muErr
    musicaId = musica.id
    cleanupMusicas.push(musica.id)

    await db.from('secoes_musica').insert({
      musica_id: musica.id,
      slug: 'verso',
      nome: 'Verso',
      ordem_original: 1,
      linhas: cifraCopia.secoes[0].linhas,
    })

    console.log('\n(1) publish divergente sem flag → 409, nada gravado')
    let threw = null
    try {
      await publicarCopiaPessoalNoAcervo({
        musicaId,
        userId,
        youtubeUrl: urlExistente,
        cifra: cifraCopia,
        confirmarMesmoLink: false,
      })
    } catch (err) {
      threw = err
    }
    assert(threw?.status === 409, 'status 409')
    assert(threw?.code === 'ACERVO_TITULO_DIVERGENTE', 'code ACERVO_TITULO_DIVERGENTE')
    assert(threw?.requer_confirmacao === true, 'requer_confirmacao')
    assert(
      String(threw?.entrada_encontrada?.titulo || '').includes('Louvor'),
      'entrada_encontrada cita Louvor',
    )

    const { data: mApos } = await db
      .from('musicas')
      .select('acervo_versao_id')
      .eq('id', musicaId)
      .single()
    assert(mApos.acervo_versao_id == null, 'acervo_versao_id ainda null')

    const { count: versoesCount } = await db
      .from('acervo_versoes')
      .select('id', { count: 'exact', head: true })
      .eq('acervo_musica_id', acervoExistenteId)
    assert(versoesCount === 1, 'ainda só 1 versão no acervo', String(versoesCount))

    console.log('\n(2) publish com confirmar_mesmo_link → ok')
    const ok = await publicarCopiaPessoalNoAcervo({
      musicaId,
      userId,
      youtubeUrl: urlExistente,
      cifra: cifraCopia,
      confirmarMesmoLink: true,
    })
    assert(Boolean(ok.acervo_versao_id), 'publicou com versão')
    assert(ok.acervo_musica_id === acervoExistenteId, 'ligou à entrada do URL')

    console.log('\n(3) curadoria divergente sem flag → 409')
    let threwCur = null
    try {
      await registrarVersaoCuradoria({
        titulo: 'Outra Cancao Totalmente Diferente',
        artista: 'Outro Artista',
        cifra: makeCifra('G'),
        tomOriginal: 'G',
        criadoPor: userId,
        youtubeUrl: urlExistente,
        confirmarMesmoLink: false,
      })
    } catch (err) {
      threwCur = err
    }
    assert(threwCur?.code === 'ACERVO_TITULO_DIVERGENTE', 'curadoria 409')

    console.log('\n(4) publish título compatível — sem atrito')
    const urlNovo = yt(`gnw${suffix}xx`.slice(0, 11))
    const tituloOk = `Bondade Guard ${suffix}`
    const { data: musicaOk, error: okErr } = await db
      .from('musicas')
      .insert({
        user_id: userId,
        ministro_id: ministroId,
        titulo: tituloOk,
        artista: 'Isaías Saad',
        youtube_url: urlNovo,
        tom_original: 'C',
        import_status: 'manual',
      })
      .select('id')
      .single()
    if (okErr) throw okErr
    cleanupMusicas.push(musicaOk.id)
    await db.from('secoes_musica').insert({
      musica_id: musicaOk.id,
      slug: 'verso',
      nome: 'Verso',
      ordem_original: 1,
      linhas: makeCifra().secoes[0].linhas,
    })

    const pubOk = await publicarCopiaPessoalNoAcervo({
      musicaId: musicaOk.id,
      userId,
      youtubeUrl: urlNovo,
      cifra: makeCifra(),
      confirmarMesmoLink: false,
    })
    assert(Boolean(pubOk.acervo_musica_id), 'publicação nova sem confirmação')
    if (pubOk.acervo_musica_id) cleanupAcervos.push(pubOk.acervo_musica_id)
  } finally {
    console.log('\nCleanup…')
    if (cleanupMusicas.length) {
      await db.from('secoes_musica').delete().in('musica_id', cleanupMusicas)
      await db.from('musicas').delete().in('id', cleanupMusicas)
    }
    for (const id of cleanupAcervos) {
      await db.from('acervo_versoes').delete().eq('acervo_musica_id', id)
      await db.from('acervo_musicas').delete().eq('id', id)
    }
    if (ministroId) await db.from('ministros').delete().eq('id', ministroId)
    await db.auth.admin.deleteUser(userId)
  }

  console.log(`\n${passed} ok, ${failed} falhou`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
