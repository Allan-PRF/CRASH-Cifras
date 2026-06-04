/**
 * Diagnóstico: intro e seções de "Era Eu" (Gaby / Sebastian).
 * Uso: node backend/scripts/probe-era-eu-intro.mjs
 */
import { getSupabaseAdmin } from '../lib/supabase.js'

const supabase = getSupabaseAdmin()

async function main() {
  const { data: ministros } = await supabase
    .from('ministros')
    .select('id, nome')
    .ilike('nome', '%gaby%')

  const { data: ministrosSeb } = await supabase
    .from('ministros')
    .select('id, nome')
    .ilike('nome', '%sebastian%')

  console.log('Ministros Gaby:', ministros)
  console.log('Ministros Sebastian:', ministrosSeb)

  for (const m of ministros || []) {
    const { data: musicas } = await supabase
      .from('musicas')
      .select('id, titulo, artista, tom_original, bpm, intro')
      .eq('ministro_id', m.id)
      .ilike('titulo', '%era eu%')

    for (const musica of musicas || []) {
      const { data: secoes } = await supabase
        .from('secoes_musica')
        .select('slug, nome, ordem_original, linhas')
        .eq('musica_id', musica.id)
        .order('ordem_original')

      console.log('\n---', musica.titulo, musica.id, 'ministro', m.nome, '---')
      console.log('tom:', musica.tom_original, 'bpm:', musica.bpm, 'artista:', musica.artista)
      console.log('intro card:', musica.intro)
      console.log(
        'seções:',
        secoes?.length,
        secoes?.map((s) => s.slug),
      )
      const introSec = secoes?.find((s) => s.slug === 'intro')
      if (introSec) {
        const lines = introSec.linhas?.lines?.length ?? 0
        console.log('seção intro linhas:', lines)
      }
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
