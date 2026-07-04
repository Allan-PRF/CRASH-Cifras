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

/** Data de hoje no fuso local → yyyy-mm-dd */
export function hojeIsoLocal() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Extrai yyyy-mm-dd de data_culto (ISO ou timestamptz). */
export function isoDatePartFromEvento(dataCulto) {
  if (!dataCulto) return null
  const part = String(dataCulto).slice(0, 10)
  return ISO_DATE.test(part) ? part : null
}

/** true = hoje ou futuro; sem data também conta como futuro (não some da lista). */
export function isEventoFuturoOuHoje(dataCulto) {
  const iso = isoDatePartFromEvento(dataCulto)
  if (!iso) return true
  return iso >= hojeIsoLocal()
}

/**
 * Separa playlists em próximos (asc, sem data no topo) e anteriores (desc).
 * @param {Array<{ data_culto?: string | null }>} playlists
 */
export function partitionPlaylistsPorData(playlists) {
  const proximos = []
  const anteriores = []
  for (const p of playlists) {
    if (isEventoFuturoOuHoje(p.data_culto)) proximos.push(p)
    else anteriores.push(p)
  }
  proximos.sort((a, b) => {
    const aa = isoDatePartFromEvento(a.data_culto)
    const bb = isoDatePartFromEvento(b.data_culto)
    if (!aa && !bb) return 0
    if (!aa) return -1
    if (!bb) return 1
    return aa.localeCompare(bb)
  })
  anteriores.sort((a, b) => {
    const aa = isoDatePartFromEvento(a.data_culto) || ''
    const bb = isoDatePartFromEvento(b.data_culto) || ''
    return bb.localeCompare(aa)
  })
  return { proximos, anteriores }
}

/** Máscara enquanto digita: dd/mm/aaaa */
export function applyDataEventoMask(raw) {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}
