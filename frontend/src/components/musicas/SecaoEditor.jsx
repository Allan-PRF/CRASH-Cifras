import { useEffect, useState } from 'react'
import { SECAO_SLUGS } from '@crash-cifras/shared/constants'
import { isSecaoLinhas } from '@crash-cifras/shared/chord-schema'
import { linhasToEditorText, parseChordLyricBlock } from '../../lib/parseCifra'
import { FormField } from '../ui/FormField'
import { inputOrangeClassName, selectOrangeClassName } from '../ui/inputClasses'

const SLUG_LABELS = {
  intro: 'Intro',
  verso: 'Verso',
  pre_refrao: 'Pré-Refrão',
  refrao: 'Refrão',
  ponte: 'Ponte',
  outro: 'Outro',
}

export function SecaoEditor({ secao, onChange, onRemove }) {
  const [nome, setNome] = useState(secao.nome)
  const [slug, setSlug] = useState(secao.slug)
  const [chordsText, setChordsText] = useState('')
  const [lyricsText, setLyricsText] = useState('')

  useEffect(() => {
    setNome(secao.nome)
    setSlug(secao.slug)
    if (isSecaoLinhas(secao.linhas)) {
      const { chords, lyrics } = linhasToEditorText(secao.linhas)
      setChordsText(chords)
      setLyricsText(lyrics)
    }
  }, [secao])

  function emit(linhasOverride) {
    const linhas =
      linhasOverride ?? parseChordLyricBlock(chordsText, lyricsText)
    onChange({
      ...secao,
      nome: nome.trim() || 'Seção',
      slug,
      linhas,
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
            Remover
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Linha de cifras" hint="Acordes separados por espaços">
          <textarea
            value={chordsText}
            onChange={(e) => setChordsText(e.target.value)}
            onBlur={() => emit()}
            rows={6}
            className={`${inputOrangeClassName} font-mono text-sm`}
            placeholder={'Em              G               D'}
          />
        </FormField>
        <FormField label="Linha da letra">
          <textarea
            value={lyricsText}
            onChange={(e) => setLyricsText(e.target.value)}
            onBlur={() => emit()}
            rows={6}
            className={`${inputOrangeClassName} text-sm`}
            placeholder="Envolto em tua presença..."
          />
        </FormField>
      </div>
    </article>
  )
}
