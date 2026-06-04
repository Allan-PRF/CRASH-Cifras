/** Formato aceito para códigos de indicação na URL e API */
export const REFERRAL_CODE_REGEX = /^[a-zA-Z0-9-]{4,20}$/

export function isValidReferralCode(code) {
  return typeof code === 'string' && REFERRAL_CODE_REGEX.test(code.trim())
}

/** Meses grátis creditados ao indicador quando o indicado assina e paga */
export const REFERRAL_BONUS_MESES = {
  solo: 1,
  equipe: 3,
}

export const REFERRAL_SHARE_TEXT = `Para músicos.
Testei e aprovei — CRASH Cifras é diferente de tudo que já usei.
Testa 10 dias grátis pelo meu link:`
