/**
 * Vercel/Linux: npm ci com lockfile gerado no Windows pode omitir
 * @rolldown/binding-linux-x64-gnu (bug de optionalDependencies do npm).
 * Garante o binding nativo antes do vite build.
 */
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const BINDING = '@rolldown/binding-linux-x64-gnu'
const VERSION = '1.0.1'
const WORKSPACE = '@crash-cifras/frontend'

function hasBinding() {
  try {
    require.resolve(`${BINDING}/package.json`)
    return true
  } catch {
    return false
  }
}

if (process.platform === 'linux' && !hasBinding()) {
  console.log(`[vercel-install] instalando ${BINDING}@${VERSION}…`)
  execSync(
    `npm install ${BINDING}@${VERSION} -w ${WORKSPACE} --no-save --force`,
    { stdio: 'inherit' },
  )
}
