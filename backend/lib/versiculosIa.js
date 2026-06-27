import {
  buildVersiculosIaPrompt,
  resumirLetraDasSecoes,
} from '@crash-cifras/shared'
import { env } from '../config.js'

/** Modelo Claude para versículos bíblicos — Haiku (econômico). */
export const VERSICULOS_CLAUDE_MODEL = 'claude-haiku-4-5-20251001'

const ANTHROPIC_API_VERSION = '2023-06-01'

function parseJsonObject(text) {
  const trimmed = String(text || '').trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fenced ? fenced[1].trim() : trimmed
  return JSON.parse(raw)
}

function normalizarVersiculosGerados(payload, versaoBiblica) {
  const versiculos = Array.isArray(payload?.versiculos) ? payload.versiculos : []
  const momentosValidos = new Set(['verso', 'refrao', 'ponte'])
  const normalizados = versiculos
    .filter((item) => item?.referencia && item?.texto && momentosValidos.has(item.momento))
    .slice(0, 3)
    .map((item) => ({
      referencia: String(item.referencia).trim(),
      texto: String(item.texto).trim(),
      palavra: String(item.palavra || '').trim() || 'Deus nos encoraja com Sua Palavra e Sua presença.',
      momento: item.momento,
      versao: versaoBiblica,
    }))

  if (normalizados.length < 3) {
    throw new Error('A IA não retornou os 3 versículos esperados (verso, refrão e ponte)')
  }

  return {
    tema: String(payload?.tema || 'Adoração e entrega a Deus').trim(),
    versao_biblica: versaoBiblica,
    versiculos: normalizados,
  }
}

export async function gerarVersiculosComClaude({
  versaoBiblica = 'NVI',
  titulo,
  artista,
  tom,
  secoes,
}) {
  if (!env.anthropicApiKey) {
    throw new Error('Configure ANTHROPIC_API_KEY no backend para gerar versículos com IA')
  }

  const letraCompleta = resumirLetraDasSecoes(secoes)
  const { system, user } = buildVersiculosIaPrompt({
    versaoBiblica,
    titulo,
    artista,
    tom,
    letraCompleta,
  })

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.anthropicApiKey,
      'anthropic-version': ANTHROPIC_API_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: VERSICULOS_CLAUDE_MODEL,
      max_tokens: 1200,
      temperature: 0.3,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const msg =
      data?.error?.message ||
      data?.message ||
      'A API Anthropic não conseguiu gerar os versículos'
    throw new Error(msg)
  }

  const textBlock = (data.content || []).find((block) => block.type === 'text')
  const parsed = parseJsonObject(textBlock?.text || '')
  return normalizarVersiculosGerados(parsed, versaoBiblica)
}

/** @deprecated Use gerarVersiculosComClaude */
export const gerarVersiculosComOpenAI = gerarVersiculosComClaude
