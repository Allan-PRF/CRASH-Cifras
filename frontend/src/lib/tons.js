import { Note } from 'tonal'
import {
  TOM_LABELS,
  TONS_MAIORES,
  TONS_MENORES,
  TODOS_TONS,
  tomDisplayLabel,
} from '@crash-cifras/shared/constants'

export { TOM_LABELS, TONS_MAIORES, TONS_MENORES, TODOS_TONS, tomDisplayLabel }

function isMinorKey(key) {
  return /m$/i.test(String(key || '')) && !/maj/i.test(String(key || ''))
}

function rootOfKey(key) {
  return String(key || '').replace(/m$/i, '')
}

/**
 * Mesmo tom enarmônico + mesmo modo (maior/menor), para highlight na grade.
 * Não altera valores canônicos salvos — só comparação visual.
 */
export function isSameTomCanonical(a, b) {
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  if (a === b) return true

  if (isMinorKey(a) !== isMinorKey(b)) return false

  const infoA = Note.get(rootOfKey(a))
  const infoB = Note.get(rootOfKey(b))
  if (infoA.empty || infoB.empty) return false

  return infoA.chroma === infoB.chroma
}
