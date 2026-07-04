/**
 * Vercel/Linux: npm ci com lockfile gerado no Windows pode omitir
 * @rollup/rollup-linux-x64-gnu (npm/cli#4828 — optionalDependencies).
 * Garante o binding nativo do Rollup (Vite 7) antes do vite build.
 */
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BINDING = '@rollup/rollup-linux-x64-gnu'
const WORKSPACE = '@crash-cifras/frontend'

function rollupVersion() {
  try {
    const lock = JSON.parse(readFileSync(join(ROOT, 'package-lock.json'), 'utf8'))
    return lock.packages?.['node_modules/rollup']?.version || '4.60.4'
  } catch {
    return '4.60.4'
  }
}

function hasBinding() {
  try {
    require.resolve(`${BINDING}/package.json`)
    return true
  } catch {
    return false
  }
}

if (process.platform === 'linux' && !hasBinding()) {
  const version = rollupVersion()
  console.log(`[vercel-install] instalando ${BINDING}@${version}…`)
  execSync(`npm install ${BINDING}@${version} -w ${WORKSPACE} --no-save --force`, {
    stdio: 'inherit',
  })
}
