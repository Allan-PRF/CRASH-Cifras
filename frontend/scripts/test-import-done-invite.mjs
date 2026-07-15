/**
 * Persistência do convite pós-import (segundo plano).
 */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

// jsdom-less: mock localStorage
const mem = new Map()
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
}

const {
  clearImportDoneInvite,
  clearImportJobRef,
  isCifraImportPronta,
  loadImportDoneInvite,
  saveImportDoneInvite,
  saveImportJobRef,
  loadImportJobRef,
} = await import('../src/lib/importJobStorage.js')

assert.equal(isCifraImportPronta('Cifra gerada pelo motor'), true)
assert.equal(isCifraImportPronta('Cifra do acervo — pronta'), true)
assert.equal(isCifraImportPronta('Aguardando geração'), false)

const mid = 'ministro-1'
saveImportJobRef(mid, { jobId: 'job-1', musicaId: 'mus-1' })
saveImportDoneInvite(mid, {
  musicaId: 'mus-1',
  titulo: 'Clamo Jesus',
  etapa: 'Cifra gerada',
  jobId: 'job-1',
})

assert.ok(loadImportJobRef(mid)?.jobId === 'job-1')
assert.ok(loadImportDoneInvite(mid)?.musicaId === 'mus-1')

clearImportJobRef(mid)
assert.equal(loadImportJobRef(mid), null)
assert.equal(
  loadImportDoneInvite(mid)?.titulo,
  'Clamo Jesus',
  'convite sobrevive a clearImportJobRef',
)

// simula “reload”: storage intacto
assert.equal(loadImportDoneInvite(mid)?.musicaId, 'mus-1')

clearImportDoneInvite(mid)
assert.equal(loadImportDoneInvite(mid), null)

console.log('ok: test-import-done-invite')
