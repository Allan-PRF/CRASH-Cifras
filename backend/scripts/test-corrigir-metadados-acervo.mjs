/**
 * Teste REAL no Supabase: corrigir metadados do acervo (fonte_url / titulo / artista).
 *
 * Cobre:
 * - propagação de youtube_url só onde == link antigo (diferente/null intactos)
 * - cifra das versões e das cópias intacta (hashes)
 * - novo URL de outra entrada → 409 e nada gravado
 * - titulo/artista atualizam *_norm e busca encontra o nome novo
 *
 * Pré-requisito: migration 20260723120000_acervo_metadados_correcao.sql aplicada.
 *
 * Uso (raiz do monorepo):
 *   node --env-file=.env backend/scripts/test-corrigir-metadados-acervo.mjs
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
  normalizeAcervoText,
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

// Garante que getSupabaseAdmin() no lib encontra as envs.
process.env.SUPABASE_URL = url
process.env.SUPABASE_SERVICE_KEY = key
if (!process.env.VITE_SUPABASE_URL) process.env.VITE_SUPABASE_URL = url

const {
  corrigirMetadadosAcervoMusica,
  impactoMetadadosAcervoMusica,
} = await import(acervoLibUrl)
const { buscarAcervoReady, canonicalizarYoutubeUrl } = await import(buscaLibUrl)

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

function makeCifra(tom = 'E') {
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
          lines: [
            {
              lyricLine: 'Linha meta teste',
              chords: [{ pos: 0, chord: 'E' }, { pos: 8, chord: 'A' }],
            },
          ],
        },
      },
    ],
  })
}

async function assertMigrationAplicada() {
  const { error } = await db
    .from('acervo_musicas')
    .select('id, metadados_corrigido_por, metadados_corrigido_em, metadados_corrigido_antes')
    .limit(1)
  if (error) {
    console.error(
      '\nMigration de auditoria NÃO aplicada. Rode no Supabase SQL Editor:\n' +
        '  supabase/migrations/20260723120000_acervo_metadados_correcao.sql\n',
    )
    console.error(error.message)
    process.exit(1)
  }
}

async function main() {
  await assertMigrationAplicada()

  const suffix = randomUUID().slice(0, 8)
  const email = `meta-acervo-${suffix}@crash.local`
  const urlAntigo = yt(`old${suffix}xx`.slice(0, 11))
  const urlNovo = yt(`new${suffix}xx`.slice(0, 11))
  const urlOutra = yt(`oth${suffix}xx`.slice(0, 11))
  const urlCustom = yt(`cus${suffix}xx`.slice(0, 11))

  console.log('Setup: usuário + entradas + cópias de teste…')

  const { data: createdUser, error: userErr } = await db.auth.admin.createUser({
    email,
    password: `Tmp-${randomUUID()}`,
    email_confirm: true,
  })
  if (userErr) throw userErr
  const userId = createdUser.user.id

  let ministroId
  let acervoA
  let acervoB
  let versaoA
  let copiaAntiga
  let copiaCustom
  let copiaNull
  const cleanupMusicas = []
  const cleanupAcervos = []

  try {
    const { data: ministro, error: mErr } = await db
      .from('ministros')
      .insert({ user_id: userId, nome: `Meta Test ${suffix}` })
      .select('id')
      .single()
    if (mErr) throw mErr
    ministroId = ministro.id

    const cifraA = makeCifra('E')
    const hashA = hashCifraNorm(cifraA)
    const tituloA = `MetaCorrigir Alpha ${suffix}`

    const { data: aMusica, error: aErr } = await db
      .from('acervo_musicas')
      .insert({
        titulo: tituloA,
        artista: 'Artista Alpha',
        titulo_norm: normalizeAcervoText(tituloA),
        artista_norm: normalizeAcervoText('Artista Alpha'),
        fonte_url: urlAntigo,
        status: 'ready',
      })
      .select('*')
      .single()
    if (aErr) throw aErr
    acervoA = aMusica
    cleanupAcervos.push(acervoA.id)

    const { data: vA, error: vAErr } = await db
      .from('acervo_versoes')
      .insert({
        acervo_musica_id: acervoA.id,
        cifra: cifraA,
        tom_original: 'E',
        bpm: 80,
        hash_norm: hashA,
        origem: 'curadoria',
        criado_por: userId,
        score: 1,
      })
      .select('*')
      .single()
    if (vAErr) throw vAErr
    versaoA = vA

    await db
      .from('acervo_musicas')
      .update({ versao_top_id: versaoA.id })
      .eq('id', acervoA.id)

    const tituloB = `MetaCorrigir Beta ${suffix}`
    const { data: bMusica, error: bErr } = await db
      .from('acervo_musicas')
      .insert({
        titulo: tituloB,
        artista: 'Artista Beta',
        titulo_norm: normalizeAcervoText(tituloB),
        artista_norm: normalizeAcervoText('Artista Beta'),
        fonte_url: urlOutra,
        status: 'ready',
      })
      .select('*')
      .single()
    if (bErr) throw bErr
    acervoB = bMusica
    cleanupAcervos.push(acervoB.id)

    const cifraB = makeCifra('G')
    const { data: vB, error: vBErr } = await db
      .from('acervo_versoes')
      .insert({
        acervo_musica_id: acervoB.id,
        cifra: cifraB,
        tom_original: 'G',
        bpm: 90,
        hash_norm: hashCifraNorm(cifraB),
        origem: 'curadoria',
        criado_por: userId,
        score: 1,
      })
      .select('id')
      .single()
    if (vBErr) throw vBErr
    await db
      .from('acervo_musicas')
      .update({ versao_top_id: vB.id })
      .eq('id', acervoB.id)

    async function criarCopia({ titulo, youtubeUrl }) {
      const { data: musica, error } = await db
        .from('musicas')
        .insert({
          user_id: userId,
          ministro_id: ministroId,
          titulo,
          artista: 'Copia',
          youtube_url: youtubeUrl,
          tom_original: 'E',
          bpm: 80,
          acervo_versao_id: versaoA.id,
          import_status: 'ready',
        })
        .select('*')
        .single()
      if (error) throw error
      cleanupMusicas.push(musica.id)

      const { error: sErr } = await db.from('secoes_musica').insert({
        musica_id: musica.id,
        slug: 'verso',
        nome: 'Verso',
        ordem_original: 1,
        linhas: cifraA.secoes[0].linhas,
      })
      if (sErr) throw sErr
      return musica
    }

    copiaAntiga = await criarCopia({
      titulo: `Copia antiga ${suffix}`,
      youtubeUrl: urlAntigo,
    })
    copiaCustom = await criarCopia({
      titulo: `Copia custom ${suffix}`,
      youtubeUrl: urlCustom,
    })
    copiaNull = await criarCopia({
      titulo: `Copia null ${suffix}`,
      youtubeUrl: null,
    })

    const hashVersaoAntes = hashSecoesNorm(cifraA)
    const hashNormVersaoAntes = versaoA.hash_norm

    // --- Impacto ---
    console.log('\n(0) GET impacto — elegíveis e conflito')
    const impactoOk = await impactoMetadadosAcervoMusica({
      acervoMusicaId: acervoA.id,
      fonteUrlNova: urlNovo,
    })
    assert(impactoOk.copias_ligadas === 3, 'copias_ligadas = 3', String(impactoOk.copias_ligadas))
    assert(
      impactoOk.elegiveis_propagacao === 1,
      'elegiveis_propagacao = 1 (só link antigo)',
      String(impactoOk.elegiveis_propagacao),
    )
    assert(!impactoOk.conflito, 'sem conflito para URL livre')

    const impactoConflito = await impactoMetadadosAcervoMusica({
      acervoMusicaId: acervoA.id,
      fonteUrlNova: urlOutra,
    })
    assert(Boolean(impactoConflito.conflito), 'conflito detectado no preview')
    assert(
      impactoConflito.conflito?.id === acervoB.id,
      'conflito aponta para entrada B',
      String(impactoConflito.conflito?.id),
    )
    assert(
      String(impactoConflito.conflito?.rotulo || '').includes('Beta'),
      'rotulo do conflito inclui título/artista',
      String(impactoConflito.conflito?.rotulo),
    )

    // --- 409: nada gravado ---
    console.log('\n(1) novo URL de outra entrada → 409 e nada gravado')
    const fonteAntes409 = acervoA.fonte_url
    let threw = null
    try {
      await corrigirMetadadosAcervoMusica({
        acervoMusicaId: acervoA.id,
        fonteUrl: urlOutra,
        propagarYoutube: true,
        userId,
      })
    } catch (err) {
      threw = err
    }
    assert(threw?.status === 409, 'status 409', String(threw?.status))
    assert(threw?.code === 'FONTE_URL_EM_USO', 'code FONTE_URL_EM_USO')
    assert(
      String(threw?.message || '').includes('Beta'),
      'mensagem 409 cita a entrada em uso',
      String(threw?.message),
    )

    const { data: aApos409 } = await db
      .from('acervo_musicas')
      .select('fonte_url, titulo, metadados_corrigido_em')
      .eq('id', acervoA.id)
      .single()
    assert(aApos409.fonte_url === fonteAntes409, 'fonte_url NÃO mudou no 409')
    assert(aApos409.metadados_corrigido_em == null, 'auditoria NÃO gravada no 409')

    const { data: ytApos409 } = await db
      .from('musicas')
      .select('id, youtube_url')
      .in('id', [copiaAntiga.id, copiaCustom.id, copiaNull.id])
    const map409 = Object.fromEntries(ytApos409.map((r) => [r.id, r.youtube_url]))
    assert(map409[copiaAntiga.id] === urlAntigo, 'cópia antiga intacta no 409')
    assert(map409[copiaCustom.id] === urlCustom, 'cópia custom intacta no 409')
    assert(map409[copiaNull.id] == null, 'cópia null intacta no 409')

    // --- Correção com propagação ---
    console.log('\n(2) corrigir fonte_url com propagação')
    const tituloNovo = `MetaCorrigir Alpha Renomeada ${suffix}`
    const result = await corrigirMetadadosAcervoMusica({
      acervoMusicaId: acervoA.id,
      fonteUrl: urlNovo,
      titulo: tituloNovo,
      artista: 'Artista Alpha Novo',
      propagarYoutube: true,
      userId,
    })
    assert(result.alterado === true, 'alterado = true')
    assert(result.prova?.cifra_intacta === true, 'prova.cifra_intacta = true')
    assert(
      result.propagacao_youtube?.atualizadas === 1,
      '1 cópia atualizada',
      String(result.propagacao_youtube?.atualizadas),
    )
    assert(
      result.musica.fonte_url === canonicalizarYoutubeUrl(urlNovo),
      'fonte_url canônico novo',
    )
    assert(
      result.musica.titulo_norm === normalizeAcervoText(tituloNovo),
      'titulo_norm atualizado',
    )
    assert(
      result.musica.artista_norm === normalizeAcervoText('Artista Alpha Novo'),
      'artista_norm atualizado',
    )
    assert(result.musica.metadados_corrigido_por === userId, 'auditoria por')
    assert(Boolean(result.musica.metadados_corrigido_em), 'auditoria em')
    assert(
      result.musica.metadados_corrigido_antes?.fonte_url === urlAntigo,
      'snapshot antes com fonte antiga',
    )

    const { data: ytApos } = await db
      .from('musicas')
      .select('id, youtube_url')
      .in('id', [copiaAntiga.id, copiaCustom.id, copiaNull.id])
    const mapYt = Object.fromEntries(ytApos.map((r) => [r.id, r.youtube_url]))
    assert(
      mapYt[copiaAntiga.id] === canonicalizarYoutubeUrl(urlNovo),
      'cópia com link ANTIGO → novo',
    )
    assert(mapYt[copiaCustom.id] === urlCustom, 'cópia com link diferente NÃO tocada')
    assert(mapYt[copiaNull.id] == null, 'cópia com null NÃO tocada')

    // --- Hashes intactos ---
    console.log('\n(3) cifra das versões e cópias intacta')
    const { data: versaoDepois } = await db
      .from('acervo_versoes')
      .select('id, hash_norm, cifra')
      .eq('id', versaoA.id)
      .single()
    assert(
      versaoDepois.hash_norm === hashNormVersaoAntes,
      'hash_norm da versão inalterado',
    )
    assert(
      hashSecoesNorm(versaoDepois.cifra) === hashVersaoAntes,
      'hash_secoes da versão inalterado',
    )
    assert(
      result.prova.versoes.every((v) => v.inalterada),
      'prova: todas as versões inalteradas',
    )
    assert(
      result.prova.copias.every((c) => c.inalterada),
      'prova: todas as cópias inalteradas (hash)',
    )
    assert(
      result.prova.escreveu_em_acervo_versoes_cifra === false,
      'prova: não escreveu em acervo_versoes.cifra',
    )
    assert(
      result.prova.escreveu_em_secoes === false,
      'prova: não escreveu em secoes',
    )

    for (const copiaId of [copiaAntiga.id, copiaCustom.id, copiaNull.id]) {
      const { data: musicaRow } = await db
        .from('musicas')
        .select('id, tom_original, bpm')
        .eq('id', copiaId)
        .single()
      const { data: secoes } = await db
        .from('secoes_musica')
        .select('slug, nome, ordem_original, linhas')
        .eq('musica_id', copiaId)
        .order('ordem_original', { ascending: true })
      const cifraCopia = buildCifraSnapshot({
        tomOriginal: musicaRow.tom_original,
        bpm: musicaRow.bpm,
        intro: { lines: [] },
        secoes: (secoes || []).map((s) => ({
          slug: s.slug,
          nome: s.nome,
          ordem_original: s.ordem_original,
          linhas: s.linhas,
        })),
      })
      assert(
        hashSecoesNorm(cifraCopia) === hashVersaoAntes,
        `hash_secoes da cópia ${copiaId.slice(0, 8)} inalterado`,
      )
    }

    // --- Busca pelo nome novo ---
    console.log('\n(4) busca encontra pelo título novo')
    const busca = await buscarAcervoReady({ q: `Renomeada ${suffix}`, limit: 10 })
    const hit = (busca.resultados || []).find((r) => r.id === acervoA.id)
    assert(Boolean(hit), 'busca ready encontra entrada renomeada')
    assert(hit?.titulo === tituloNovo, 'título na busca = novo')
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
