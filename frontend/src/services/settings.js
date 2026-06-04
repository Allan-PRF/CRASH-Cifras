import { supabase } from '../lib/supabase'

const DEFAULT_SETTINGS = {
  versao_biblica: 'NVI',
  nivel_teclado: 'basico',
  teclado_modelo: null,
  graus_visiveis: true,
  versiculos_visiveis: true,
  metronomo_visivel: true,
  fonte_tamanho: 'M',
  plano: 'gratuito',
  assinatura_status: 'trial',
  assinatura_expira_em: null,
  assinatura_provider: null,
  data_inicio_trial: null,
  data_fim_trial: null,
  trial_email_2_dias_enviado_em: null,
}

function buildTrialDefaults(planoTrial = 'equipe') {
  const dias = planoTrial === 'solo' ? 10 : 20
  const inicio = new Date()
  const fim = new Date(inicio)
  fim.setDate(fim.getDate() + dias)
  return {
    assinatura_status: 'trial',
    assinatura_provider: 'trial',
    plano_trial: planoTrial,
    data_inicio_trial: inicio.toISOString(),
    data_fim_trial: fim.toISOString(),
  }
}

export async function fetchUserSettings() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) throw error
  if (data) return data

  const { data: created, error: insertError } = await supabase
    .from('user_settings')
    .insert({ user_id: user.id, ...DEFAULT_SETTINGS, ...buildTrialDefaults() })
    .select('*')
    .single()

  if (insertError) throw insertError
  return created
}

export async function updateUserSettings(updates) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  await fetchUserSettings()

  const { data, error } = await supabase
    .from('user_settings')
    .update(updates)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (error) throw error
  return data
}
