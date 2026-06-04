import {
  INSTRUMENTOS,
  EQUIPE_MAX_MUSICOS,
  EQUIPE_MAX_MESA,
} from '@crash-cifras/shared/constants'
import { useCallback, useEffect, useState } from 'react'
import {
  btnPrimaryClassName,
  btnSecondaryClassName,
  cardClassName,
  inputClassName,
  selectClassName,
} from '../ui/inputClasses'
import { useUserSettings } from '../../hooks/useUserSettings'
import { planoAtende, planoEfetivo } from '../../lib/planos'
import {
  criarEquipe,
  entrarEquipe,
  excluirEquipe,
  fetchMinhaEquipe,
  removerMembro,
  sairEquipe,
} from '../../services/equipes'

function StatusDot({ online }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${online ? 'bg-green-400' : 'bg-zinc-600'}`}
      title={online ? 'Online' : 'Offline'}
    />
  )
}

function nomeInstrumento(id) {
  return INSTRUMENTOS.find((i) => i.id === id)?.nome || id
}

function MembroLinha({ membro, isLider, onRemover }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2">
      <div className="flex items-center gap-2.5 min-w-0">
        <StatusDot online={membro.status_online} />
        <span className="truncate text-sm text-white">{membro.display_name}</span>
        <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">
          {nomeInstrumento(membro.instrumento)}
        </span>
        {membro.tipo === 'lider' && (
          <span className="shrink-0 rounded bg-[var(--crash-cifra)]/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[var(--crash-cifra)]">
            Líder
          </span>
        )}
      </div>
      {isLider && membro.tipo !== 'lider' && (
        <button
          type="button"
          onClick={() => onRemover(membro.id)}
          className="text-xs text-red-400 hover:text-red-300"
        >
          Remover
        </button>
      )}
    </li>
  )
}

function EquipePainel({ equipe, membros, meuTipo, onReload }) {
  const [removendo, setRemovendo] = useState('')
  const [excluindo, setExcluindo] = useState(false)
  const [saindo, setSaindo] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const isLider = meuTipo === 'lider'
  const totalMusicos = membros.filter((m) => m.tipo === 'musico').length
  const totalMesa = membros.filter((m) => m.tipo === 'mesa').length

  async function handleRemover(membroId) {
    if (!confirm('Remover este membro da equipe?')) return
    setRemovendo(membroId)
    setError('')
    try {
      await removerMembro(membroId)
      onReload()
    } catch (err) {
      setError(err.message)
    } finally {
      setRemovendo('')
    }
  }

  async function handleExcluir() {
    if (!confirm('Excluir a equipe permanentemente? Todos os membros serão removidos.')) return
    setExcluindo(true)
    setError('')
    try {
      await excluirEquipe()
      onReload()
    } catch (err) {
      setError(err.message)
    } finally {
      setExcluindo(false)
    }
  }

  async function handleSair() {
    if (!confirm('Sair da equipe?')) return
    setSaindo(true)
    setError('')
    try {
      await sairEquipe()
      onReload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaindo(false)
    }
  }

  function copiarCodigo() {
    const url = `${window.location.origin}/conta?equipe=${equipe.codigo}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">{equipe.nome}</h3>
          <p className="text-xs text-zinc-400">
            {isLider ? 'Você é o líder' : 'Você é membro'}
          </p>
        </div>
        {isLider && (
          <button
            type="button"
            onClick={copiarCodigo}
            className={`shrink-0 text-xs ${btnSecondaryClassName}`}
          >
            {copied ? 'Link copiado!' : `Convidar (${equipe.codigo})`}
          </button>
        )}
      </div>

      <div className="text-xs text-zinc-500">
        Músicos: {totalMusicos}/{EQUIPE_MAX_MUSICOS} · Mesa: {totalMesa}/{EQUIPE_MAX_MESA}
      </div>

      <ul className="space-y-1.5">
        {membros.map((m) => (
          <MembroLinha
            key={m.id}
            membro={m}
            isLider={isLider}
            onRemover={handleRemover}
          />
        ))}
      </ul>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <div className="pt-2">
        {isLider ? (
          <button
            type="button"
            onClick={handleExcluir}
            disabled={excluindo}
            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            {excluindo ? 'Excluindo…' : 'Excluir equipe'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSair}
            disabled={saindo}
            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            {saindo ? 'Saindo…' : 'Sair da equipe'}
          </button>
        )}
      </div>
    </div>
  )
}

