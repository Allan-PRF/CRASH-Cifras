const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const BR_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/

/** ISO (yyyy-mm-dd) ou timestamptz → dd/mm/aaaa */
export function formatDataEvento(isoDate) {
  if (!isoDate) return ''
  const datePart = String(isoDate).slice(0, 10)
  const match = ISO_DATE.exec(datePart)
  if (!match) return String(isoDate)
  const [, y, m, d] = match
  return `${d}/${m}/${y}`
}

/** dd/mm/aaaa → yyyy-mm-dd (null se inválida) */
export function isoDateFromDisplayBr(display) {
  const trimmed = String(display || '').trim()
  if (ISO_DATE.test(trimmed)) return trimmed

  const match = BR_DATE.exec(trimmed)
  if (!match) return null

  const [, d, m, y] = match
  const day = Number(d)
  const month = Number(m)
  const year = Number(y)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return `${y}-${m}-${d}`
}

/** Máscara enquanto digita: dd/mm/aaaa */
export function applyDataEventoMask(raw) {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}
