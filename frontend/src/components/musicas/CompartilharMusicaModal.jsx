import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TranspositorTom } from '../cifra/TranspositorTom'
import { FormField } from '../ui/FormField'
import { InfoTooltip } from '../ui/InfoTooltip'
import { FUNCIONALIDADE_TOOLTIPS } from '../../lib/funcionalidadeTooltips'
import {
  btnPrimaryClassName,
  btnSecondaryClassName,
  selectClassName,
} from '../ui/inputClasses'
import { copiarMusica } from '../../services/musicas'

function SimNao({ label, value, onChange }) {
  return (
    <FormField label={label}>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
            value === true
              ? 'border-[var(--crash-cifra)] bg-[var(--crash-cifra)]/15 text-[var(--crash-cifra)]'
              : 'border-[var(--crash-borda)] text-[var(--crash-texto-sec)] hover:border-white/30'
          }`}
        >
          Sim
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
            value === false
              ? 'border-[var(--crash-cifra)] bg-[var(--crash-cifra)]/15 text-[var(--crash-cifra)]'
              : 'border-[var(--crash-borda)] text-[var(--crash-texto-sec)] hover:border-white/30'
          }`}
        >
          Não
        </button>
      </div>
    </FormField>
  )
}

function OpcoesTom({ ministroDestino, tomOriginal, onPadrao, onEscolher, onNao }) {
  return (
    <FormField label="Deseja alterar o tom da música?">
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onPadrao}
          className="rounded-lg border border-[var(--crash-borda)] px-3 py-2.5 text-left text-sm font-medium text-white transition hover:border-[var(--crash-cifra)] hover:text-[var(--crash-cifra)]"
        >
          Sim — tom padrão do ministro
          {ministroDestino?.tom_padrao ? (
            <span className="ml-1 text-[var(--crash-cifra)]">({ministroDestino.tom_padrao})</span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={onEscolher}
          className="rounded-lg border border-[var(--crash-borda)] px-3 py-2.5 text-left text-sm font-medium text-white transition hover:border-[var(--crash-cifra)] hover:text-[var(--crash-cifra)]"
        >
          Escolher outro tom
        </button>
        <button
          type="button"
          onClick={onNao}
          className="rounded-lg border border-[var(--crash-borda)] px-3 py-2.5 text-left text-sm font-medium text-white transition hover:border-[var(--crash-borda)] hover:bg-white/5"
        >
          Não
        </button>
      </div>
      {tomOriginal && (
        <p className="mt-2 text-xs text-[var(--crash-texto-sec)]">
          Tom atual: <span className="text-[var(--crash-cifra)]">{tomOriginal}</span>
        </p>
      )}
    </FormField>
  )
}

export function CompartilharMusicaModal({
  open,
  musica,
  ministros,
  ministroAtualId,
  onClose,
  onCopied,
  titulo = 'Compartilhar música',
  modo = 'ministro',
  confirmLabel = 'Copiar música',
}) {
  const navigate = useNavigate()
  const isGlobal = modo === 'global'

  const [ministroDestinoId, setMinistroDestinoId] = useState('')
  const [revisarAntes, setRevisarAntes] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [passo, setPasso] = useState('ministro')
  const [opcaoTom, setOpcaoTom] = useState(null)
  const [tomEscolhido, setTomEscolhido] = useState(null)
  const [copiaCriada, setCopiaCriada] = useState(null)

  const opcoes = ministros.filter((m) => m.id !== ministroAtualId)

  useEffect(() => {
    if (!open) return
    const destinos = ministros.filter((m) => m.id !== ministroAtualId)
    setMinistroDestinoId(destinos.length === 1 ? destinos[0].id : '')
    setRevisarAntes(null)
    setError('')
    setLoading(false)
    setPasso('ministro')
    setOpcaoTom(null)
    setTomEscolhido(musica?.tom_original || null)
    setCopiaCriada(null)
  }, [open, ministroAtualId, ministros, musica?.tom_original])

  if (!open || !musica) return null

  async function executarCopia({ revisar }) {
    setLoading(true)
    setError('')
    try {
      const copia = await copiarMusica(musica.id, {
        ministroIdDestino: ministroDestinoId,
        transporParaTomPadrao: opcaoTom === 'padrao',
        tomDestino: opcaoTom === 'manual' ? tomEscolhido : undefined,
      })
      console.log('[compartilhar] cópia criada:', copia.id, copia.titulo)
      onCopied?.(copia)
      if (revisar) {
        onClose()
        navigate(`/musica/${copia.id}/editar`)
        return
      }
      if (isGlobal) {
        setCopiaCriada(copia)
        setPasso('sucesso')
      } else {
        onClose()
      }
    } catch (err) {
      setError(err.message || 'Não foi possível copiar a música.')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmitMinistro(e) {
    e.preventDefault()
    if (!ministroDestinoId) {
      setError('Selecione o ministro de destino.')
      return
    }
    setError('')
    setPasso('alterar-tom')
  }

  function handleOpcaoTom(opcao) {
    setOpcaoTom(opcao)
    setError('')
    if (opcao === 'manual') {
      setTomEscolhido(musica.tom_original || null)
      setPasso('escolher-tom')
    } else {
      setPasso('revisar')
    }
  }

  function handleContinuarTom() {
    if (!tomEscolhido) {
      setError('Selecione o tom desejado.')
      return
    }
    setError('')
    setPasso('revisar')
  }

  async function handleConfirmar() {
    if (revisarAntes === null) {
      setError('Escolha se deseja revisar antes de salvar.')
      return
    }
    await executarCopia({ revisar: revisarAntes })
  }

  function handleClose() {
    if (loading) return
    onClose()
  }

  const ministroDestino = ministros.find((m) => m.id === ministroDestinoId)
  const modalLargo = passo === 'escolher-tom' || passo === 'sucesso'

  function resumoTomCopia() {
    if (opcaoTom === 'padrao') {
      if (ministroDestino?.tom_padrao) {
        return ministroDestino.tom_padrao
      }
      return musica.tom_original || '—'
    }
    if (opcaoTom === 'manual' && tomEscolhido) {
      return tomEscolhido
    }
    return musica.tom_original || '—'
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compartilhar-musica-title"
      onClick={handleClose}
    >
      <div
        className={`my-4 w-full rounded-2xl border border-[var(--crash-borda)] bg-[var(--crash-fundo-card)] p-6 shadow-xl ${
          modalLargo ? 'max-w-xl' : 'max-w-md'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="compartilhar-musica-title" className="inline-flex items-center gap-1 text-lg font-bold text-white">
          {titulo}
          <InfoTooltip
            text={FUNCIONALIDADE_TOOLTIPS.copiarCena}
            label="Sobre copiar para outro ministro"
          />
        </h2>
        <p className="mt-2 text-sm text-[var(--crash-texto-sec)]">
          Copiar <span className="font-medium text-white">{musica.titulo}</span>
          {ministroDestino ? (
            <> para <span className="font-medium text-white">{ministroDestino.nome}</span></>
          ) : (
            ' para outra pasta'
          )}
          . A original permanece onde está.
        </p>

        {passo === 'ministro' && (
          <form onSubmit={handleSubmitMinistro} className="mt-5 space-y-4">
            <FormField label="Copiar para">
              <select
                required
                value={ministroDestinoId}
                onChange={(e) => setMinistroDestinoId(e.target.value)}
                className={selectClassName}
              >
                <option value="">Selecione…</option>
                {opcoes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                    {m.tom_padrao ? ` · ${m.tom_padrao}` : ''}
                  </option>
                ))}
              </select>
            </FormField>

            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={handleClose} disabled={loading} className={btnSecondaryClassName}>
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || opcoes.length === 0}
                className={btnPrimaryClassName}
              >
                Continuar
              </button>
            </div>

            {opcoes.length === 0 && (
              <p className="text-xs text-[var(--crash-texto-sec)]">
                Crie outro ministro para compartilhar músicas entre pastas.
              </p>
            )}
          </form>
        )}

        {passo === 'alterar-tom' && (
          <div className="mt-5 space-y-4">
            <OpcoesTom
              ministroDestino={ministroDestino}
              tomOriginal={musica.tom_original}
              onPadrao={() => handleOpcaoTom('padrao')}
              onEscolher={() => handleOpcaoTom('manual')}
              onNao={() => handleOpcaoTom('nao')}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setPasso('ministro')}
                className={btnSecondaryClassName}
              >
                Voltar
              </button>
            </div>
          </div>
        )}

        {passo === 'escolher-tom' && (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-[var(--crash-texto-sec)]">Escolha o tom desejado:</p>
            <TranspositorTom
              tomAtual={tomEscolhido}
              onSelectTom={setTomEscolhido}
            />
            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setPasso('alterar-tom')}
                className={btnSecondaryClassName}
              >
                Voltar
              </button>
              <button type="button" onClick={handleContinuarTom} className={btnPrimaryClassName}>
                Continuar
              </button>
            </div>
          </div>
        )}

        {passo === 'revisar' && (
          <div className="mt-5 space-y-4">
            <p className="text-xs text-[var(--crash-texto-sec)]">
              Tom da cópia:{' '}
              <span className="text-[var(--crash-cifra)]">{resumoTomCopia()}</span>
              {opcaoTom === 'nao' && musica.tom_original ? ' (original)' : null}
              {opcaoTom === 'padrao' && ministroDestino?.tom_padrao ? ' (padrão do ministro)' : null}
            </p>
            <SimNao
              label="Deseja revisar antes de salvar?"
              value={revisarAntes}
              onChange={setRevisarAntes}
            />
            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setPasso(opcaoTom === 'manual' ? 'escolher-tom' : 'alterar-tom')}
                disabled={loading}
                className={btnSecondaryClassName}
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmar}
                disabled={loading}
                className={btnPrimaryClassName}
              >
                {loading ? 'Copiando…' : confirmLabel}
              </button>
            </div>
          </div>
        )}

        {passo === 'sucesso' && copiaCriada && (
          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-green-800/40 bg-green-950/25 p-4">
              <p className="text-sm font-semibold text-green-400">Música copiada com sucesso!</p>
              <p className="mt-1 text-sm text-white">
                {copiaCriada.titulo} foi salva na pasta de {ministroDestino?.nome || 'destino'}.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={handleClose} className={btnSecondaryClassName}>
                Fechar
              </button>
              <Link to={`/musica/${copiaCriada.id}`} className={btnPrimaryClassName}>
                Abrir música
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
