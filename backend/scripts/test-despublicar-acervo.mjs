/**
 * Teste REAL: soft-unpublish do acervo.
 *
 * Cobre:
 * 1) despublicar some da busca publica; republicar volta
 * 2) 409 ACERVO_FONTE_DESPUBLICADA ao publicar no mesmo link sem reativar
 * 3) reativar_despublicada anexa versao e republica
 * 4) copia pessoal (musicas + secoes) intacta apos despublicar — prova por hash
 * 5) auditoria despublicado_por/em e republicado_por/em
 *
 * Pre-requisito: migration 20260723200000_acervo_publicado.sql aplicada.
 *
 * Uso (raiz do monorepo):
 *   node --env-file=.env backend/scripts/test-despublicar-acervo.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildCifraSnapshot,
  hashCifraNorm,
  hashSecoesNorm,
} from '@crash-cifras/shared'

const __dirname = dirname(fileURLToPath(import.meta.url))
const acervoLibUrl = pathToFileURL(resolve(__dirname, '../lib/acervo.js')).href
const buscaLibUrl = pathToFileURL(resolve(__dirname, '../lib/acervoBusca.js')).href

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY

if (!url || !key) {
  console.error('Faltam SUPABASE_URL e SUPABASE_SERVICE_KEY no ambiente.')
  process.exit(1)
}

process.env.SUPABASE_URL = url
process.env.SUPABASE_SERVICE_KEY = key
if (!process.env.VITE_SUPABASE_URL) process.env.VITE_SUPABASE_URL = url

const {
  despublicarAcervoMusica,
  republicarAcervoMusica,
  registrarVersaoCuradoria,
} = await import(acervoLibUrl)
const { buscarAcervoReady, buscarItemAcervoReady, buscarAcervoAdmin } =
  await import(buscaLibUrl)

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

function makeCifra(tom = 'E', lyric = 'linha de teste') {
  return buildCifraSnapshot({
    tomOriginal: tom,
    bpm: 80,
    intro: { lines: [] },
    secoes: [
      {
        slug: 'verso',
        nome: 'Verso',
        ordem_original: 1,
        linhas: {
          lines: [{ chords: [], lyric }],
        },
      },
    ],
  })
}

async function snapshotCopia(musicaId) {
  const { data: musica, error: mErr } = await db
    .from('musicas')
    .select('id, titulo, artista, youtube_url, acervo_versao_id, tom_original, bpm, intro')
    .eq('id', musicaId)
    .single()
  if (mErr) throw mErr

  const { data: secoes, error: sErr } = await db
    .from('secoes_musica')
    .select('slug, nome, ordem_original, linhas')
    .eq('musica_id', musicaId)
    .order('ordem_original', { ascending: true })
  if (sErr) throw sErr

  const cifra = buildCifraSnapshot({
    tomOriginal: musica.tom_original,
    bpm: musica.bpm,
    intro: musica.intro || { lines: [] },
    secoes: secoes || [],
  })

  return {
    musica,
    secoes,
    hash_secoes: hashSecoesNorm(secoes || []),
    hash_cifra: hashCifraNorm(cifra),
  }
}

const suffix = randomUUID().slice(0, 8)
const fonteUrl = yt(`dp${suffix}xx`.slice(0, 11))
const titulo = `Teste Despublicar ${suffix}`
const artista = 'QA SoftUnpublish'

const cleanupAcervos = []
const cleanupMusicas = []
let userId = null
let ministroId = null

try {
  const { error: migErr } = await db
    .from('acervo_musicas')
    .select('id, publicado, despublicado_por, despublicado_em, republicado_por, republicado_em')
    .limit(1)
  if (migErr) {
    console.error(
      '\nMigration NÃO aplicada. Rode no Supabase SQL Editor:\n' +
        '  supabase/migrations/20260723200000_acervo_publicado.sql\n',
    )
    console.error(migErr.message)
    process.exit(1)
  }

  console.log('\n(0) usuário temporário')
  const email = `desp-${suffix}@crash-test.local`
  const { data: createdUser, error: userErr } = await db.auth.admin.createUser({
    email,
    password: `Tmp-${randomUUID()}`,
    email_confirm: true,
  })
  if (userErr) throw userErr
  userId = createdUser.user.id

  const { data: ministro, error: minErr } = await db
    .from('ministros')
    .insert({ user_id: userId, nome: `Desp Test ${suffix}` })
    .select('id')
    .single()
  if (minErr) throw minErr
  ministroId = ministro.id

  console.log('\n(1) criar entrada ready + cópia pessoal')
  const cifraDefeito = makeCifra('E', 'cifra defeituosa original')
  const pub = await registrarVersaoCuradoria({
    titulo,
    artista,
    cifra: cifraDefeito,
    tomOriginal: 'E',
    bpm: 80,
    criadoPor: userId,
    youtubeUrl: fonteUrl,
  })
  cleanupAcervos.push(pub.acervoMusica.id)

  const { data: musica, error: mInsErr } = await db
    .from('musicas')
    .insert({
      user_id: userId,
      ministro_id: ministroId,
      titulo,
      artista,
      youtube_url: fonteUrl,
      tom_original: 'E',
      bpm: 80,
      acervo_versao_id: pub.versao.id,
      import_status: 'ready',
      intro: { lines: [] },
    })
    .select('id')
    .single()
  if (mInsErr) throw mInsErr
  cleanupMusicas.push(musica.id)

  const { error: secErr } = await db.from('secoes_musica').insert({
    musica_id: musica.id,
    slug: 'verso',
    nome: 'Verso',
    ordem_original: 1,
    linhas: cifraDefeito.secoes[0].linhas,
  })
  if (secErr) throw secErr

  const antes = await snapshotCopia(musica.id)
  assert(Boolean(antes.hash_secoes), 'cópia tem hash de seções')
  assert(Boolean(antes.hash_cifra), 'cópia tem hash de cifra')

  console.log('\n(2) despublicar — some do catálogo; auditoria')
  const desp = await despublicarAcervoMusica({
    acervoMusicaId: pub.acervoMusica.id,
    userId,
  })
  assert(desp.alterado === true, 'despublicar alterou')
  assert(desp.musica.publicado === false, 'publicado=false')
  assert(desp.musica.despublicado_por === userId, 'despublicado_por gravado')
  assert(Boolean(desp.musica.despublicado_em), 'despublicado_em gravado')

  const buscaPublica = await buscarAcervoReady({ q: titulo, limit: 20 }, { db })
  assert(
    !buscaPublica.resultados.some((r) => r.id === pub.acervoMusica.id),
    'busca pública NÃO encontra despublicada',
  )

  let preview404 = false
  try {
    await buscarItemAcervoReady(pub.acervoMusica.id, { db })
  } catch (err) {
    preview404 = err.status === 404
  }
  assert(preview404, 'preview/atalho por id retorna 404')

  const buscaAdmin = await buscarAcervoAdmin({ q: titulo, limit: 20 }, { db })
  assert(
    buscaAdmin.resultados.some(
      (r) => r.id === pub.acervoMusica.id && r.publicado === false,
    ),
    'busca admin encontra despublicada',
  )

  console.log('\n(3) PROVA: cópia pessoal intacta após despublicar')
  const depois = await snapshotCopia(musica.id)
  assert(depois.musica.id === antes.musica.id, 'mesma música na pasta')
  assert(depois.musica.titulo === antes.musica.titulo, 'título da cópia intacto')
  assert(
    depois.musica.acervo_versao_id === antes.musica.acervo_versao_id,
    'acervo_versao_id intacto',
  )
  assert(depois.hash_secoes === antes.hash_secoes, 'hash secoes_musica intacto')
  assert(depois.hash_cifra === antes.hash_cifra, 'hash cifra da cópia intacto')
  assert(
    JSON.stringify(depois.secoes) === JSON.stringify(antes.secoes),
    'linhas das seções byte-a-byte iguais',
  )

  console.log('\n(4) publish mesmo link sem reativar → 409 ACERVO_FONTE_DESPUBLICADA')
  let code409 = null
  let saidas = null
  try {
    await registrarVersaoCuradoria({
      titulo: `${titulo} corrigida`,
      artista,
      cifra: makeCifra('G', 'cifra corrigida'),
      tomOriginal: 'G',
      bpm: 82,
      criadoPor: userId,
      youtubeUrl: fonteUrl,
    })
  } catch (err) {
    code409 = err.code
    saidas = err.saidas
  }
  assert(code409 === 'ACERVO_FONTE_DESPUBLICADA', 'código 409 correto')
  assert(
    saidas?.recomendada === 'reativar_com_nova_versao',
    'saída recomendada clara',
  )

  console.log('\n(5) reativar com nova versão')
  const reativ = await registrarVersaoCuradoria({
    titulo: `${titulo} corrigida`,
    artista,
    cifra: makeCifra('G', 'cifra corrigida'),
    tomOriginal: 'G',
    bpm: 82,
    criadoPor: userId,
    youtubeUrl: fonteUrl,
    reativarDespublicada: true,
    confirmarMesmoLink: true,
  })
  assert(reativ.reativada === true, 'flag reativada')
  assert(reativ.acervoMusica.id === pub.acervoMusica.id, 'mesma entrada')

  const { data: rowApos, error: rowErr } = await db
    .from('acervo_musicas')
    .select('publicado, republicado_por, republicado_em, despublicado_em')
    .eq('id', pub.acervoMusica.id)
    .single()
  if (rowErr) throw rowErr
  assert(rowApos.publicado === true, 'publicado=true após reativar')
  assert(rowApos.republicado_por === userId, 'republicado_por gravado')
  assert(Boolean(rowApos.republicado_em), 'republicado_em gravado')
  assert(Boolean(rowApos.despublicado_em), 'histórico despublicado_em preservado')

  const buscaVoltou = await buscarAcervoReady({ q: titulo, limit: 20 }, { db })
  assert(
    buscaVoltou.resultados.some((r) => r.id === pub.acervoMusica.id),
    'busca pública encontra após republicar',
  )

  console.log('\n(6) despublicar de novo + republicar via endpoint dedicado')
  await despublicarAcervoMusica({
    acervoMusicaId: pub.acervoMusica.id,
    userId,
  })
  const rep = await republicarAcervoMusica({
    acervoMusicaId: pub.acervoMusica.id,
    userId,
  })
  assert(rep.alterado === true, 'republicar alterou')
  assert(rep.musica.publicado === true, 'publicado após republicar endpoint')
  assert(rep.musica.republicado_por === userId, 'auditoria republicado_por')

  const depois2 = await snapshotCopia(musica.id)
  assert(
    depois2.hash_secoes === antes.hash_secoes,
    'cópia ainda intacta após 2º ciclo despublicar/republicar',
  )
} catch (err) {
  failed++
  console.error('\nERRO FATAL:', err?.message || err)
  if (err?.stack) console.error(err.stack)
} finally {
  console.log('\n(cleanup)')
  for (const id of cleanupMusicas) {
    await db.from('secoes_musica').delete().eq('musica_id', id)
    await db.from('musicas').delete().eq('id', id)
  }
  for (const id of cleanupAcervos) {
    await db.from('acervo_versoes').delete().eq('acervo_musica_id', id)
    await db.from('acervo_musicas').delete().eq('id', id)
  }
  if (ministroId) {
    await db.from('ministros').delete().eq('id', ministroId)
  }
  if (userId) {
    await db.auth.admin.deleteUser(userId)
  }
}

console.log(`\nResultado: ${passed} ok, ${failed} falha(s)`)
process.exit(failed ? 1 : 0)
