import { isValidReferralCode } from '@crash-cifras/shared/referral'

const STORAGE_KEY = 'crash_ref_codigo'
const LEGACY_STORAGE_KEY = 'crash_referral_code'

export function saveReferralCode(code) {
  if (!code || !isValidReferralCode(code)) return
  sessionStorage.setItem(STORAGE_KEY, String(code).trim().toUpperCase())
  sessionStorage.removeItem(LEGACY_STORAGE_KEY)
}

export function getStoredReferralCode() {
  return (
    sessionStorage.getItem(STORAGE_KEY) ||
    sessionStorage.getItem(LEGACY_STORAGE_KEY) ||
    ''
  )
}

export function clearReferralCode() {
  sessionStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(LEGACY_STORAGE_KEY)
}

export { getPublicSiteUrl, buildEquipeInviteUrl, CANONICAL_SITE_URL } from './siteUrl'
