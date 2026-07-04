import {
  buildReferralLink,
  isValidReferralCode,
  sanitizeReferrerDisplayName,
} from '@crash-cifras/shared/referral'
import { getPublicSiteUrl } from '../lib/siteUrl'
import { supabase } from '../lib/supabase'

function unwrapRpcScalar(value) {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

/** Garante referral_code no perfil do usuário logado (Supabase direto — sem API). */
async function ensureReferralCode(userId) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('referral_code, display_name')
    .eq('id', userId)
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
    .maybeSingle()

  if (upsertError) throw upsertError
  if (!upserted?.referral_code) {
    throw new Error('Não foi possível salvar código de indicação.')
  }
  return upserted
}

export async function fetchReferralStats() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Faça login para ver sua indicação')

  const profile = await ensureReferralCode(user.id)

  const { data: totalIndicacoes, error: countError } = await supabase.rpc(
    'count_referral_conversions',
    { p_referrer_id: user.id },
  )
  if (countError) throw countError

  const { data: settings, error: settingsError } = await supabase
    .from('user_settings')
    .select(
      'meses_bonus_restantes, meses_bonus_acumulados, proxima_cobranca_em, assinatura_expira_em, cobranca_pausada_ate',
    )
    .eq('user_id', user.id)
    .maybeSingle()

  if (settingsError) throw settingsError

  const code = profile.referral_code
  return {
    code,
    link: buildReferralLink(code, getPublicSiteUrl()),
    displayName: sanitizeReferrerDisplayName(profile.display_name),
    totalIndicacoes: totalIndicacoes ?? 0,
    mesesAcumulados: settings?.meses_bonus_acumulados ?? 0,
    mesesRestantes: settings?.meses_bonus_restantes ?? 0,
    proximaCobranca:
      settings?.proxima_cobranca_em || settings?.assinatura_expira_em || null,
    cobrancaPausadaAte: settings?.cobranca_pausada_ate || null,
  }
}

export async function fetchPublicReferrer(codigo) {
  if (!isValidReferralCode(codigo)) {
    throw new Error('Código de indicação inválido.')
  }

  const { data, error } = await supabase.rpc('get_public_referrer_by_code', {
    p_code: codigo.trim(),
  })

  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data
  if (!row?.referral_code) {
    throw new Error('Link de indicação inválido.')
  }

  return {
    displayName: sanitizeReferrerDisplayName(row.display_name),
    code: row.referral_code,
    link: buildReferralLink(row.referral_code, getPublicSiteUrl()),
  }
}
