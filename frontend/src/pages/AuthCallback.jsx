import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/**
 * Processa o callback de confirmação de email do Supabase.
 * Suporta tanto PKCE flow (?code=...) quanto implicit flow (#access_token=...).
 */
export function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const hashParams = new URLSearchParams(window.location.hash.replace('#', ''))
      const accessToken = hashParams.get('access_token')

      try {
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
        } else if (accessToken) {
          // Implicit flow: supabase-js detecta automaticamente via onAuthStateChange
          // Aguardar um momento para o listener processar
          await new Promise((r) => setTimeout(r, 500))
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          navigate('/', { replace: true })
        } else {
          setError('Sessão não encontrada. Tente fazer login manualmente.')
        }
      } catch (err) {
        console.error('[auth/callback] erro:', err)
        setError(err.message || 'Erro ao processar confirmação de email')
      }
    }

    handleCallback()
  }, [navigate])

  if (error) {
    return (
      <section className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center">
        <p className="text-5xl">⚠️</p>
        <h1 className="text-2xl font-bold text-white">Erro na confirmação</h1>
        <p className="text-sm text-red-400">{error}</p>
        <a href="/login" className="text-sm text-[var(--crash-cifra)] hover:underline">
          Ir para login
        </a>
      </section>
    )
  }

  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--crash-cifra)] border-t-transparent" />
      <p className="text-sm text-zinc-400">Confirmando seu email…</p>
    </section>
  )
}
