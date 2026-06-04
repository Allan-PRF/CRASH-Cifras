import { useEffect, useState } from 'react'
import { inputOrangeClassName } from '../ui/inputClasses'

export function IntroducaoEditor({ intro, onChange }) {
  const [maoEsquerda, setMaoEsquerda] = useState(intro?.mao_esquerda || '')
  const [maoDireita, setMaoDireita] = useState(intro?.mao_direita || '')

  useEffect(() => {
    setMaoEsquerda(intro?.mao_esquerda || '')
    setMaoDireita(intro?.mao_direita || '')
  }, [intro?.mao_esquerda, intro?.mao_direita])

  function emit(field, value) {
    const next = {
      mao_esquerda: field === 'mao_esquerda' ? value : maoEsquerda,
      mao_direita: field === 'mao_direita' ? value : maoDireita,
    }
    onChange(next)
  }

  return (
    <article className="rounded-xl border-2 border-orange-500 bg-black/40 p-4">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[var(--crash-cifra)]" />
        <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--crash-cifra)]">
          Introdução
        </h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--crash-texto-sec)]">
            Mão esquerda
          </label>
          <textarea
            value={maoEsquerda}
            onChange={(e) => setMaoEsquerda(e.target.value)}
            onBlur={() => emit('mao_esquerda', maoEsquerda)}
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
            onBlur={() => emit('mao_direita', maoDireita)}
            rows={4}
            className={`${inputOrangeClassName} text-sm`}
            placeholder="Mão direita"
          />
        </div>
      </div>
    </article>
  )
}
