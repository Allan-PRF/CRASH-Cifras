import { Router } from 'express'
import { mkdtemp, readFile, rm, stat } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import youtubedl from 'youtube-dl-exec'
import {
  isSecaoLinhas,
  normalizeChordLine,
  parseChordLyricBlock,
  plainTextToLinhas,
  rebuildChordLineFromChords,
} from '@crash-cifras/shared/chord-schema'
import { SECAO_SLUGS, TODOS_TONS } from '@crash-cifras/shared/constants'
import { validateYoutubeUrl } from '@crash-cifras/shared/validate-youtube-url'
import { env } from '../config.js'
import { buscarCifraNoCifraClub } from '../lib/cifraClub.js'
import { detectBpmFromAudioFile } from '../lib/detectBpm.js'
import { requireAuth } from '../lib/supabase.js'
import { ytdlpOptions } from '../lib/ytdlp.js'

export const importarRouter = Router()

async function createJob(supabase, { userId, youtubeUrl }) {
  const { data, error } = await supabase
    .from('import_jobs')
    .insert({
      user_id: userId,
      youtube_url: youtubeUrl,
      status: 'pending',
      etapa: 'Recebido',
      progresso: 5,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function updateJob(supabase, jobId, updates) {
  const { error } = await supabase.from('import_jobs').update(updates).eq('id', jobId)
  if (error) throw error
}

function titleFromYoutubeUrl(url) {
  try {
    const parsed = new URL(url)
    const id = parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop()
    return id ? `Importação ${id}` : 'Música importada'
  } catch {
    return 'Música importada'
  }
}

function isValidYoutubeUrl(url) {
  return validateYoutubeUrl(url).valid
}

function formatDuration(seconds) {
  if (!seconds || Number.isNaN(Number(seconds))) return null
  const total = Number(seconds)
  const minutes = Math.floor(total / 60)
  const secs = Math.floor(total % 60)
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

const LOG_IMPORT = '[importar]'

const METADADOS_YOUTUBE_TIMEOUT_MS = 15_000

const MENSAGEM_PRECISA_NOME_MANUAL =
  'Não conseguimos ler o título do YouTube automaticamente. Digite o nome da música e o artista.'

const MENSAGEM_FALLBACK_FALHOU =
  'Não encontramos essa música automaticamente. Você pode tentar outro link ou cadastrar a cifra manualmente.'

export class ImportNeedsInputError extends Error {
  constructor(message, job) {
    super(message)
    this.name = 'ImportNeedsInputError'
    this.job = job
  }
}

export class ImportFriendlyError extends Error {
  constructor(message, job = null) {
    super(message)
    this.name = 'ImportFriendlyError'
    this.job = job
  }
}

function logImport(...args) {
  console.log(LOG_IMPORT, ...args)
}

function isYoutubeBotOrBlockError(err) {
  const msg = String(err?.message || err || '').toLowerCase()
  return (
    msg.includes('sign in to confirm') ||
    msg.includes("you're not a bot") ||
    msg.includes('not a bot') ||
    msg.includes('cookies-from-browser') ||
    msg.includes('cookies') ||
    msg.includes('bot') ||
    msg.includes('http error 403') ||
    msg.includes('unable to download')
  )
}

function metadadosManuaisValidos(titulo, artista) {
  return String(titulo || '').trim().length >= 2 && String(artista || '').trim().length >= 2
}

function buildMetadadosFromManual({ titulo, artista, youtubeUrl }) {
  const t = String(titulo).trim()
  const a = String(artista).trim()
  return {
    titulo: t,
    artista: a,
    tituloYoutube: `${t} - ${a}`,
    duracao: null,
    fonteMetadados: 'manual',
  }
}

function slugifyBusca(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Separa música e artista a partir do yt-dlp (track/artist) ou do título "A - B".
 */
function parseTituloArtistaYoutube(data) {
  const tituloYoutube = String(data.title || '').trim()
  const track = String(data.track || '').trim()
  const artistaMeta = String(
    data.artist || data.uploader || data.channel || '',
  ).trim()

  if (track && artistaMeta) {
    return { titulo: track, artista: artistaMeta, tituloYoutube }
  }

  const tituloLimpo = tituloYoutube
    .replace(/\s*[\(\[][^\)\]]*[\)\]]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const separadores = [' - ', ' – ', ' — ', ' | ']
  for (const sep of separadores) {
    const idx = tituloLimpo.indexOf(sep)
    if (idx <= 0) continue
    const parte1 = tituloLimpo.slice(0, idx).trim()
    const parte2 = tituloLimpo.slice(idx + sep.length).trim()
    if (!parte1 || !parte2) continue

    const slug1 = slugifyBusca(parte1)
    const slug2 = slugifyBusca(parte2)
    const slugArtista = slugifyBusca(artistaMeta)

    if (slugArtista && slugArtista === slug2) {
      return { titulo: parte1, artista: parte2, tituloYoutube }
    }
    if (slugArtista && slugArtista === slug1) {
      return { titulo: parte2, artista: parte1, tituloYoutube }
    }

    return { titulo: parte2, artista: parte1, tituloYoutube }
  }

  return {
    titulo: tituloYoutube || 'Música importada',
    artista: artistaMeta || 'YouTube',
    tituloYoutube,
  }
}

function normalizeSearchEntry(entry) {
  const rawId = entry.id || entry.url
  let videoId = null
  if (rawId && /^[a-zA-Z0-9_-]{11}$/.test(String(rawId))) {
    videoId = String(rawId)
  } else if (rawId) {
    const parsed = validateYoutubeUrl(
      entry.webpage_url || entry.url || String(rawId),
    )
    if (parsed.valid) videoId = parsed.videoId
  }
  const url =
    entry.webpage_url ||
    entry.url ||
    (videoId ? `https://www.youtube.com/watch?v=${videoId}` : null)
  const thumbnail =
    entry.thumbnail ||
    entry.thumbnails?.at?.(-1)?.url ||
    (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null)

  return {
    id: videoId || url,
    youtubeUrl: url,
    titulo: entry.title || 'Vídeo sem título',
    canal: entry.channel || entry.uploader || entry.creator || 'YouTube',
    duracao: formatDuration(entry.duration),
    thumbnail,
  }
}

async function buscarYoutube(query) {
  const result = await youtubedl(
    `ytsearch8:${query}`,
    ytdlpOptions({
      dumpSingleJson: true,
      skipDownload: true,
    }),
  )

  const entries = Array.isArray(result.entries) ? result.entries : [result]
  return entries
    .map(normalizeSearchEntry)
    .filter((entry) => entry.youtubeUrl && isValidYoutubeUrl(entry.youtubeUrl))
}

function parseJsonObject(text) {
  const clean = text
    .trim()
    .replace(/^```json/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim()
  return JSON.parse(clean)
}

function buildFallbackSecoes(transcricao) {
  const linhas = transcricao
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (linhas.length === 0) {
    return [
      {
        slug: 'verso',
        nome: 'Verso 1',
        ordem_original: 0,
        linhas: plainTextToLinhas('Transcrição vazia. Edite a letra manualmente.'),
      },
    ]
  }

  const chunkSize = Math.max(4, Math.ceil(linhas.length / 3))
  const nomes = ['Verso 1', 'Refrão', 'Ponte']
  const slugs = ['verso', 'refrao', 'ponte']

  return Array.from({ length: Math.ceil(linhas.length / chunkSize) })
    .map((_, index) => {
      const chunk = linhas.slice(index * chunkSize, (index + 1) * chunkSize).join('\n')
      return {
        slug: slugs[index] || 'verso',
        nome: nomes[index] || `Parte ${index + 1}`,
        ordem_original: index,
        linhas: plainTextToLinhas(chunk),
      }
    })
}

async function obterMetadadosYoutube(youtubeUrl) {
  const data = await youtubedl(
    youtubeUrl,
    ytdlpOptions({
      dumpSingleJson: true,
      skipDownload: true,
      noPlaylist: true,
    }),
  )

  const parsed = parseTituloArtistaYoutube(data)
  logImport('metadados YouTube:', {
    tituloYoutube: parsed.tituloYoutube,
    titulo: parsed.titulo,
    artista: parsed.artista,
    trackYt: data.track || null,
    artistYt: data.artist || null,
  })

  return {
    titulo: parsed.titulo || titleFromYoutubeUrl(youtubeUrl),
    artista: parsed.artista,
    tituloYoutube: parsed.tituloYoutube,
    duracao: data.duration || null,
    fonteMetadados: 'youtube',
  }
}

async function tentarMetadadosYoutubeComTimeout(youtubeUrl, timeoutMs = METADADOS_YOUTUBE_TIMEOUT_MS) {
  logImport(`metadados YouTube: tentando (timeout ${timeoutMs}ms)...`)
  try {
    const metadados = await Promise.race([
      obterMetadadosYoutube(youtubeUrl),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout metadados YouTube')), timeoutMs)
      }),
    ])
    logImport('metadados YouTube: sucesso', {
      titulo: metadados.titulo,
      artista: metadados.artista,
    })
    return { ok: true, metadados }
  } catch (err) {
    logImport('metadados YouTube: falhou —', err.message)
    return { ok: false, error: err }
  }
}

async function resolverMetadadosImportacao({ youtubeUrl, tituloManual, artistaManual }) {
  if (metadadosManuaisValidos(tituloManual, artistaManual)) {
    const metadados = buildMetadadosFromManual({
      titulo: tituloManual,
      artista: artistaManual,
      youtubeUrl,
    })
    logImport('metadados: usando nome/artista informados pelo usuário', {
      titulo: metadados.titulo,
      artista: metadados.artista,
    })
    return { ok: true, metadados }
  }

  const tentativa = await tentarMetadadosYoutubeComTimeout(youtubeUrl)
  if (tentativa.ok) {
    return { ok: true, metadados: tentativa.metadados }
  }

  logImport('metadados: precisa_nome_manual (yt-dlp bloqueado ou indisponível)')
  return { ok: false, needsInput: true }
}

async function buscarCifraClubComRetry(titulo, artista) {
  logImport('Cifra Club: buscando', { titulo, artista })

  let estruturado = await buscarCifraNoCifraClub({ titulo, artista })

  if (!estruturado?.secoes?.length) {
    logImport('Cifra Club: vazio — retry invertendo titulo/artista', {
      titulo: artista,
      artista: titulo,
    })
    estruturado = await buscarCifraNoCifraClub({
      titulo: artista,
      artista: titulo,
    })
  }

  const encontrou = Boolean(estruturado?.secoes?.length)
  logImport('Cifra Club: resultado', {
    encontrou,
    secoes: estruturado?.secoes?.length ?? 0,
    url: estruturado?.url ?? null,
    tom: estruturado?.tom ?? null,
    bpm: estruturado?.bpm ?? null,
  })

  return { estruturado, encontrou }
}

function montarEstruturadoCifraClub(estruturado, metadados) {
  const tomBrutoCc = estruturado?.tom ?? estruturado?.tom_original ?? null
  return {
    ...estruturado,
    titulo: estruturado.titulo || metadados.titulo,
    artista: estruturado.artista || metadados.artista,
    secoes: deduplicarSecoesImport(estruturado.secoes),
    ...(tomBrutoCc ? { tom: tomBrutoCc, tom_original: tomBrutoCc } : {}),
  }
}

async function executarFallbackAudioWhisperGpt(supabase, { job, youtubeUrl, ministroId, metadados }) {
  logImport('fallback áudio: iniciando (CC não encontrou a cifra)')
  const tempDir = await mkdtemp(join(tmpdir(), 'crash-cifras-'))
  const audioPath = join(tempDir, 'audio.mp3')

  try {
    await updateJob(supabase, job.id, {
      etapa: 'Baixando áudio com yt-dlp (fallback)',
      progresso: 50,
    })

    await baixarAudioYoutube(youtubeUrl, audioPath)
    logImport('fallback áudio: download concluído')

    await updateJob(supabase, job.id, {
      etapa: 'Detectando BPM do áudio',
      progresso: 58,
    })

    const bpmDetectado = await detectBpmFromAudioFile(audioPath)
    logImport('fallback áudio: BPM detectado', { bpmDetectado })

    await updateJob(supabase, job.id, {
      etapa: 'Transcrevendo com OpenAI Whisper',
      progresso: 68,
    })

    const transcricao = await transcreverComWhisper(audioPath)
    const transcricaoOk = String(transcricao || '').trim().length > 20
    logImport('fallback áudio: Whisper', {
      caracteres: String(transcricao || '').length,
      ok: transcricaoOk,
    })

    let estruturado = null

    if (!transcricaoOk) {
      logImport('fallback áudio: Whisper sem texto suficiente — seções mínimas')
    } else {
      await updateJob(supabase, job.id, {
        etapa: 'Organizando letra (Whisper) e acordes com IA',
        progresso: 80,
      })
      estruturado = await identificarSecoesComOpenAI({
        transcricao,
        metadados,
        somenteTranscricao: true,
      })
      logImport('fallback áudio: GPT retornou', {
        secoes: estruturado?.secoes?.length ?? 0,
        tom: estruturado?.tom ?? null,
        bpm: estruturado?.bpm ?? null,
      })
    }

    const bpmGpt =
      !bpmDetectado
        ? (estruturado?.bpm ?? null) ?? (await estimarBpmComOpenAI(metadados))
        : null

    const tomGpt = estruturado?.tom ?? estruturado?.tom_original ?? null

    logImport('fonte final: fallback gpt/whisper')

    return normalizarResultadoImportacao({
      estruturado,
      metadados,
      transcricao,
      youtubeUrl,
      ministroId,
      bpmCifraClub: null,
      bpmAudio: bpmDetectado,
      bpmGpt,
      tomCifraClub: null,
      tomAudio: null,
      tomGpt,
      fonteCifraClub: false,
    })
  } catch (err) {
    if (isYoutubeBotOrBlockError(err)) {
      logImport('fallback áudio: YouTube bloqueou download —', err.message)
      throw new ImportFriendlyError(MENSAGEM_FALLBACK_FALHOU)
    }
    throw err
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => null)
  }
}

async function baixarAudioYoutube(youtubeUrl, outputPath) {
  await youtubedl(
    youtubeUrl,
    ytdlpOptions({
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 5,
      output: outputPath,
      noPlaylist: true,
      addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
    }),
  )

  const info = await stat(outputPath)
  if (info.size > 24 * 1024 * 1024) {
    throw new Error('Áudio maior que o limite do Whisper. Use um vídeo mais curto.')
  }
}

async function transcreverComWhisper(audioPath) {
  if (!env.openaiKey) {
    throw new Error('Configure OPENAI_API_KEY no backend para transcrever áudio')
  }

  const audioBuffer = await readFile(audioPath)
  const form = new FormData()
  form.append('model', 'whisper-1')
  form.append('language', 'pt')
  form.append('response_format', 'verbose_json')
  form.append('file', new Blob([audioBuffer], { type: 'audio/mpeg' }), 'audio.mp3')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.openaiKey}`,
    },
    body: form,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error?.message || 'OpenAI Whisper não conseguiu transcrever o áudio')
  }

  return data.text || ''
}

async function estimarBpmComOpenAI(metadados) {
  if (!env.openaiKey) return null

  const prompt = `
Estime o BPM (batidas por minuto) da música abaixo para um app de cifras.
Use o título, artista/canal e gênero típico (louvor cristão / gospel / adoração).
Retorne apenas JSON válido, sem markdown.

Formato: {"bpm": 72}

Regras:
- "bpm" deve ser um número inteiro entre 40 e 240
- Se não souber, use null

Título: ${metadados.titulo || 'desconhecido'}
Artista/canal: ${metadados.artista || 'desconhecido'}
`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) return null

  try {
    const parsed = parseJsonObject(data.choices?.[0]?.message?.content || '')
    const raw = parsed?.bpm
    if (raw == null) return null
    const n = Math.round(Number(raw))
    return Number.isFinite(n) && n >= 1 ? n : null
  } catch {
    return null
  }
}

const SLUG_IMPORT_ALIASES = {
  segunda_parte: 'verso',
  segunda: 'verso',
  verso_2: 'verso',
  verso2: 'verso',
  bridge: 'ponte',
  pre_refrão: 'pre_refrao',
  pre_refrain: 'pre_refrao',
  chorus: 'refrao',
  refrain: 'refrao',
  verse: 'verso',
}

function normalizarSlugSecaoImport(slug) {
  const raw = String(slug || 'verso')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[\s-]+/g, '_')
  const canon = SLUG_IMPORT_ALIASES[raw] || raw
  return SECAO_SLUGS.includes(canon) ? canon : 'verso'
}

