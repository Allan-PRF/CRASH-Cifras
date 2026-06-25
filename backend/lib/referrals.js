import { REFERRAL_BONUS_MESES, REFERRAL_RECOMPENSA_INDICADOR_ATIVA, isValidReferralCode } from '@crash-cifras/shared/referral'
import { env } from '../config.js'
import { enviarEmailIndicacaoConfirmada } from './referralEmail.js'

export { isValidReferralCode }

export function getReferralLink(code) {
  const base = env.publicSiteUrl.replace(/\/$/, '')
  return `${base}/ref/${code}`
}

/**
 * Remove caracteres perigosos e limita tamanho antes de enviar ao frontend.
 * @param {string | null | undefined} name
 */
export function sanitizeReferrerDisplayName(name) {
  if (typeof name !== 'string') return 'Um músico'
  return name
    .replace(/[<>"'&]/g, '')
    .trim()
    .slice(0, 60) || 'Um músico'
}

function addMonths(date, months) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

function unwrapRpcScalar(value) {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

/**
 * Garante perfil + referral_code (0 ou N linhas não quebram com maybeSingle + limit).
 */
export async function ensureReferralCode(supabase, userId) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('referral_code, display_name')
    .eq('id', userId)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (profile?.referral_code) return profile

  const { data: codeRaw, error: rpcError } = await supabase.rpc('generate_referral_code')
  if (rpcError) throw rpcError

  const code = unwrapRpcScalar(codeRaw)
  if (!code) {
    throw new Error('Não foi possível gerar código de indicação.')
  }

  if (profile) {
    const { data: patched, error: patchError } = await supabase
      .from('profiles')
      .update({ referral_code: code })
      .eq('id', userId)
      .select('referral_code, display_name')
      .limit(1)
      .maybeSingle()

    if (patchError) throw patchError
    if (patched?.referral_code) return patched
  }

  const { data: upserted, error: upsertError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        referral_code: code,
        display_name: profile?.display_name || 'Músico',
      },
      { onConflict: 'id' },
    )
    .select('referral_code, display_name')
    .limit(1)
    .maybeSingle()

  if (upsertError) throw upsertError
  if (!upserted?.referral_code) {
    throw new Error('Não foi possível salvar código de indicação.')
  }
  return upserted
}

export async function getReferralStats(supabase, userId) {
  const profile = await ensureReferralCode(supabase, userId)

  const { data: totalIndicacoes, error: countError } = await supabase.rpc(
    'count_referral_conversions',
    { p_referrer_id: userId },
  )

  if (countError) throw countError

  const { data: settings, error: settingsError } = await supabase
    .from('user_settings')
    .select(
      'meses_bonus_restantes, meses_bonus_acumulados, proxima_cobranca_em, assinatura_expira_em, cobranca_pausada_ate',
    )
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (settingsError) throw settingsError

  const code = profile.referral_code
  return {
    code,
    link: getReferralLink(code),
    displayName: sanitizeReferrerDisplayName(profile.display_name),
    totalIndicacoes: totalIndicacoes ?? 0,
    mesesAcumulados: settings?.meses_bonus_acumulados ?? 0,
    mesesRestantes: settings?.meses_bonus_restantes ?? 0,
    proximaCobranca:
      settings?.proxima_cobranca_em ||
      settings?.assinatura_expira_em ||
      null,
    cobrancaPausadaAte: settings?.cobranca_pausada_ate || null,
  }
}

export async function getPublicReferrer(supabase, code) {
  if (!isValidReferralCode(code)) return null

  const { data, error } = await supabase.rpc('get_public_referrer_by_code', {
    p_code: code.trim(),
  })

  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.referral_code) return null

  return {
    displayName: sanitizeReferrerDisplayName(row.display_name),
    code: row.referral_code,
    link: getReferralLink(row.referral_code),
  }
}

/**
 * Aplica um mês bônus na renovação (sem cobrança InfinitPay).
 */
export async function aplicarMesBonusRenovacao(supabase, userId) {
  const { data: settings, error } = await supabase
    .from('user_settings')
    .select(
      'meses_bonus_restantes, assinatura_status, assinatura_expira_em, plano, proxima_cobranca_em',
    )
    .eq('user_id', userId)
    .single()

  if (error) throw error
  if (!settings?.meses_bonus_restantes || settings.meses_bonus_restantes <= 0) {
    return null
  }

  const baseDate =
    settings.assinatura_expira_em && new Date(settings.assinatura_expira_em) > new Date()
      ? new Date(settings.assinatura_expira_em)
      : new Date()

  const novaExpira = addMonths(baseDate, 1)
  const mesesRestantes = settings.meses_bonus_restantes - 1

  const { error: updateError } = await supabase
    .from('user_settings')
    .update({
      meses_bonus_restantes: mesesRestantes,
      assinatura_expira_em: novaExpira.toISOString(),
      assinatura_status: 'ativa',
      proxima_cobranca_em: novaExpira.toISOString(),
      cobranca_pausada_ate: mesesRestantes > 0 ? novaExpira.toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (updateError) throw updateError

  await supabase
    .from('assinaturas')
    .update({
      status: 'ativa',
      expira_em: novaExpira.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('status', 'ativa')

  return {
    mesesRestantes,
    proximaCobranca: novaExpira.toISOString(),
  }
}

/**
 * Credita bônus ao indicador via RPC security definer.
 * Deve ser chamado apenas após webhook InfinitPay validado.
 */
export async function processarConversaoIndicacao({
  supabase,
  referredUserId,
  plano,
  assinaturaId,
}) {
  if (!REFERRAL_RECOMPENSA_INDICADOR_ATIVA) {
    return null
  }

  const meses = REFERRAL_BONUS_MESES[plano] ?? REFERRAL_BONUS_MESES.solo

  const { data: result, error } = await supabase.rpc('credit_referrer_on_conversion', {
    p_referred_user_id: referredUserId,
    p_plano: plano,
    p_assinatura_id: assinaturaId,
    p_meses: meses,
  })

  if (error) throw error
  if (!result?.credited) return null

  const referrerId = result.referrer_id
  const proximaCobranca = result.proxima_cobranca

  const { data: userData } = await supabase.auth.admin.getUserById(referrerId)
  const email = userData?.user?.email

  if (email) {
    await enviarEmailIndicacaoConfirmada({
      to: email,
      mesesGanhos: meses,
      proximaCobrancaEm: proximaCobranca,
    })
  }

  console.info(
    `[INDICAÇÃO] ${meses} mês(es) creditados ao indicador ${referrerId} (indicado ${referredUserId}, plano ${plano})`,
  )

  return { referrerId, meses }
}
