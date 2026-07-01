import { TRIAL_DIAS_PADRAO } from '@crash-cifras/shared/constants'

export const PLANO_ORDEM = ['gratuito', 'solo', 'equipe']

export function formatPlanoPreco(centavos) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavos / 100)
}

export function planoAtende(planoAtual, planoNecessario) {
  return PLANO_ORDEM.indexOf(planoAtual || 'gratuito') >= PLANO_ORDEM.indexOf(planoNecessario)
}

export function diasTotaisTrial(settings) {
  if (!settings?.data_inicio_trial || !settings?.data_fim_trial) {
    return TRIAL_DIAS_PADRAO
  }
  const diffMs =
    new Date(settings.data_fim_trial).getTime() -
    new Date(settings.data_inicio_trial).getTime()
  return Math.max(1, Math.round(diffMs / 86400000))
}

export function diasRestantesTrial(settings) {
  if (!settings?.data_fim_trial) return 0
  const diffMs = new Date(settings.data_fim_trial).getTime() - Date.now()
  const total = diasTotaisTrial(settings)
  return Math.min(total, Math.max(0, Math.ceil(diffMs / 86400000)))
}

export function trialAtivo(settings) {
  return settings?.assinatura_status === 'trial' && diasRestantesTrial(settings) > 0
}

export function assinaturaAtiva(settings) {
  if (!settings) return false
  if (settings.assinatura_status !== 'ativa') return false
  if (!settings.assinatura_expira_em) return true
  return new Date(settings.assinatura_expira_em).getTime() > Date.now()
}

export function acessoCompletoAtivo(settings) {
  return trialAtivo(settings) || assinaturaAtiva(settings)
}

export function planoEfetivo(settings) {
  if (trialAtivo(settings)) return settings?.plano_trial || 'equipe'
  return settings?.plano || 'gratuito'
}
