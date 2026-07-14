/**
 * Celular pé / deitado vs PC — classificação + escala de fonte.
 */
import { isTeleprompterMobileViewport } from '../src/hooks/useIsMobile.js'
import {
  scaleTeleprompterFont,
  TELEPROMPTER_MOBILE_FONT_SCALE,
} from '../src/lib/teleprompterMobile.js'

let passed = 0
let failed = 0
function assert(cond, label, detail = '') {
  if (cond) {
    passed++
    console.log(`  ✓ ${label}`)
  } else {
    failed++
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

function withViewport(width, height, fn) {
  const prev = globalThis.window
  globalThis.window = {
    innerWidth: width,
    innerHeight: height,
  }
  try {
    return fn()
  } finally {
    if (prev === undefined) delete globalThis.window
    else globalThis.window = prev
  }
}

const BASE = 34 // passo default portrait

console.log('1) Classificação mobile vs desktop')
{
  assert(
    isTeleprompterMobileViewport(390, 844) === true,
    'celular pé 390×844 = mobile',
  )
  assert(
    isTeleprompterMobileViewport(844, 390) === true,
    'MESMO celular deitado 844×390 = mobile (não desktop)',
  )
  assert(
    isTeleprompterMobileViewport(1920, 1080) === false,
    'PC 1920×1080 = desktop',
  )
}

console.log('2) Retrato idêntico à fórmula de hoje; desktop inalterado')
{
  // Antes: max-width 639 → 390 = mobile; vwFactor = 390/390 = 1
  const portraitExpected = Math.max(
    12,
    Math.round(BASE * TELEPROMPTER_MOBILE_FONT_SCALE.portrait * 1),
  )
  const portraitNow = withViewport(390, 844, () =>
    scaleTeleprompterFont(BASE, 'portrait', true),
  )
  assert(
    portraitNow === portraitExpected,
    `retrato celular fonte igual à atual (${portraitExpected}px)`,
    `got ${portraitNow}`,
  )

  const desktop = withViewport(1920, 1080, () =>
    scaleTeleprompterFont(BASE, 'portrait', false),
  )
  assert(desktop === BASE, 'desktop inalterado (basePx sem scale)', String(desktop))
}

console.log('3) Paisagem celular: fonte mobile (não PC) + shortSide no fator')
{
  // Bug antigo: width 844 → isMobile false → fonte = BASE (PC)
  const bugAntigoDesktop = BASE
  const landscapeMobile = withViewport(844, 390, () =>
    scaleTeleprompterFont(BASE, 'landscape', true),
  )
  assert(
    landscapeMobile < bugAntigoDesktop,
    'deitado: fonte < desktop (encolhe)',
    `${landscapeMobile} vs ${bugAntigoDesktop}`,
  )
  // shortSide=390 → fator 1; escala landscape 0.32
  const expected = Math.max(
    12,
    Math.round(BASE * TELEPROMPTER_MOBILE_FONT_SCALE.landscape * 1),
  )
  assert(
    landscapeMobile === expected,
    `deitado: escala landscape com lado curto (${expected}px)`,
    String(landscapeMobile),
  )
  // Com base maior: se usasse largura 844 (fator 1.12) a fonte seria maior que shortSide.
  const BASE_BIG = 50
  const landscapeBig = withViewport(844, 390, () =>
    scaleTeleprompterFont(BASE_BIG, 'landscape', true),
  )
  const ifUsedWidth = Math.max(
    12,
    Math.round(BASE_BIG * TELEPROMPTER_MOBILE_FONT_SCALE.landscape * 1.12),
  )
  assert(
    landscapeBig < ifUsedWidth,
    'não infla pela largura da paisagem (shortSide)',
    `${landscapeBig} < ${ifUsedWidth}`,
  )
}

console.log(`\n${passed} ok, ${failed} falhou`)
process.exit(failed > 0 ? 1 : 0)