function CriarEquipeForm({ onReload }) {
  const [nome, setNome] = useState('')
  const [instrumento, setInstrumento] = useState('voz')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nome.trim()) return
    setLoading(true)
    setError('')
    try {
      await criarEquipe(nome.trim(), instrumento)
      onReload()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm text-zinc-400">
        Crie uma equipe e convide músicos com o código gerado.
      </p>
      <input
        type="text"
        placeholder="Nome da equipe (ex: Banda Graça)"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        className={inputClassName}
        maxLength={40}
      />
      <select
        value={instrumento}
        onChange={(e) => setInstrumento(e.target.value)}
        className={selectClassName}
      >
        {INSTRUMENTOS.map((i) => (
          <option key={i.id} value={i.id}>{i.nome}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button type="submit" disabled={loading || !nome.trim()} className={btnPrimaryClassName}>
        {loading ? 'Criando…' : 'Criar equipe'}
      </button>
    </form>
  )
}

function EntrarEquipeForm({ onReload, codigoInicial }) {
  const [codigo, setCodigo] = useState(codigoInicial || '')
  const [instrumento, setInstrumento] = useState('voz')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!codigo.trim()) return
    setLoading(true)
    setError('')
    try {
      await entrarEquipe(codigo.trim(), instrumento)
      onReload()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm text-zinc-400">
        Cole o código de 6 caracteres enviado pelo líder.
      </p>
      <input
        type="text"
        placeholder="Código da equipe (ex: A3B7K9)"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.toUpperCase().slice(0, 6))}
        className={inputClassName}
        maxLength={6}
        style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}
      />
      <select
        value={instrumento}
        onChange={(e) => setInstrumento(e.target.value)}
        className={selectClassName}
      >
        {INSTRUMENTOS.map((i) => (
          <option key={i.id} value={i.id}>{i.nome}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button type="submit" disabled={loading || codigo.length !== 6} className={btnPrimaryClassName}>
        {loading ? 'Entrando…' : 'Entrar na equipe'}
      </button>
    </form>
  )
}

export function MinhaEquipe() {
  const { settings, loading: loadingSettings } = useUserSettings()
  const [equipeData, setEquipeData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modo, setModo] = useState(null)

  const codigoUrl = new URLSearchParams(window.location.search).get('equipe') || ''

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchMinhaEquipe()
      setEquipeData(data)
      setModo(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loadingSettings) return null

  const plano = planoEfetivo(settings)
  const isEquipe = planoAtende(plano, 'equipe')
  const temEquipe = equipeData?.equipe != null

  return (
    <section className={`${cardClassName} p-5`}>
      <h2 className="mb-4 text-base font-bold text-white">Minha Equipe</h2>

      {loading ? (
        <p className="text-sm text-zinc-400">Carregando…</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : temEquipe ? (
        <EquipePainel
          equipe={equipeData.equipe}
          membros={equipeData.membros}
          meuTipo={equipeData.meuTipo}
          onReload={load}
        />
      ) : (
        <div className="space-y-4">
          {!isEquipe && (
            <p className="rounded-lg border border-yellow-800/40 bg-yellow-950/20 px-3 py-2 text-xs text-yellow-200">
              Você pode entrar em uma equipe existente com qualquer plano.
              Para criar uma equipe, é necessário o plano Equipe.
            </p>
          )}

          {!modo && (
            <div className="flex flex-col gap-2 sm:flex-row">
              {isEquipe && (
                <button
                  type="button"
                  onClick={() => setModo('criar')}
                  className={btnPrimaryClassName}
                >
                  Criar equipe
                </button>
              )}
              <button
                type="button"
                onClick={() => setModo('entrar')}
                className={btnSecondaryClassName}
              >
                Entrar em uma equipe
              </button>
            </div>
          )}

          {modo === 'criar' && <CriarEquipeForm onReload={load} />}
          {modo === 'entrar' && <EntrarEquipeForm onReload={load} codigoInicial={codigoUrl} />}

          {modo && (
            <button
              type="button"
              onClick={() => setModo(null)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Cancelar
            </button>
          )}
        </div>
      )}
    </section>
  )
}
