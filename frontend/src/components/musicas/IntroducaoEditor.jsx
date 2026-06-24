import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { FUNCIONALIDADE_TOOLTIPS } from '../../lib/funcionalidadeTooltips'
import { InfoTooltip } from '../ui/InfoTooltip'
import { inputOrangeClassName } from '../ui/inputClasses'

export const IntroducaoEditor = forwardRef(function IntroducaoEditor(
  { intro, onChange },
  ref,
) {
  const [maoEsquerda, setMaoEsquerda] = useState(intro?.mao_esquerda || '')
  const [maoDireita, setMaoDireita] = useState(intro?.mao_direita || '')

  useEffect(() => {
    setMaoEsquerda(intro?.mao_esquerda || '')
    setMaoDireita(intro?.mao_direita || '')
  }, [intro?.mao_esquerda, intro?.mao_direita])

  function snapshot() {
    return { mao_esquerda: maoEsquerda, mao_direita: maoDireita }
  }

  function flush() {
    const next = snapshot()
    onChange(next)
    return next
  }

  useImperativeHandle(ref, () => ({ flush, snapshot }), [maoEsquerda, maoDireita, onChange])

  return (
    <article className="rounded-xl border-2 border-orange-500 bg-black/40 p-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[var(--crash-cifra)]" />
        <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--crash-cifra)]">
          Introdução
        </h3>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-[var(--crash-texto-sec)]">
        <span className="inline-flex items-center gap-1">
          ━ Tracinho
          <InfoTooltip text={FUNCIONALIDADE_TOOLTIPS.tracinho} label="Sobre tracinho" />
        </span>
        <span className="inline-flex items-center gap-1">
          / Barra
          <InfoTooltip text={FUNCIONALIDADE_TOOLTIPS.barraRitmo} label="Sobre barra rítmica" />
        </span>
        <span className="inline-flex items-center gap-1">
          Nota junta
          <InfoTooltip text={FUNCIONALIDADE_TOOLTIPS.notaJuntas} label="Sobre nota de passagem" />
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--crash-texto-sec)]">
            Mão esquerda
          </label>
          <textarea
            value={maoEsquerda}
            onChange={(e) => setMaoEsquerda(e.target.value)}
            onBlur={flush}
            rows={4}
            className={`${inputOrangeClassName} text-sm`}
            placeholder="Mão esquerda"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--crash-texto-sec)]">
            Mão direita
          </label>
          <textarea
            value={maoDireita}
            onChange={(e) => setMaoDireita(e.target.value)}
            onBlur={flush}
            rows={4}
            className={`${inputOrangeClassName} text-sm`}
            placeholder="Mão direita"
          />
        </div>
      </div>
    </article>
  )
})
