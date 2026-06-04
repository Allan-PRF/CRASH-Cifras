/**
 * Reimporta "O som que desperta + Ruja o Leão" (Galopar dos Cavalos)
 * sobre a música existente — testa DELETE + insert com pos.
 *
 * Rode: node scripts/reimport-galopar.mjs
 */
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import {
  createJob,
  executarPipelineYoutube,
  importarYoutubeReal,
} from '../routes/importar.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '..', '.env') })

const MUSICA_ID = 'f5c7330a-10e3-4a81-b9b7-f69c3c8de119'
const YOUTUBE_URL = 'https://www.youtube.com/watch?v=2HNH_6ikgyg'

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

console.log('=== Reimport Galopar dos Cavalos ===')
console.log('Música:', musica.titulo, '| id:', musica.id)
console.log('YouTube:', YOUTUBE_URL)

const job = await createJob(supabase, {
  userId: musica.user_id,
  youtubeUrl: YOUTUBE_URL,
})

console.log('Job criado:', job.id)
console.log('Iniciando pipeline (Whisper + Cifra Club)…\n')

const completed = await importarYoutubeReal(supabase, {
  job,
  userId: musica.user_id,
  youtubeUrl: YOUTUBE_URL,
  ministroId: musica.ministro_id,
  musicaId: MUSICA_ID,
})

console.log('\n=== Reimport concluída ===')
console.log('job.musica_id:', completed.musica_id)

const { data: secoes } = await supabase
  .from('secoes_musica')
  .select('nome, linhas')
  .eq('musica_id', MUSICA_ID)
  .order('ordem_original')
  .limit(2)

for (const s of secoes || []) {
  const line = s.linhas?.lines?.find((l) => l.chords?.length)
  console.log(`\nSeção "${s.nome}" — 1ª linha com acordes:`)
  console.log(JSON.stringify(line, null, 2))
}

process.exit(0)
