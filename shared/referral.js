/** Formato aceito para códigos de indicação na URL e API */
export const REFERRAL_CODE_REGEX = /^[a-zA-Z0-9-]{4,20}$/

export function isValidReferralCode(code) {
  return typeof code === 'string' && REFERRAL_CODE_REGEX.test(code.trim())
}

/** Recompensa ao indicador desligada (modo boca a boca — só compartilhar link). */
export const REFERRAL_RECOMPENSA_INDICADOR_ATIVA = false

/** Meses grátis creditados ao indicador quando o indicado assina e paga (legado; ver flag acima) */
export const REFERRAL_BONUS_MESES = {
  solo: 1,
  equipe: 3,
}

export const REFERRAL_SHARE_TEXT = `Irmão, Conheça esta plataforma. Cansei de rabiscar cifra na mão e me perder nas músicas antes do culto. O CRASH Cifras resolveu isso pra mim. Testa 30 dias grátis no meu link e Comprove os resultados:`

export function sanitizeReferrerDisplayName(name) {
  if (typeof name !== 'string') return 'Um músico'
  return name.replace(/[<>"'&]/g, '').trim().slice(0, 60) || 'Um músico'
}

/** Monta URL pública de indicação (/ref/:codigo). */
export function buildReferralLink(code, siteUrl = 'https://crashcifras.com.br') {
  const base = String(siteUrl || 'https://crashcifras.com.br').replace(/\/$/, '')
  return `${base}/ref/${code}`
}
