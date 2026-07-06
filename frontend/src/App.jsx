import { RouterProvider } from 'react-router-dom'
import { InstallPwaPrompt } from './components/InstallPwaPrompt'
import { PwaInstallIosHint } from './components/pwa/PwaInstallIosHint'
import { AiProtection } from './components/security/AiProtection'
import { AuthProvider } from './context/AuthContext'
import { PwaInstallProvider } from './context/PwaInstallContext'
import { router } from './routes'

function App() {
  return (
    <AuthProvider>
      <PwaInstallProvider>
        <AiProtection />
        <RouterProvider router={router} />
        <InstallPwaPrompt />
        <PwaInstallIosHint />
      </PwaInstallProvider>
    </AuthProvider>
  )
}

export default App
