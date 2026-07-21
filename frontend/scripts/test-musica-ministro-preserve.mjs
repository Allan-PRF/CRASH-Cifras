/**
 * Teste REAL no Supabase: upsert parcial de tom ↔ BPM não se apagam.
 *
 * (a) bpm_pessoal salvo → saveTomPessoal → bpm permanece
 * (b) tom_atual/semitone_offset salvos → saveBpmPessoal → tom permanece
 *
 * Uso: na raiz do monorepo, com .env (SUPABASE_URL + SUPABASE_SERVICE_KEY).
 * node --env-file=.env frontend/scripts/test-musica-ministro-preserve.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY

if (!url || !key) {
  console.error('Faltam SUPABASE_URL e SUPABASE_SERVICE_KEY no ambiente.')
  process.exit(1)
}

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

async function saveBpmPessoal(musicaId, ministroId, bpm) {
  const { error } = await db.from('musica_ministro').upsert(
    {
      musica_id: musicaId,
      ministro_id: ministroId,
      bpm_pessoal: bpm,
    },
    { onConflict: 'musica_id,ministro_id' },
  )
  if (error) throw error
}

async function saveTomPessoal(musicaId, ministroId, tomAtual, semitoneOffset) {
  const { error } = await db.from('musica_ministro').upsert(
    {
      musica_id: musicaId,
      ministro_id: ministroId,
      tom_atual: tomAtual,
      semitone_offset: semitoneOffset,
    },
    { onConflict: 'musica_id,ministro_id' },
  )
  if (error) throw error
}

async function readRow(musicaId, ministroId) {
  const { data, error } = await db
    .from('musica_ministro')
    .select('tom_atual, semitone_offset, bpm_pessoal')
    .eq('musica_id', musicaId)
    .eq('ministro_id', ministroId)
    .maybeSingle()
  if (error) throw error
  return data
}

async function main() {
  console.log('Setup: usuário + ministro + música de teste…')

  const suffix = randomUUID().slice(0, 8)
  const email = `preserve-test-${suffix}@crash.local`

  const { data: createdUser, error: userErr } = await db.auth.admin.createUser({
    email,
    password: `Tmp-${randomUUID()}`,
    email_confirm: true,
  })
  if (userErr) throw userErr
  const userId = createdUser.user.id

  let musicaId
  let ministroId

  try {
    const { data: ministro, error: mErr } = await db
      .from('ministros')
      .insert({ user_id: userId, nome: `Test Preserve ${suffix}` })
      .select('id')
      .single()
    if (mErr) throw mErr
    ministroId = ministro.id

    const { data: musica, error: songErr } = await db
      .from('musicas')
      .insert({
        user_id: userId,
        ministro_id: ministroId,
        titulo: `Preserve Tom/BPM ${suffix}`,
        tom_original: 'E',
        bpm: 72,
        import_status: 'manual',
      })
      .select('id')
      .single()
    if (songErr) throw songErr
    musicaId = musica.id

    console.log('\n(a) BPM salvo → salvar tom → BPM permanece')
    await saveBpmPessoal(musicaId, ministroId, 96)
    let row = await readRow(musicaId, ministroId)
    assert(row?.bpm_pessoal === 96, `bpm_pessoal inicial = 96`, String(row?.bpm_pessoal))

    await saveTomPessoal(musicaId, ministroId, 'G', 3)
    row = await readRow(musicaId, ministroId)
    assert(row?.tom_atual === 'G', `tom_atual = G`, String(row?.tom_atual))
    assert(row?.semitone_offset === 3, `semitone_offset = 3`, String(row?.semitone_offset))
    assert(
      row?.bpm_pessoal === 96,
      'bpm_pessoal PERMANECE 96 após saveTomPessoal',
      String(row?.bpm_pessoal),
    )

    console.log('\n(b) Tom salvo → salvar BPM → tom permanece')
    await saveBpmPessoal(musicaId, ministroId, 110)
    row = await readRow(musicaId, ministroId)
    assert(row?.bpm_pessoal === 110, `bpm_pessoal = 110`, String(row?.bpm_pessoal))
    assert(row?.tom_atual === 'G', 'tom_atual PERMANECE G após saveBpmPessoal', String(row?.tom_atual))
    assert(
      row?.semitone_offset === 3,
      'semitone_offset PERMANECE 3 após saveBpmPessoal',
      String(row?.semitone_offset),
    )
  } finally {
    console.log('\nCleanup…')
    if (musicaId && ministroId) {
      await db
        .from('musica_ministro')
        .delete()
        .eq('musica_id', musicaId)
        .eq('ministro_id', ministroId)
    }
    if (musicaId) await db.from('musicas').delete().eq('id', musicaId)
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
