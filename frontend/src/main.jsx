import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { aplicarTemaCss } from './lib/tema'
import { installJwtExpiredGlobalHandler } from './lib/jwtExpiredGlobal'
import App from './App.jsx'
import './index.css'

aplicarTemaCss()
installJwtExpiredGlobalHandler()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
)
