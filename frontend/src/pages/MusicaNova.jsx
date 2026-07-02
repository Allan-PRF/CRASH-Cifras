import { useEffect, useRef, useState } from 'react'
import { PageBackButton } from '../components/layout/PageBackButton'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EMPTY_LINHAS } from '@crash-cifras/shared/chord-schema'
import { IntroducaoEditor } from '../components/musicas/IntroducaoEditor'
import { SecaoEditor } from '../components/musicas/SecaoEditor'
import { FormField } from '../components/ui/FormField'
import {
  btnPrimaryClassName,
  btnSecondaryClassName,
  inputClassName,
  selectClassName,
} from '../components/ui/inputClasses'
import { TODOS_TONS } from '../lib/tons'
import { normalizarIntroParaCopia } from '../lib/copiarMusicaHelpers'
import { createMusica } from '../services/musicas'
import { fetchMinistroById } from '../services/ministros'

export function MusicaNova() {
  const { ministroId } = useParams()
  const navigate = useNavigate()
  const [titulo, setTitulo] = useState('')
  const [artista, setArtista] = useState('')
  const [tomOriginal, setTomOriginal] = useState('')
  const [bpm, setBpm] = useState('')
  const [intro, setIntro] = useState({ mao_esquerda: '', mao_direita: '' })
  const [secoes, setSecoes] = useState([
    {
      id: null,
      slug: 'verso',
      nome: 'Verso 1',
      ordem_original: 0,
      linhas: EMPTY_LINHAS,
    },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ministroNome, setMinistroNome] = useState('')
  const introEditorRef = useRef(null)

  useEffect(() => {
    if (!ministroId) return
    fetchMinistroById(ministroId)
      .then((m) => setMinistroNome(m.nome))
      .catch(() => {})
  }, [ministroId])

  function addSecao() {
    const n = secoes.length + 1
    setSecoes([
      ...secoes,
      {
        id: null,
        slug: 'verso',
        nome: `Verso ${n}`,
        ordem_original: secoes.length,
        linhas: EMPTY_LINHAS,
      },
    ])
  }

  async function handleRemoveSecao(index) {
    setSecoes(secoes.filter((_, i) => i !== index))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!titulo.trim()) {
      setError('Informe o título')
      return
    }
    setSaving(true)
    setError('')
    try {
      const bpmNum =
        bpm !== '' && Number(bpm) >= 1 ? Math.floor(Number(bpm)) : null
      const introAtual = introEditorRef.current?.flush() ?? intro
      const introToSave = normalizarIntroParaCopia(introAtual)

      const musica = await createMusica({
        ministroId,
        titulo,
        artista,
        tomOriginal: tomOriginal || null,
        bpm: bpmNum,
        intro: introToSave,
        secoesIniciais: secoes.map((sec, i) => ({
          ...sec,
          ordem_original: i,
        })),
      })
      navigate(`/musica/${musica.id}/editar`, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-3">
        <PageBackButton
          to={ministroId ? `/ministro/${ministroId}` : '/'}
          variant="cifra"
        />
        <h1 className="text-2xl font-bold text-white">Nova música</h1>
        {ministroNome && (
          <p className="text-sm text-[var(--crash-texto-sec)]">
            Ministro: {ministroNome}
          </p>
        )}
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Título *">
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className={inputClassName}
            />
          </FormField>
          <FormField label="Artista">
            <input
              type="text"
              value={artista}
              onChange={(e) => setArtista(e.target.value)}
              className={inputClassName}
            />
          </FormField>
          <FormField label="Tom original">
            <select
              value={tomOriginal}
              onChange={(e) => setTomOriginal(e.target.value)}
              className={selectClassName}
            >
              <option value="">—</option>
              {TODOS_TONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="BPM">
            <input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={bpm}
              onChange={(e) => {
                const raw = e.target.value
                if (raw === '') {
                  setBpm('')
                  return
                }
                const n = Number(raw)
                if (!Number.isFinite(n) || n < 1) return
                setBpm(String(Math.floor(n)))
              }}
              onKeyDown={(e) => {
                if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
                  e.preventDefault()
                }
              }}
              className={inputClassName}
            />
          </FormField>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Seções</h2>
          <button
            type="button"
            onClick={addSecao}
            className={btnSecondaryClassName}
          >
            + Seção
          </button>
        </div>

        <div className="space-y-4">
          <IntroducaoEditor ref={introEditorRef} intro={intro} onChange={setIntro} />

          {secoes.map((sec, index) => (
            <SecaoEditor
              key={sec.id || `new-${index}`}
              secao={sec}
              onChange={(updated) => {
                const next = [...secoes]
                next[index] = updated
                setSecoes(next)
              }}
              onRemove={
                secoes.length > 1
                  ? () => handleRemoveSecao(index)
                  : undefined
              }
            />
          ))}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3">
          <Link
            to={ministroId ? `/ministro/${ministroId}` : '/'}
            className={`flex-1 text-center ${btnSecondaryClassName}`}
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className={`flex-1 ${btnPrimaryClassName}`}
          >
            {saving ? 'Criando…' : 'Criar e editar cifra'}
          </button>
        </div>
      </form>
    </section>
  )
}
