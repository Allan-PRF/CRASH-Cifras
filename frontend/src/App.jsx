import { RouterProvider } from 'react-router-dom'
import { AiProtection } from './components/security/AiProtection'
import { AuthProvider } from './context/AuthContext'
import { router } from './routes'

function App() {
  return (
    <AuthProvider>
      <AiProtection />
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App
