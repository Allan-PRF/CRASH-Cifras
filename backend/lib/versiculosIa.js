import {
  buildVersiculosIaMessages,
  resumirLetraDasSecoes,
} from '@crash-cifras/shared'
import { env } from '../config.js'

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
      palavra: String(item.palavra || '').trim() || 'Deus nos chama ao amor e ao arrependimento.',
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

export async function gerarVersiculosComOpenAI({
  versaoBiblica = 'NVI',
  titulo,
  artista,
  tom,
  secoes,
}) {
  if (!env.openaiKey) {
    throw new Error('Configure OPENAI_API_KEY no backend para gerar versículos com IA')
  }

  const letraCompleta = resumirLetraDasSecoes(secoes)
  const messages = buildVersiculosIaMessages({
    versaoBiblica,
    titulo,
    artista,
    tom,
    letraCompleta,
  })

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      messages,
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error?.message || 'OpenAI não conseguiu gerar os versículos')
  }

  const parsed = parseJsonObject(data.choices?.[0]?.message?.content || '')
  return normalizarVersiculosGerados(parsed, versaoBiblica)
}
