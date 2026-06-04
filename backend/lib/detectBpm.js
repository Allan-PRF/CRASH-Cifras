import { spawn } from 'child_process'
import MusicTempo from 'music-tempo'
import { ffmpegLocation } from './ytdlp.js'

const SAMPLE_RATE = 22050
const MAX_ANALISE_SEGUNDOS = 90

/**
 * BPM inteiro válido para o app (40–240).
 * @param {unknown} value
 * @returns {number|null}
 */
export function normalizarBpm(value) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n) || n < 40 || n > 240) return null
  return n
}

/** Beatroot costuma devolver o dobro do BPM em músicas lentas. */
function corrigirBpmDobrado(bpm) {
  const n = normalizarBpm(bpm)
  if (!n) return null
  const metade = Math.round(n / 2)
  if (n > 135 && metade >= 50 && metade <= 120) return metade
  return n
}

function decodificarAudioMonoFloat32(audioPath) {
  return new Promise((resolve) => {
    if (!ffmpegLocation) {
      resolve(null)
      return
    }

    const chunks = []
    const ff = spawn(
      ffmpegLocation,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        audioPath,
        '-t',
        String(MAX_ANALISE_SEGUNDOS),
        '-ac',
        '1',
        '-ar',
        String(SAMPLE_RATE),
        '-f',
        'f32le',
        'pipe:1',
      ],
      { windowsHide: true },
    )

    ff.stdout.on('data', (chunk) => chunks.push(chunk))
    ff.on('error', () => resolve(null))
    ff.on('close', (code) => {
      if (code !== 0 || chunks.length === 0) {
        resolve(null)
        return
      }
      const buf = Buffer.concat(chunks)
      if (buf.byteLength < 4) {
        resolve(null)
        return
      }
      resolve(new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4))
    })
  })
}

/**
 * Detecta BPM com music-tempo + ffmpeg (sem dependências nativas extras).
 * @param {string} audioPath
 * @returns {Promise<number|null>}
 */
export async function detectBpmFromAudioFile(audioPath) {
  try {
    const samples = await decodificarAudioMonoFloat32(audioPath)
    if (!samples?.length || samples.length < SAMPLE_RATE * 5) {
      return null
    }

    const mt = new MusicTempo(samples, {
      maxBeatInterval: 1.5,
      minBeatInterval: 0.25,
    })
    return corrigirBpmDobrado(mt.tempo)
  } catch {
    return null
  }
}
