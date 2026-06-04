import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { isValidReferralCode } from '@crash-cifras/shared/referral'
import { clearReferralCode, getStoredReferralCode } from '../lib/referralStorage'

export function LoginPage({ initialMode = 'login' }) {
  const { user, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const storedRef = getStoredReferralCode()
  const referralCode = isValidReferralCode(storedRef) ? storedRef : ''

  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  if (user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        const { session } = await signUp(email, password, referralCode || undefined)
        clearReferralCode()
        if (!session) {
          setError('Verifique seu e-mail para confirmar o cadastro.')
          return
        }
      }
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Não foi possível autenticar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-sm space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold text-white">
          {mode === 'login' ? 'Entrar' : 'Criar conta'}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Use e-mail e senha com Supabase Auth
        </p>
        {mode === 'signup' && referralCode && (
          <p className="mt-2 text-xs text-[var(--crash-cifra)]">
            Indicação ativa — 10 dias grátis pelo link do seu convite
          </p>
        )}
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm text-zinc-400">E-mail</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--crash-borda)] bg-black px-3 py-2 text-white outline-none focus:border-[var(--crash-cifra)]"
          />
        </label>

        <label className="block">
          <span className="text-sm text-zinc-400">Senha</span>
          <span className="relative mt-1 block">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--crash-borda)] bg-black py-2 pl-3 pr-11 text-white outline-none focus:border-[var(--crash-cifra)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              👁️
            </button>
          </span>
        </label>

        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-[var(--crash-primario)] py-2.5 font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Cadastrar'}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-500">
        {mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="text-[var(--crash-cifra)] hover:underline"
        >
          {mode === 'login' ? 'Cadastre-se' : 'Faça login'}
        </button>
      </p>
    </section>
  )
}