function letrasSecaoImport(secao) {
  const raw = secao.linhas_letra ?? secao.linhas_letras
  return Array.isArray(raw) ? raw : raw != null ? [raw] : []
}

function cifrasSecaoImport(secao) {
  const raw = secao.linhas_cifras ?? secao.linha_cifras ?? secao.cifras
  return Array.isArray(raw) ? raw : raw != null ? [raw] : []
}

const BEMOL_PARA_SUSTENIDO_IMPORT = {
  Cb: 'B',
  Db: 'C#',
  Eb: 'D#',
  Fb: 'E',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
  Cbm: 'Bm',
  Dbm: 'C#m',
  Ebm: 'D#m',
  Fbm: 'Em',
  Gbm: 'F#m',
  Abm: 'G#m',
  Bbm: 'A#m',
}

function normalizarTomImport(tom) {
  if (tom == null || tom === '') return null
  const candidato = String(tom).trim().replace(/\s+/g, '')
  if (TODOS_TONS.includes(candidato)) return candidato
  const enharmonic = BEMOL_PARA_SUSTENIDO_IMPORT[candidato]
  if (enharmonic && TODOS_TONS.includes(enharmonic)) return enharmonic
  const semSuffix = candidato.replace(/(major|maj|menor|minor|min)$/i, '')
  if (TODOS_TONS.includes(semSuffix)) return semSuffix
  const menor = /^([A-G](?:#|b)?)m$/i.exec(candidato)
  if (menor) {
    const fmt = `${menor[1].charAt(0).toUpperCase()}${menor[1].slice(1)}m`
    if (TODOS_TONS.includes(fmt)) return fmt
    const fromFlat = BEMOL_PARA_SUSTENIDO_IMPORT[fmt]
    if (fromFlat && TODOS_TONS.includes(fromFlat)) return fromFlat
  }
  const maior = /^([A-G](?:#|b)?)$/i.exec(candidato)
  if (maior) {
    const fmt = `${maior[1].charAt(0).toUpperCase()}${maior[1].slice(1)}`
    if (TODOS_TONS.includes(fmt)) return fmt
    const fromFlat = BEMOL_PARA_SUSTENIDO_IMPORT[fmt]
    if (fromFlat && TODOS_TONS.includes(fromFlat)) return fromFlat
  }
  return null
}

// ALINHAMENTO CIFRA CLUB - NÃO ALTERAR
/** Reconstrói chordLine a partir de `{ chord, pos }[]` (parser HTML do Cifra Club). */
function preservarLinhasCifraClub(linhas) {
  if (!isSecaoLinhas(linhas)) return linhas
  return {
    lines: linhas.lines.map((raw) => {
      const line = normalizeChordLine(raw)
      const chords =
        Array.isArray(line.chords) && line.chords.length > 0 ? line.chords : []
      const chordLine =
        chords.length > 0
          ? rebuildChordLineFromChords(chords)
          : line.chordLine
      return {
        ...line,
        chords,
        chordLine,
      }
    }),
  }
}

function secaoTemPosicoesCifraClub(secao) {
  return (
    isSecaoLinhas(secao.linhas) &&
    secao.linhas.lines.some(
      (l) => Array.isArray(l.chords) && l.chords.length > 0,
    )
  )
}

function secaoImportParaLinhas(secao, { fonteGpt = false } = {}) {
  // Cifra Club: manter pos/colunas do parser — não passar por parseChordLyricBlock
  if (secaoTemPosicoesCifraClub(secao)) {
    return preservarLinhasCifraClub(secao.linhas)
  }

  if (isSecaoLinhas(secao.linhas) && secao.linhas.lines.length > 0) {
    return secao.linhas
  }

  const letras = letrasSecaoImport(secao)
  const cifras = cifrasSecaoImport(secao)
  const temCifras = cifras.some((l) => String(l).trim())

  if (temCifras) {
    return parseChordLyricBlock(
      cifras.map((l) => String(l)).join('\n'),
      letras.map((l) => String(l)).join('\n'),
      { fonteGpt },
    )
  }

  if (letras.length > 0) {
    return plainTextToLinhas(letras.map((l) => String(l)).join('\n'))
  }

  return plainTextToLinhas('')
}

function fingerprintLinhasSecao(secao) {
  if (secao.linhas?.lines?.length) {
    const text = secao.linhas.lines
      .map((l) => String(l.lyricLine ?? l.segments?.map((s) => s.text).join('') ?? '').trim())
      .filter(Boolean)
      .join('\n')
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const text = letrasSecaoImport(secao)
    .map((l) => String(l).trim())
    .filter(Boolean)
    .join('\n')
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Remove seções com letra/acordes idênticos; mantém a primeira ocorrência na ordem. */
function deduplicarSecoesImport(secoes) {
  if (!Array.isArray(secoes)) return []
  const vistas = new Set()
  const unicas = []

  for (const secao of secoes) {
    const fp = fingerprintLinhasSecao(secao)
    if (fp && vistas.has(fp)) continue
    if (fp) vistas.add(fp)
    unicas.push(secao)
  }

  return unicas
}

async function identificarSecoesComOpenAI({ transcricao, metadados, somenteTranscricao = true }) {
  if (!env.openaiKey) return null

  const slugsPermitidos = SECAO_SLUGS.join(', ')

  const regraLetra = somenteTranscricao
    ? `
REGRA CRÍTICA — LETRA (OBRIGATÓRIA):
- Use EXCLUSIVAMENTE o texto da transcrição Whisper abaixo em "linhas_letra".
- NÃO invente letra, NÃO substitua por letra de outra música, NÃO traduza músicas famosas.
- NÃO busque na internet nem use memória de outras canções.
- Se um trecho estiver ilegível na transcrição, omita ou deixe linha vazia — nunca invente.
- Os ACORDES ("linhas_cifras") você pode inferir com base na música e na transcrição, mas a LETRA vem só do Whisper.
`
    : ''

  const prompt = `
Você organiza letras de músicas cristãs para um app de cifras (teleprompter).
A transcrição vem de áudio (Whisper) e costuma REPETIR versos e refrões várias vezes seguidas.
O músico já conhece a forma da música — ele precisa ver cada parte UMA vez só.
${regraLetra}

REGRAS OBRIGATÓRIAS:
1. DEDUPLICAR: se o mesmo bloco de texto (mesmo verso, mesmo refrão, mesma ponte) aparecer
   mais de uma vez na transcrição, inclua apenas UMA seção com esse conteúdo.
   Exemplo: Verso 1 → Refrão → Verso 1 → Refrão → Verso 1 → Refrão
   deve virar só duas seções, nesta ordem: Verso 1, depois Refrão.
2. ORDEM: preserve a sequência lógica da primeira passagem (Intro → Verso 1 → Pré-Refrão →
   Refrão → Verso 2 / Segunda Parte → Bridge → Outro), sem repetir blocos iguais.
3. NOMES (campo "nome", em português):
   - Intro
   - Verso 1, Verso 2, Verso 3… (ou "Segunda Parte" para o segundo verso, se fizer sentido)
   - Pré-Refrão
   - Refrão
   - Bridge (use slug "ponte" e nome "Bridge" ou "Ponte")
   - Outro
4. SLUGS (campo "slug", apenas estes valores): ${slugsPermitidos}
   - Segunda parte / verso repetido com letra diferente → slug "verso", nome "Verso 2" ou "Segunda Parte"
   - Bridge → slug "ponte"
5. TOM: analise título, artista, letra e harmonia provável da música. Preencha o campo "tom"
   com o tom original mais provável (ex: E, Am, G, F#m). Use apenas tons desta lista:
   ${TODOS_TONS.join(', ')}. Se não houver confiança, use null.
6. ACORDES: para cada seção, preencha "linhas_cifras" (linha de cifras) com os acordes da seção,
   um acorde por posição na linha, separados por espaços (ex: "G    D/F#    Em    C").
   "linhas_letra" deve ter o mesmo número de linhas que "linhas_cifras", com a letra correspondente.
   Baseie-se na música conhecida, menções na transcrição e progressões típicas do gênero.
   Se não souber os acordes de uma seção, use linhas vazias "" em "linhas_cifras" mas mantenha a letra.
7. BPM: se souber o andamento da música, preencha "bpm" com inteiro entre 40 e 240; senão null
   (o áudio pode já fornecer o BPM — não invente sem base).
8. Não crie seções vazias. Retorne apenas JSON válido, sem markdown.

Formato:
{
  "titulo": "string",
  "artista": "string",
  "tom": "G",
  "tom_original": "G",
  "bpm": null,
  "secoes": [
    {
      "slug": "verso",
      "nome": "Verso 1",
      "linhas_cifras": ["G    D    Em    C", "G    D    C"],
      "linhas_letra": ["Linha 1 da letra", "Linha 2 da letra"]
    }
  ]
}

Título sugerido: ${metadados.titulo}
Artista/canal sugerido: ${metadados.artista}
Transcrição:
${transcricao}
`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) return null

  try {
    return parseJsonObject(data.choices?.[0]?.message?.content || '')
  } catch {
    return null
  }
}

/** BPM mínimo garantido quando nenhuma fonte retorna valor válido. */
const BPM_PADRAO_IMPORT = 72
const BPM_IMPORT_MIN = 40
const BPM_IMPORT_MAX = 80

/**
 * BPM na importação: >80 → metade (erro de detecção); depois limita 40–80.
 * Ajuste fino fica no teleprompter.
 */
function ajustarBpmImportado(value) {
  let n = Math.round(Number(value))
  if (!Number.isFinite(n) || n < 1) return null
  if (n > BPM_IMPORT_MAX) n = Math.round(n / 2)
  if (n < BPM_IMPORT_MIN) return BPM_IMPORT_MIN
  if (n > BPM_IMPORT_MAX) return BPM_IMPORT_MAX
  return n
}

/** BPM: 1) Cifra Club  2) áudio  3) GPT  4) padrão 72 */
function resolverBpmImport({ bpmCifraClub, bpmAudio, bpmGpt }) {
  const cc = ajustarBpmImportado(bpmCifraClub)
  const audio = ajustarBpmImportado(bpmAudio)
  const gpt = ajustarBpmImportado(bpmGpt)
  const fonte = cc ? 'cifraclub' : audio ? 'audio' : gpt ? 'gpt' : 'padrao'
  const final = cc ?? audio ?? gpt ?? ajustarBpmImportado(BPM_PADRAO_IMPORT)
  console.log(`[bpm] fonte: ${fonte} | bpm: ${final}`)
  logImport('resolverBpmImport:', {
    entrada: { bpmCifraClub, bpmAudio, bpmGpt },
    fonte,
    bpmFinal: final,
  })
  return final
}

/**
 * Tom: 1) Cifra Club  2) áudio  3) GPT (sempre nesta ordem, qualquer música).
 */
function resolverTomImport({ tomCifraClub, tomAudio, tomGpt }) {
  console.log('[tom] entrada:', { tomCifraClub, tomAudio, tomGpt })

  const cc = normalizarTomImport(tomCifraClub)
  const audio = normalizarTomImport(tomAudio)
  const gpt = normalizarTomImport(tomGpt)
  const final = cc ?? audio ?? gpt ?? null

  const fonte = cc ? 'cifraclub' : audio ? 'audio' : gpt ? 'gpt' : 'nenhuma'
  console.log('[tom] vencedor:', { fonte, tomFinal: final })

  return final
}

function normalizarResultadoImportacao({
  estruturado,
  metadados,
  transcricao,
  youtubeUrl,
  ministroId,
  bpmCifraClub = null,
  bpmAudio = null,
  bpmGpt = null,
  tomCifraClub = null,
  tomAudio = null,
  tomGpt = null,
  fonteCifraClub = false,
}) {
  const secoesBrutas =
    Array.isArray(estruturado?.secoes) && estruturado.secoes.length > 0
      ? deduplicarSecoesImport(estruturado.secoes)
      : null

  const secoesFonte = secoesBrutas?.length
    ? secoesBrutas.map((secao, index) => ({
        slug: normalizarSlugSecaoImport(secao.slug),
        nome: secao.nome || `Parte ${index + 1}`,
        ordem_original: index,
        linhas: secaoImportParaLinhas(secao, { fonteGpt: !fonteCifraClub }),
      }))
    : buildFallbackSecoes(transcricao)

  const tomDetectado = resolverTomImport({
    tomCifraClub,
    tomAudio,
    tomGpt,
  })

  const bpmFinal = resolverBpmImport({
    bpmCifraClub,
    bpmAudio,
    bpmGpt,
  })

  logImport('normalizarResultadoImportacao:', {
    fonteSecoes: secoesBrutas?.length ? 'estruturado' : 'transcricao-fallback',
    tomCifraClubPassado: tomCifraClub,
    tomAudioPassado: tomAudio,
    tomGptPassado: tomGpt,
    tomFinal: tomDetectado,
    bpmFinal,
  })

  return {
    musica: {
      ministro_id: ministroId || null,
      titulo: estruturado?.titulo || metadados.titulo,
      artista: estruturado?.artista || metadados.artista,
      youtube_url: youtubeUrl,
      bpm: bpmFinal ?? BPM_PADRAO_IMPORT,
      tom_original: tomDetectado,
      import_status: 'ready',
    },
    secoes: secoesFonte,
  }
}

async function executarPipelineYoutube(
  supabase,
  { job, youtubeUrl, ministroId, tituloManual = null, artistaManual = null },
) {
  await supabase
    .from('import_jobs')
    .update({ status: 'processing', etapa: 'Lendo metadados do YouTube', progresso: 15 })
    .eq('id', job.id)

  try {
    const metaResolvido = await resolverMetadadosImportacao({
      youtubeUrl,
      tituloManual,
      artistaManual,
    })

    if (!metaResolvido.ok) {
      await updateJob(supabase, job.id, {
        status: 'needs_input',
        etapa: 'Informe nome e artista da música',
        progresso: 20,
        erro: null,
      })
      return { type: 'needs_input', message: MENSAGEM_PRECISA_NOME_MANUAL }
    }

    const metadados = metaResolvido.metadados

    await updateJob(supabase, job.id, {
      etapa: 'Buscando cifra no Cifra Club',
      progresso: 40,
    })

    const { estruturado: ccBruto, encontrou: fonteCifraClub } =
      await buscarCifraClubComRetry(metadados.titulo, metadados.artista)

    if (fonteCifraClub) {
      logImport('fonte: cifraclub — sem download de áudio')
      await updateJob(supabase, job.id, {
        etapa: 'Cifras, tom e BPM do Cifra Club',
        progresso: 85,
      })

      const estruturado = montarEstruturadoCifraClub(ccBruto, metadados)
      const bpmCifraClub = estruturado?.bpm ?? null
      const tomBrutoCc = estruturado?.tom ?? estruturado?.tom_original ?? null
      const tomCifraClub = tomBrutoCc

      logImport('--- resolução final tom/BPM (cifraclub) ---', {
        fonteCifraClub: true,
        tomCifraClub,
        bpmCifraClub,
        bpmAudio: null,
        bpmGpt: null,
      })
      logImport('importação: caminho feliz concluído — fonte cifraclub')

      const data = normalizarResultadoImportacao({
        estruturado,
        metadados,
        transcricao: null,
        youtubeUrl,
        ministroId,
        bpmCifraClub,
        bpmAudio: null,
        bpmGpt: null,
        tomCifraClub,
        tomAudio: null,
        tomGpt: null,
        fonteCifraClub: true,
      })

      return { type: 'success', data }
    }

    logImport('Cifra Club: não encontrou — iniciando fallback áudio+Whisper+GPT')

    try {
      const data = await executarFallbackAudioWhisperGpt(supabase, {
        job,
        youtubeUrl,
        ministroId,
        metadados,
      })
      return { type: 'success', data }
    } catch (err) {
      if (err instanceof ImportFriendlyError) {
        await updateJob(supabase, job.id, {
          status: 'failed',
          etapa: 'Importação não concluída',
          erro: err.message,
          progresso: 100,
        })
        return { type: 'failed', message: err.message }
      }
      throw err
    }
  } catch (err) {
    const mensagem = isYoutubeBotOrBlockError(err)
      ? MENSAGEM_FALLBACK_FALHOU
      : err.message

    await updateJob(supabase, job.id, {
      status: 'failed',
      etapa: 'Falha na importação',
      erro: mensagem,
      progresso: 100,
    }).catch(() => null)

    if (isYoutubeBotOrBlockError(err)) {
      return { type: 'failed', message: MENSAGEM_FALLBACK_FALHOU }
    }
    throw err
  }
}

async function importarYoutubeReal(
  supabase,
  { job, userId, youtubeUrl, ministroId, musicaId = null, tituloManual = null, artistaManual = null },
) {
  try {
    const pipeline = await executarPipelineYoutube(supabase, {
      job,
      youtubeUrl,
      ministroId,
      tituloManual,
      artistaManual,
    })

    if (pipeline.type === 'needs_input') {
      const { data: jobRow, error: jobErr } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('id', job.id)
        .single()
      if (jobErr) throw jobErr
      throw new ImportNeedsInputError(pipeline.message, jobRow)
    }

    if (pipeline.type === 'failed') {
      const { data: jobRow } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('id', job.id)
        .maybeSingle()
      throw new ImportFriendlyError(pipeline.message, jobRow)
    }

    const result = pipeline.data

    let musica

    if (musicaId) {
      const { data: existing, error: findErr } = await supabase
        .from('musicas')
        .select('id, ministro_id')
        .eq('id', musicaId)
        .eq('user_id', userId)
        .single()

      if (findErr) throw findErr

      const { data: updated, error: updateErr } = await supabase
        .from('musicas')
        .update({
          titulo: result.musica.titulo,
          artista: result.musica.artista,
          youtube_url: result.musica.youtube_url,
          bpm: result.musica.bpm,
          tom_original: result.musica.tom_original,
          import_status: result.musica.import_status,
          ministro_id: ministroId ?? existing.ministro_id ?? result.musica.ministro_id,
        })
        .eq('id', musicaId)
        .select()
        .single()

      if (updateErr) throw updateErr

      const { error: deleteErr } = await supabase
        .from('secoes_musica')
        .delete()
        .eq('musica_id', musicaId)

      if (deleteErr) throw deleteErr

      musica = updated
      logImport('reimportação: seções antigas removidas, musica_id:', musicaId)
    } else {
      const { data: inserted, error: musicaError } = await supabase
        .from('musicas')
        .insert({
          ...result.musica,
          user_id: userId,
        })
        .select()
        .single()

      if (musicaError) throw musicaError
      musica = inserted
    }

    if (ministroId && musica.tom_original) {
      await supabase.from('musica_ministro').upsert({
        musica_id: musica.id,
        ministro_id: ministroId,
        tom_atual: musica.tom_original,
        semitone_offset: 0,
      })
    }

    const secoes = result.secoes.map((secao) => ({
      ...secao,
      musica_id: musica.id,
    }))

    console.log(
      '[salvar] primeira linha chords:',
      JSON.stringify(secoes[0]?.linhas?.lines?.[0]?.chords),
    )

    const { error: secoesError } = await supabase.from('secoes_musica').insert(secoes)
    if (secoesError) throw secoesError

    const { data: completed, error: jobError } = await supabase
      .from('import_jobs')
      .update({
        musica_id: musica.id,
        status: 'completed',
        etapa: 'Importação real concluída',
        progresso: 100,
      })
      .eq('id', job.id)
      .select()
      .single()

    if (jobError) throw jobError

    logImport('importação concluída:', {
      musicaId: musica.id,
      titulo: musica.titulo,
      tom: musica.tom_original,
      bpm: musica.bpm,
    })

    return completed
  } catch (err) {
    throw err
  }
}

async function importarYoutubePreview(
  supabase,
  { job, youtubeUrl, ministroId, tituloManual = null, artistaManual = null },
) {
  const pipeline = await executarPipelineYoutube(supabase, {
    job,
    youtubeUrl,
    ministroId,
    tituloManual,
    artistaManual,
  })

  if (pipeline.type === 'needs_input') {
    const { data: jobRow, error: jobErr } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', job.id)
      .single()
    if (jobErr) throw jobErr
    throw new ImportNeedsInputError(pipeline.message, jobRow)
  }

  if (pipeline.type === 'failed') {
    const { data: jobRow } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', job.id)
      .maybeSingle()
    throw new ImportFriendlyError(pipeline.message, jobRow)
  }

  const preview = pipeline.data

  const { data: completed, error: jobError } = await supabase
    .from('import_jobs')
    .update({
      status: 'completed',
      etapa: 'Dados prontos para o formulário',
      progresso: 100,
    })
    .eq('id', job.id)
    .select()
    .single()

  if (jobError) throw jobError
  return { job: completed, preview }
}

importarRouter.get('/youtube/search', requireAuth, async (req, res, next) => {
  try {
    const query = String(req.query.q || '').trim()
    if (query.length < 2) {
      return res.status(400).json({ error: 'Digite pelo menos 2 caracteres para buscar' })
    }

    const results = await buscarYoutube(query)
    res.json({ results })
  } catch (err) {
    next(err)
  }
})

importarRouter.post('/youtube', requireAuth, async (req, res, next) => {
  let canonicalUrl = null
  try {
    const { youtubeUrl: rawUrl, ministroId, preview, musicaId, titulo, artista } = req.body ?? {}
    const validation = validateYoutubeUrl(rawUrl)

    if (!validation.valid) {
      return res.status(400).json({ error: validation.error || 'Link inválido' })
    }

    canonicalUrl = `https://www.youtube.com/watch?v=${validation.videoId}`
    const tituloManual = String(titulo || '').trim() || null
    const artistaManual = String(artista || '').trim() || null

    const job = await createJob(req.supabase, {
      userId: req.user.id,
      youtubeUrl: canonicalUrl,
    })

    if (preview) {
      const { job: completed, preview: previewData } = await importarYoutubePreview(
        req.supabase,
        {
          job,
          youtubeUrl: canonicalUrl,
          ministroId: ministroId || null,
          tituloManual,
          artistaManual,
        },
      )
      return res.status(201).json({ job: completed, preview: previewData })
    }

    const completed = await importarYoutubeReal(req.supabase, {
      job,
      userId: req.user.id,
      youtubeUrl: canonicalUrl,
      ministroId,
      musicaId: musicaId || null,
      tituloManual,
      artistaManual,
    })

    res.status(201).json({ job: completed })
  } catch (err) {
    if (err instanceof ImportNeedsInputError) {
      return res.status(200).json({
        precisa_nome_manual: true,
        youtubeUrl: canonicalUrl || req.body?.youtubeUrl,
        job: err.job,
        message: err.message,
      })
    }
    if (err instanceof ImportFriendlyError) {
      return res.status(422).json({
        error: err.message,
        job: err.job,
      })
    }
    next(err)
  }
})

importarRouter.get('/jobs/:id', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from('import_jobs')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single()

    if (error) throw error
    res.json({ job: data })
  } catch (err) {
    next(err)
  }
})

export { executarPipelineYoutube, importarYoutubeReal, createJob }
