/**
 * Reimporta "Me Leva pra Casa" (Israel Subira / Isra) — testa alinhamento CC.
 * Rode: node scripts/reimport-me-leva.mjs
 */
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createJob, importarYoutubeReal } from '../routes/importar.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '..', '.env') })

const MUSICA_ID = 'ea67ea46-b4ca-4572-a171-21d9f115fb55'
const YOUTUBE_URL = 'https://www.youtube.com/watch?v=80SJ8XHqKqM'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
)

const { data: musica, error: mErr } = await supabase
  .from('musicas')
  .select('id, titulo, user_id, ministro_id')
  .eq('id', MUSICA_ID)
  .single()

if (mErr || !musica) {
  console.error('Música não encontrada:', mErr?.message)
  process.exit(1)
}

console.log('=== Reimport Me Leva pra Casa ===')
console.log('Música:', musica.titulo, '| id:', musica.id)

const job = await createJob(supabase, {
  userId: musica.user_id,
  youtubeUrl: YOUTUBE_URL,
})

console.log('Job:', job.id, '— pipeline iniciando…\n')

await importarYoutubeReal(supabase, {
  job,
  userId: musica.user_id,
  youtubeUrl: YOUTUBE_URL,
  ministroId: musica.ministro_id,
  musicaId: MUSICA_ID,
})

const { data: secoes } = await supabase
  .from('secoes_musica')
  .select('nome, linhas')
  .eq('musica_id', MUSICA_ID)
  .order('ordem_original')

const parte = secoes?.find((s) => /primeira/i.test(s.nome))
const linha = parte?.linhas?.lines?.find((l) => l.chords?.length >= 2)
console.log('\n=== Amostra Primeira Parte ===')
console.log(JSON.stringify(linha, null, 2))

const colada = linha?.chordLine && !/\s{2,}/.test(linha.chordLine) && (linha.chords?.length ?? 0) > 2
console.log('\nchordLine colada (bug GDEmC)?', colada ? 'SIM — falhou' : 'não')
process.exit(colada ? 1 : 0)
