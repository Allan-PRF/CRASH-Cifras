import { PLANOS_ASSINATURA } from '@crash-cifras/shared/constants'
import { useEffect, useState } from 'react'
import { PageNav } from '../components/layout/PageNav'
import { btnSecondaryClassName } from '../components/ui/inputClasses'
import { diasRestantesTrial, diasTotaisTrial, formatPlanoPreco, trialAtivo } from '../lib/planos'
import { criarCheckoutAssinatura, fetchAssinaturaAtual } from '../services/assinaturas'

const PLANO_SOLO = PLANOS_ASSINATURA.solo
const PLANO_EQUIPE = PLANOS_ASSINATURA.equipe

export function Assinatura() {
  const [assinatura, setAssinatura] = useState(null)
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checkoutPlano, setCheckoutPlano] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAssinaturaAtual()
      .then((data) => {
        setAssinatura(data.assinatura)
        setSettings(data.settings)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function contratar(planoId) {
    setCheckoutPlano(planoId)
    setError('')
    try {
      const data = await criarCheckoutAssinatura(planoId)
      window.location.assign(data.checkoutUrl)
    } catch (err) {
      setError(err.message)
    } finally {
      setCheckoutPlano('')
    }
  }

  const diasTrial = diasRestantesTrial(settings)
  const emTrial = trialAtivo(settings)
  const diasTotaisTrialValor = diasTotaisTrial(settings)

  return (
    <section className="space-y-8">
      <PageNav
        breadcrumbItems={[
          { label: 'Início', to: '/' },
          { label: 'Assinatura' },
        ]}
        backTo="/"
        backVariant="cifra"
      />

      <header className="rounded-2xl border border-[var(--crash-cifra)] bg-black/50 p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--crash-cifra)]">
          Comercial
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">
          Assinatura CRASH <span className="text-[#F97316]">Cifras</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--crash-texto-sec)]">
          Pagamento seguro via PIX ou cartão de crédito
        </p>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
          {loading ? (
            <span className="text-[var(--crash-texto-sec)]">Carregando assinatura…</span>
          ) : emTrial ? (
            <span className="text-white">
              Teste grátis · <strong>{diasTotaisTrialValor} dias</strong> ·{' '}
              <strong>
                {diasTrial} dia{diasTrial !== 1 ? 's' : ''} restante{diasTrial !== 1 ? 's' : ''}
              </strong>
            </span>
          ) : (
            <span className="text-white">
              Plano atual: <strong>{settings?.plano || 'gratuito'}</strong> · status:{' '}
              <strong>{settings?.assinatura_status || 'inativa'}</strong>
              {settings?.assinatura_expira_em &&
                ` · expira em ${new Date(settings.assinatura_expira_em).toLocaleDateString()}`}
            </span>
          )}
        </div>
      </header>

      {error && (
        <p className="rounded-lg border border-red-900/40 bg-red-950/20 p-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* Plano Equipe está temporariamente desabilitado; não mostrar checkout pendente antigo. */}
      {assinatura?.status === 'pendente' &&
        assinatura.checkout_url &&
        assinatura.plano !== 'equipe' && (
          <section className="rounded-xl border border-yellow-700/40 bg-yellow-950/20 p-4">
            <h2 className="font-semibold text-yellow-200">Renovar assinatura pendente</h2>
            <p className="mt-1 text-sm text-yellow-100/80">
              Encontramos um checkout pendente para o plano {assinatura.plano}.
            </p>
            <a
              href={assinatura.checkout_url}
              className={`mt-3 inline-block ${btnSecondaryClassName}`}
            >
              Continuar pagamento
            </a>
          </section>
        )}

      {!loading && settings?.assinatura_status === 'trial' && !trialAtivo(settings) && (
        <section className="rounded-xl border border-red-900/40 bg-red-950/20 p-4">
          <h2 className="font-semibold text-red-200">Seu teste grátis terminou</h2>
          <p className="mt-1 text-sm text-red-100/80">
            Escolha um plano para continuar usando o CRASH Cifras.
          </p>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <article className="flex flex-col rounded-2xl border border-[var(--crash-cifra)] bg-black/50 p-5">
          <h2 className="text-2xl font-bold text-white">{PLANO_SOLO.nome}</h2>
          <p className="mt-2 text-sm text-[var(--crash-texto-sec)]">{PLANO_SOLO.descricao}</p>
          <p className="mt-4 text-3xl font-bold text-[var(--crash-cifra)]">
            {formatPlanoPreco(PLANO_SOLO.price)}
            <span className="text-sm font-normal text-[var(--crash-texto-sec)]">/mês</span>
          </p>
          {PLANO_SOLO.trial_dias > 0 && (
            <p className="mt-2 text-sm font-semibold text-green-400">
              {PLANO_SOLO.trial_dias} dias grátis
            </p>
          )}
          <ul className="mt-4 flex-1 space-y-1.5 text-xs leading-relaxed text-[var(--crash-texto-sec)]">
            {PLANO_SOLO.recursos.map((recurso) => (
              <li key={recurso}>✅ {recurso}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => contratar(PLANO_SOLO.id)}
            disabled={checkoutPlano === PLANO_SOLO.id}
            className="mt-5 inline-flex items-center justify-center self-center rounded-lg bg-[var(--crash-primario)] px-[0.72rem] py-[0.36rem] text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
          >
            {checkoutPlano === PLANO_SOLO.id ? 'Gerando link…' : 'Assinar'}
          </button>
        </article>

        <article className="flex flex-col rounded-2xl border border-dashed border-zinc-600 bg-zinc-950/80 p-5 opacity-90">
          <span className="self-start rounded-full border border-zinc-600 bg-zinc-800/80 px-2.5 py-0.5 text-xs font-semibold text-zinc-400">
            Em breve · Junho 2025
          </span>
          <h2 className="mt-3 text-2xl font-bold text-zinc-300">{PLANO_EQUIPE.nome}</h2>
          <p className="mt-2 text-sm text-zinc-500">{PLANO_EQUIPE.descricao}</p>
          <p className="mt-4 text-3xl font-bold text-zinc-600">
            {formatPlanoPreco(PLANO_EQUIPE.price)}
            <span className="text-sm font-normal text-zinc-600">/mês</span>
          </p>
          <ul className="mt-4 flex-1 space-y-1.5 text-xs leading-relaxed text-zinc-500">
            {PLANO_EQUIPE.recursos.map((recurso) => (
              <li key={recurso} className="flex items-start gap-1.5">
                <span aria-hidden>🔒</span>
                <span>{recurso}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  )
}
