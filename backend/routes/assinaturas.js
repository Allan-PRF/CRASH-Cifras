import { Router } from 'express'
import {
  criarCheckoutInfinitPay,
  getPlanoAssinatura,
  validarWebhookInfinitPay,
} from '../lib/infinitpay.js'
import { rateLimiters } from '../middleware/security.js'
import { aplicarMesBonusRenovacao, processarConversaoIndicacao } from '../lib/referrals.js'
import { getSupabaseAdmin, requireAuth } from '../lib/supabase.js'

export const assinaturasRouter = Router()

function addMonths(date, months) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

async function ativarAssinatura({ supabase, assinaturaId, providerReference, payload }) {
  const expiraEm = addMonths(new Date(), 1).toISOString()

  const { data: assinatura, error } = await supabase
    .from('assinaturas')
    .update({
      status: 'ativa',
      provider_reference: providerReference,
      inicia_em: new Date().toISOString(),
      expira_em: expiraEm,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assinaturaId)
    .select('*')
    .single()

  if (error) throw error

  await supabase.from('pagamentos_assinatura').insert({
    assinatura_id: assinatura.id,
    user_id: assinatura.user_id,
    plano: assinatura.plano,
    provider_reference: providerReference,
    status: 'pago',
    valor_centavos: assinatura.valor_centavos,
    payload,
  })

  const { error: settingsError } = await supabase
    .from('user_settings')
    .upsert({
      user_id: assinatura.user_id,
      plano: assinatura.plano,
      assinatura_status: 'ativa',
      assinatura_expira_em: expiraEm,
      assinatura_provider: 'infinitpay',
    }, {
      onConflict: 'user_id',
    })

  if (settingsError) throw settingsError

  await processarConversaoIndicacao({
    supabase,
    referredUserId: assinatura.user_id,
    plano: assinatura.plano,
    assinaturaId: assinatura.id,
  }).catch((err) => {
    console.error('[INDICAÇÃO] Falha ao processar conversão:', err.message)
  })

  return assinatura
}

assinaturasRouter.get('/atual', requireAuth, async (req, res, next) => {
  try {
    const { data: settings, error: settingsError } = await req.supabase
      .from('user_settings')
      .select(
        'plano, plano_trial, assinatura_status, assinatura_expira_em, assinatura_provider, data_inicio_trial, data_fim_trial, trial_email_2_dias_enviado_em, meses_bonus_restantes, meses_bonus_acumulados, proxima_cobranca_em, cobranca_pausada_ate',
      )
      .eq('user_id', req.user.id)
      .maybeSingle()

    if (settingsError) throw settingsError

    const { data: assinatura, error } = await req.supabase
      .from('assinaturas')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    res.json({ settings, assinatura })
  } catch (err) {
    next(err)
  }
})

assinaturasRouter.post('/checkout', rateLimiters.payment, requireAuth, async (req, res, next) => {
  try {
    const plano = getPlanoAssinatura(req.body?.plano)

    const { data: settingsAtual } = await req.supabase
      .from('user_settings')
      .select('assinatura_status, meses_bonus_restantes')
      .eq('user_id', req.user.id)
      .maybeSingle()

    if (
      settingsAtual?.assinatura_status === 'ativa' &&
      settingsAtual?.meses_bonus_restantes > 0
    ) {
      const bonus = await aplicarMesBonusRenovacao(req.supabase, req.user.id)
      if (bonus) {
        return res.json({
          bonusAplicado: true,
          mesesRestantes: bonus.mesesRestantes,
          proximaCobranca: bonus.proximaCobranca,
          message: 'Renovação aplicada com mês bônus — sem cobrança neste ciclo.',
        })
      }
    }

    const { data: assinatura, error } = await req.supabase
      .from('assinaturas')
      .insert({
        user_id: req.user.id,
        plano: plano.id,
        status: 'pendente',
        valor_centavos: plano.price,
      })
      .select('*')
      .single()

    if (error) throw error

    const { data: bonusSettings } = await req.supabase
      .from('user_settings')
      .select('cobranca_pausada_ate')
      .eq('user_id', req.user.id)
      .maybeSingle()

    const checkout = await criarCheckoutInfinitPay({
      plano,
      user: req.user,
      assinaturaId: assinatura.id,
      cobrancaPausadaAte: bonusSettings?.cobranca_pausada_ate || null,
    })

    const { data: updated, error: updateError } = await req.supabase
      .from('assinaturas')
      .update({
        checkout_url: checkout.checkoutUrl,
        provider_reference: checkout.providerReference,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assinatura.id)
      .select('*')
      .single()

    if (updateError) throw updateError

    await req.supabase
      .from('user_settings')
      .upsert({
        user_id: req.user.id,
        assinatura_status: 'pendente',
        assinatura_provider: 'infinitpay',
      }, {
        onConflict: 'user_id',
      })

    await req.supabase.from('pagamentos_assinatura').insert({
      assinatura_id: assinatura.id,
      user_id: req.user.id,
      plano: plano.id,
      provider_reference: checkout.providerReference,
      status: 'checkout_criado',
      valor_centavos: plano.price,
      payload: checkout.raw,
    })

    res.status(201).json({ checkoutUrl: checkout.checkoutUrl, assinatura: updated })
  } catch (err) {
    next(err)
  }
})

assinaturasRouter.post('/webhook/infinitpay', async (req, res, next) => {
  try {
    if (!validarWebhookInfinitPay(req)) {
      return res.status(401).json({ error: 'Webhook não autorizado' })
    }

    const payload = req.body || {}
    console.log('[WEBHOOK] InfinitPay payload:', JSON.stringify(payload, null, 2))

    const assinaturaIdPreview =
      payload.order_nsu ||
      payload.external_reference ||
      payload.metadata?.assinatura_id ||
      payload.assinatura_id

    if (!assinaturaIdPreview) {
      return res.status(202).json({ ok: true, ignored: 'missing_assinatura_id' })
    }
    const status = String(payload.status || payload.payment_status || '').toLowerCase()
    const assinaturaId = assinaturaIdPreview
    const providerRef =
      payload.transaction_nsu || payload.invoice_slug || payload.slug ||
      payload.id || payload.reference || payload.transaction_id

    const supabase = getSupabaseAdmin()
    const paidStatuses = new Set(['paid', 'approved', 'authorized', 'completed', 'pago'])
    if (paidStatuses.has(status)) {
      await ativarAssinatura({
        supabase,
        assinaturaId,
        providerReference: providerRef,
        payload,
      })
    } else {
      const { data: assinatura, error } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('id', assinaturaId)
        .single()

      if (error) throw error

      await supabase.from('pagamentos_assinatura').insert({
        assinatura_id: assinaturaId,
        user_id: assinatura.user_id,
        plano: assinatura.plano,
        provider_reference: providerRef,
        status: status || 'webhook_recebido',
        valor_centavos: assinatura.valor_centavos,
        payload,
      })
    }

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})
