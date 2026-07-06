import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { inputOrangeClassName } from '../ui/inputClasses'

export const IntroducaoEditor = forwardRef(function IntroducaoEditor(
  { intro, onChange, variant = 'card' },
  ref,
) {
  const isFolha = variant === 'folha'
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

  const labelClassName = isFolha
    ? 'mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[var(--crash-texto-sec)]'
    : 'mb-1 block text-xs font-medium text-[var(--crash-texto-sec)]'

  const textareaClassName = isFolha
    ? 'w-full resize-none border-0 border-b border-white/10 bg-transparent px-0 py-1 font-cifra-mono text-base leading-snug text-white outline-none placeholder:text-[var(--crash-texto-sec)] focus:border-[var(--crash-cifra)]/50'
    : `${inputOrangeClassName} text-sm`

  const campos = (
    <div className={`grid gap-4 ${isFolha ? 'gap-5 sm:grid-cols-2 sm:gap-6' : 'sm:grid-cols-2'}`}>
      <div>
        <label className={labelClassName}>Mão esquerda</label>
        <textarea
          value={maoEsquerda}
          onChange={(e) => setMaoEsquerda(e.target.value)}
          onBlur={flush}
          rows={isFolha ? 3 : 4}
          className={textareaClassName}
          placeholder="Anotações da mão esquerda…"
        />
      </div>
      <div>
        <label className={labelClassName}>Mão direita</label>
        <textarea
          value={maoDireita}
          onChange={(e) => setMaoDireita(e.target.value)}
          onBlur={flush}
          rows={isFolha ? 3 : 4}
          className={textareaClassName}
          placeholder="Anotações da mão direita…"
        />
      </div>
    </div>
  )

  if (isFolha) {
    return (
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--crash-cifra)]">
          Introdução
        </h2>
        {campos}
      </section>
    )
  }

  return (
    <article className="rounded-xl border-2 border-orange-500 bg-black/40 p-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[var(--crash-cifra)]" />
        <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--crash-cifra)]">
          Introdução
        </h3>
      </div>
      {campos}
    </article>
  )
})
