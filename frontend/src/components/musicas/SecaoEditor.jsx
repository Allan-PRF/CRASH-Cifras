import { useEffect, useState } from 'react'
import { EMPTY_LINHAS, isSecaoLinhas, normalizeChordLine } from '@crash-cifras/shared/chord-schema'
import { serializeChordLine } from '../../lib/cifraEdit'
import { FormField } from '../ui/FormField'
import { inputOrangeClassName, selectOrangeClassName } from '../ui/inputClasses'
import { SECAO_SLUGS } from '@crash-cifras/shared/constants'
import { CifraSecaoEditorVisual } from './CifraSecaoEditorVisual.jsx'

const SLUG_LABELS = {
  intro: 'Intro',
  verso: 'Verso',
  pre_refrao: 'Pré-Refrão',
  refrao: 'Refrão',
  ponte: 'Ponte',
  outro: 'Outro',
}

function normalizeLinhasForEditor(linhas) {
  if (!isSecaoLinhas(linhas)) return EMPTY_LINHAS
  return {
    lines: linhas.lines.map((line) => {
      const n = normalizeChordLine(line)
      return serializeChordLine(n.lyricLine, n.chords)
    }),
  }
}

export function SecaoEditor({ secao, onChange, onRemove }) {
  const [nome, setNome] = useState(secao.nome)
  const [slug, setSlug] = useState(secao.slug)
  const [linhas, setLinhas] = useState(() => normalizeLinhasForEditor(secao.linhas))

  useEffect(() => {
    setNome(secao.nome)
    setSlug(secao.slug)
  }, [secao.nome, secao.slug])

  useEffect(() => {
    setLinhas(normalizeLinhasForEditor(secao.linhas))
  }, [secao.id])

  function emit(partial = {}) {
    onChange({
      ...secao,
      nome: (partial.nome ?? nome).trim() || 'Seção',
      slug: partial.slug ?? slug,
      linhas: partial.linhas ?? linhas,
    })
  }

  return (
    <article className="rounded-xl border-2 border-orange-500 bg-black/40 p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-1 flex-wrap gap-3">
          <FormField label="Nome">
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onBlur={() => emit()}
              className={inputOrangeClassName}
            />
          </FormField>
          <FormField label="Tipo">
            <select
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              onBlur={() => emit()}
              className={selectOrangeClassName}
            >
              {SECAO_SLUGS.map((s) => (
                <option key={s} value={s}>
                  {SLUG_LABELS[s]}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-sm text-red-400 hover:underline"
          >
            Remover seção
          </button>
        )}
      </div>

      <FormField
        label="Cifra e letra"
        hint="Edite a letra abaixo de cada acorde. Enter cria nova linha. Remover linha enxuga repetições."
      >
        <CifraSecaoEditorVisual
          linhas={linhas}
          onChange={(nextLinhas) => {
            setLinhas(nextLinhas)
            emit({ linhas: nextLinhas })
          }}
        />
      </FormField>
    </article>
  )
}
