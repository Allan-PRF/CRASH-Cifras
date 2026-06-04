import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageNav } from '../components/layout/PageNav'
import { btnPrimaryClassName, btnSecondaryClassName } from '../components/ui/inputClasses'
import { fetchAssinaturaAtual } from '../services/assinaturas'

export function AssinaturaSucesso() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let tentativas = 0
    const MAX_TENTATIVAS = 6
    const INTERVALO = 3000

    function verificar() {
      fetchAssinaturaAtual()
        .then((data) => {
          setSettings(data.settings)
          if (data.settings?.assinatura_status === 'ativa') {
            setLoading(false)
          } else if (tentativas < MAX_TENTATIVAS) {
            tentativas++
            setTimeout(verificar, INTERVALO)
          } else {
            setLoading(false)
          }
        })
        .catch((err) => {
          setError(err.message)
          setLoading(false)
        })
    }

    verificar()
  }, [])

  const plano = settings?.plano || 'solo'
  const ativo = settings?.assinatura_status === 'ativa'
  const expiraEm = settings?.assinatura_expira_em
    ? new Date(settings.assinatura_expira_em).toLocaleDateString('pt-BR')
    : null

  return (
    <section className="space-y-8">
      <PageNav
        breadcrumbItems={[
          { label: 'Início', to: '/' },
          { label: 'Assinatura', to: '/assinatura' },
          { label: 'Sucesso' },
        ]}
        backTo="/assinatura"
      />

      <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-6 text-center">
      {loading ? (
        <>
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--crash-cifra)] border-t-transparent" />
          <p className="text-lg text-[var(--crash-texto-sec)]">
            Confirmando seu pagamento…
          </p>
        </>
      ) : error ? (
        <div className="max-w-md space-y-4">
          <p className="text-5xl">⚠️</p>
          <h1 className="text-2xl font-bold text-white">Erro ao verificar pagamento</h1>
          <p className="text-sm text-red-400">{error}</p>
          <Link to="/assinatura" className={btnSecondaryClassName}>
            Voltar para assinaturas
          </Link>
        </div>
      ) : ativo ? (
        <div className="max-w-md space-y-5">
          <p className="text-6xl">🎉</p>
          <h1 className="text-3xl font-bold text-white">Pagamento confirmado!</h1>
          <p className="text-lg text-[var(--crash-texto-sec)]">
            Bem-vindo ao CRASH{' '}
            <span className="font-semibold text-[#F97316]">Cifras</span>{' '}
            <span className="font-bold uppercase text-[var(--crash-cifra)]">{plano}</span>
          </p>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white">
            <p>
              Plano ativado: <strong className="text-[var(--crash-cifra)]">{plano}</strong>
            </p>
            {expiraEm && (
              <p className="mt-1">
                Válido até: <strong>{expiraEm}</strong>
              </p>
            )}
          </div>
          <Link to="/" className={`inline-block ${btnPrimaryClassName}`}>
            Começar a usar
          </Link>
        </div>
      ) : (
        <div className="max-w-md space-y-5">
          <p className="text-6xl">⏳</p>
          <h1 className="text-2xl font-bold text-white">Pagamento em processamento</h1>
          <p className="text-sm text-[var(--crash-texto-sec)]">
            Seu pagamento ainda está sendo confirmado. Isso pode levar alguns minutos.
            Você receberá acesso assim que a confirmação chegar.
          </p>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white">
            <p>
              Plano solicitado: <strong className="text-[var(--crash-cifra)]">{plano}</strong>
            </p>
            <p className="mt-1">
              Status: <strong className="text-yellow-400">{settings?.assinatura_status || 'pendente'}</strong>
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/" className={`inline-block ${btnPrimaryClassName}`}>
              Ir para o início
            </Link>
            <Link to="/assinatura" className={`inline-block ${btnSecondaryClassName}`}>
              Ver assinatura
            </Link>
          </div>
        </div>
      )}
      </div>
    </section>
  )
}
