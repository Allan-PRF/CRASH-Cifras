import crypto from 'crypto'
import { PLANOS_ASSINATURA } from '@crash-cifras/shared/constants'
import { env } from '../config.js'

function formatMoneyBRL(centavos) {
  return (centavos / 100).toFixed(2)
}

function timingSafeEqualStrings(a, b) {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

export function getPlanoAssinatura(planoId) {
  const plano = PLANOS_ASSINATURA[planoId]
  if (!plano || plano.id === 'gratuito') {
    throw new Error('Plano de assinatura inválido')
  }
  if (plano.id === 'equipe') {
    throw new Error('Plano Equipe em breve. Escolha o plano Solo.')
  }
  return plano
}

export async function criarCheckoutInfinitPay({ plano, user, assinaturaId, cobrancaPausadaAte = null }) {
  if (!env.infinitPayHandle) {
    throw new Error('Configure INFINITPAY_HANDLE no backend')
  }

  const siteUrl = env.publicSiteUrl.replace(/\/$/, '')

  const payload = {
    handle: env.infinitPayHandle,
    order_nsu: assinaturaId,
    redirect_url: `${siteUrl}/assinatura/sucesso`,
    webhook_url: `${siteUrl}/api/assinaturas/webhook/infinitpay`,
    customer: {
      name: user.user_metadata?.name || user.email,
      email: user.email,
    },
    items: [
      {
        description: `CRASH Cifras — Plano ${plano.nome}`,
        quantity: 1,
        price: plano.price,
      },
    ],
  }

  console.log('[InfinitPay] payload:', JSON.stringify(payload, null, 2))

  const response = await fetch(env.infinitPayCheckoutApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    console.error('[InfinitPay] erro resposta:', response.status, JSON.stringify(data, null, 2))
    throw new Error(data?.message || data?.error || 'InfinitPay recusou o checkout')
  }

  console.log('[InfinitPay] sucesso:', JSON.stringify(data, null, 2))

  const checkoutUrl = data.url || data.checkout_url || data.payment_url || data.link
  if (!checkoutUrl) {
    throw new Error('InfinitPay não retornou link de checkout')
  }

  return {
    checkoutUrl,
    providerReference: data.invoice_slug || data.slug || data.id || assinaturaId,
    raw: data,
  }
}

/**
 * Valida webhook InfinitPay antes de qualquer lógica de bônus/assinatura.
 * Produção exige INFINITPAY_WEBHOOK_SECRET; aceita header de secret ou HMAC-SHA256 do body.
 */
export function validarWebhookInfinitPay(req) {
  const secret = env.infinitPayWebhookSecret

  if (!secret) {
    if (env.nodeEnv === 'production') {
      console.error('[WEBHOOK] INFINITPAY_WEBHOOK_SECRET obrigatório em produção')
      return false
    }
    return true
  }

  const signatureHeader = req.headers['x-infinitpay-signature']
  const webhookSecretHeader = req.headers['x-webhook-secret']
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '')

  const rawBody =
    req.rawBody ??
    (typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}))

  if (signatureHeader && rawBody) {
    const expectedHex = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
    const expectedBase64 = crypto.createHmac('sha256', secret).update(rawBody).digest('base64')
    if (
      timingSafeEqualStrings(signatureHeader, expectedHex) ||
      timingSafeEqualStrings(signatureHeader, `sha256=${expectedHex}`) ||
      timingSafeEqualStrings(signatureHeader, expectedBase64)
    ) {
      return true
    }
  }

  const sharedSecret = webhookSecretHeader || bearer
  if (sharedSecret && timingSafeEqualStrings(sharedSecret, secret)) {
    return true
  }

  return false
}
