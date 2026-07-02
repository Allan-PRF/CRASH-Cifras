import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { isValidReferralCode } from '@crash-cifras/shared/referral'
import { TRIAL_DIAS_GRATIS_LABEL } from '@crash-cifras/shared/constants'
import { btnPrimaryClassName } from '../components/ui/inputClasses'
import { sanitizeText } from '../lib/sanitize'
import { saveReferralCode } from '../lib/referralStorage'
import { fetchPublicReferrer } from '../services/referrals'

const VANTAGENS = [
  'Teleprompter com BPM e transposição de tom',
  'Importação de cifras via YouTube',
  'Playlists de eventos e modo coordenador',
  'Versículos bíblicos integrados às músicas',
  'Histórico e organização por ministro',
]

export function ReferralLanding() {
  const { codigo } = useParams()
  const [nomeIndicador, setNomeIndicador] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.update())
    })
  }, [])

  useEffect(() => {
    const code = String(codigo || '').trim()

    if (!code) {
      setError('Link inválido.')
      setLoading(false)
      return
    }

    if (!isValidReferralCode(code)) {
      setError('Código de indicação inválido.')
      setLoading(false)
      return
    }

    saveReferralCode(code)

    fetchPublicReferrer(code)
      .then((data) => {
        setNomeIndicador(sanitizeText(data.displayName))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [codigo])

  return (
    <div className="min-h-svh bg-black text-white">
      <div className="mx-auto flex min-h-svh max-w-lg flex-col px-6 py-10">
        <header className="text-center">
          <p className="text-2xl font-bold tracking-tight">
            CRASH <span className="text-[var(--crash-cifra)]">Cifras</span>
          </p>
        </header>

        <main className="mt-10 flex flex-1 flex-col">
          {loading && (
            <p className="text-center text-sm text-[var(--crash-texto-sec)]">Carregando convite…</p>
          )}

          {error && !loading && (
            <div className="space-y-4 text-center">
              <p className="text-red-400">{error}</p>
              <Link to="/login" className="text-[var(--crash-cifra)] hover:underline">
                Ir para o login
              </Link>
            </div>
          )}

          {!loading && !error && nomeIndicador && (
            <article className="space-y-8">
              <div className="rounded-2xl border border-[var(--crash-borda)] bg-[var(--crash-fundo-card)] p-6">
                <p className="text-lg leading-relaxed text-white">
                  <strong className="text-[var(--crash-cifra)]">{nomeIndicador}</strong> te convida
                  para conhecer o CRASH Cifras
                </p>
              </div>

              <div>
                <h1 className="text-sm font-semibold uppercase tracking-wider text-[var(--crash-texto-sec)]">
                  Principais vantagens
                </h1>
                <ul className="mt-4 space-y-3">
                  {VANTAGENS.map((item) => (
                    <li
                      key={item}
                      className="flex gap-3 text-sm text-[var(--crash-texto-sec)] before:text-[var(--crash-cifra)] before:content-['—']"
                    >
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-center text-2xl font-bold text-[var(--crash-cifra)]">
                Experimente {TRIAL_DIAS_GRATIS_LABEL}
              </p>

              <Link
                to="/cadastro"
                className={`${btnPrimaryClassName} block w-full py-3 text-center text-base`}
              >
                Criar minha conta
              </Link>

              <p className="text-center text-xs text-[var(--crash-texto-sec)]">
                Já tem conta?{' '}
                <Link to="/login" className="text-[var(--crash-cifra)] hover:underline">
                  Entrar
                </Link>
              </p>
            </article>
          )}
        </main>

        <footer className="mt-10 text-center text-xs text-[var(--crash-texto-sec)]">
          CRASH Cifras · Todos os direitos reservados
        </footer>
      </div>
    </div>
  )
}
