/**
 * Testes unitários leves de teleprompterBpm (carga portrait com bpm_pessoal).
 */
import assert from 'node:assert/strict'
import {
  cadastroBpmFromMusica,
  clampPortraitBpm,
  loadPortraitBpmFromMusica,
  PORTRAIT_BPM_MIN,
} from '../src/lib/teleprompterBpm.js'

assert.equal(loadPortraitBpmFromMusica({ bpm: 110 }), 110)
assert.equal(loadPortraitBpmFromMusica({ bpm: 110, bpm_pessoal: 95 }), 95)
assert.equal(loadPortraitBpmFromMusica({ bpm: null, bpm_pessoal: 88 }), 88)
assert.equal(loadPortraitBpmFromMusica({}), PORTRAIT_BPM_MIN)
assert.equal(cadastroBpmFromMusica({ bpm: 110, bpm_pessoal: 95 }), 110)
assert.equal(clampPortraitBpm(10), PORTRAIT_BPM_MIN)
assert.equal(clampPortraitBpm(250), 200)

console.log('ok: test-teleprompter-bpm')
