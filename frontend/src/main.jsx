import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { aplicarTemaCss } from './lib/tema'
import { installJwtExpiredGlobalHandler } from './lib/jwtExpiredGlobal'
import { loadCifraMonoFont } from './lib/monoCharWidth'
import App from './App.jsx'
import './index.css'

const FONT_BOOTSTRAP_TIMEOUT_MS = 3000

async function bootstrap() {
  aplicarTemaCss()
  installJwtExpiredGlobalHandler()

  try {
    await Promise.race([
      loadCifraMonoFont(),
      new Promise((resolve) => setTimeout(resolve, FONT_BOOTSTRAP_TIMEOUT_MS)),
    ])
  } catch {
    /* cifra usa fallback monospace do sistema */
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </StrictMode>,
  )
}

bootstrap()
