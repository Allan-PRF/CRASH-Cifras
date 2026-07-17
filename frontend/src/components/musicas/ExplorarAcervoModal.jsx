import { useEffect, useMemo, useState } from 'react'
import {
  btnCifraConfirmClassName,
  btnCifraOutlineClassName,
  inputClassName,
  selectClassName,
} from '../ui/inputClasses'
import {
  buscarAcervoCatalogo,
  buscarItemAcervoCatalogo,
} from '../../services/acervo'
import { createMusica } from '../../services/musicas'

function introDaCifra(cifra) {
  const intro = cifra?.intro
  if (!intro || typeof intro !== 'object') return null
  const maoEsquerda = String(intro.mao_esquerda ?? '').trim()
  const maoDireita = String(intro.mao_direita ?? '').trim()
  if (!maoEsquerda && !maoDireita) return null
  return { mao_esquerda: maoEsquerda, mao_direita: maoDireita }
}

function linhasPreview(secoes) {
  return (secoes || [])
    .filter((secao) => secao.slug !== 'intro')
    .flatMap((secao) => secao.linhas?.lines || [])
    .map((linha) =>
      String(
        linha?.lyricLine ??
          linha?.lyric ??
          linha?.letra ??
          linha?.text ??
          '',
      ).trim(),
    )
    .filter(Boolean)
    .slice(0, 6)
}

export function ExplorarAcervoModal({
  open,
  ministros,
  ministroInicialId = '',
  onClose,
  onMusicaAdicionada,
}) {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [ministroId, setMinistroId] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [detailById, setDetailById] = useState({})
  const [detailLoadingId, setDetailLoadingId] = useState(null)
  const [adicionandoId, setAdicionandoId] = useState(null)
  const [adicionados, setAdicionados] = useState({})

  useEffect(() => {
    if (!open) return
    const inicialExiste = ministros.some((ministro) => ministro.id === ministroInicialId)
    setMinistroId(inicialExiste ? ministroInicialId : (ministros[0]?.id ?? ''))
    setQuery('')
    setResultados([])
    setStatus('idle')
    setError('')
    setExpandedId(null)
    setDetailById({})
    setAdicionados({})
  }, [open, ministroInicialId, ministros])

  useEffect(() => {
    if (!open) return undefined
    function fecharComEscape(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', fecharComEscape)
    return () => window.removeEventListener('keydown', fecharComEscape)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return undefined
    const termo = query.trim()
    if (termo.length < 2) {
      setResultados([])
      setStatus('idle')
      setError('')
      return undefined
    }

    let cancelled = false
    const timer = window.setTimeout(async () => {
      setStatus('loading')
      setError('')
      try {
        const response = await buscarAcervoCatalogo({ q: termo, limit: 30 })
        if (!cancelled) {
          setResultados(response.resultados || [])
          setStatus('done')
        }
      } catch (err) {
        if (!cancelled) {
          setResultados([])
          setError(err.message || 'Não foi possível buscar no acervo.')
          setStatus('error')
        }
      }
    }, 350)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [open, query])

  const ministroSelecionado = useMemo(
    () => ministros.find((ministro) => ministro.id === ministroId) || null,
    [ministros, ministroId],
  )

  async function carregarDetalhe(item) {
    if (detailById[item.id]) return detailById[item.id]
    setDetailLoadingId(item.id)
    setError('')
    try {
      const detail = await buscarItemAcervoCatalogo(item.id)
      setDetailById((atual) => ({ ...atual, [item.id]: detail }))
      return detail
    } catch (err) {
      setError(err.message || 'Não foi possível abrir esta cifra.')
      return null
    } finally {
      setDetailLoadingId(null)
    }
  }

  async function togglePreview(item) {
    if (expandedId === item.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(item.id)
    await carregarDetalhe(item)
  }

  async function adicionarAPasta(item) {
    if (!ministroSelecionado) {
      setError('Crie ou selecione uma pasta de ministro antes de adicionar.')
      return
    }

    setAdicionandoId(item.id)
    setError('')
    try {
      const detail = await carregarDetalhe(item)
      if (!detail?.versao) return
      const secoes = (detail.versao.secoes || []).filter((secao) => secao.slug !== 'intro')
      const musica = await createMusica({
        ministroId: ministroSelecionado.id,
        titulo: detail.musica.titulo,
        artista: detail.musica.artista,
        tomOriginal: detail.versao.tom_original,
        bpm: detail.versao.bpm,
        intro: introDaCifra(detail.versao.cifra),
        youtubeUrl: detail.musica.fonte_url,
        secoesIniciais: secoes,
        acervoVersaoId: detail.versao.id,
        importStatus: 'ready',
      })
      setAdicionados((atual) => ({
        ...atual,
        [item.id]: ministroSelecionado.nome,
      }))
      onMusicaAdicionada?.(musica, ministroSelecionado.id)
    } catch (err) {
      setError(err.message || 'Não foi possível adicionar a música à pasta.')
    } finally {
      setAdicionandoId(null)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="explorar-acervo-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92svh] w-full max-w-2xl flex-col rounded-t-2xl border border-[var(--crash-cifra)]/40 bg-[var(--crash-fundo-card)] shadow-2xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 border-b border-white/10 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="explorar-acervo-title" className="text-lg font-bold text-white">
                Explorar acervo
              </h2>
              <p className="mt-1 text-xs text-[var(--crash-texto-sec)]">
                Encontre cifras prontas por título ou artista e adicione à sua pasta.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-xl text-[var(--crash-texto-sec)] hover:bg-white/10 hover:text-white"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_220px]">
            <label>
              <span className="sr-only">Buscar no acervo</span>
              <input
                type="search"
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Título ou artista…"
                className={inputClassName}
              />
            </label>
            <label>
              <span className="sr-only">Pasta de destino</span>
              <select
                value={ministroId}
                onChange={(event) => setMinistroId(event.target.value)}
                className={selectClassName}
                disabled={!ministros.length}
              >
                {!ministros.length && <option value="">Nenhuma pasta criada</option>}
                {ministros.map((ministro) => (
                  <option key={ministro.id} value={ministro.id}>
                    Pasta: {ministro.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <p className="mb-3 rounded-lg border border-red-800/50 bg-red-950/30 p-3 text-sm text-red-300">
              {error}
            </p>
          )}

          {query.trim().length < 2 && (
            <p className="py-10 text-center text-sm text-[var(--crash-texto-sec)]">
              Digite ao menos 2 caracteres para pesquisar.
            </p>
          )}

          {status === 'loading' && (
            <p className="py-10 text-center text-sm text-[var(--crash-texto-sec)]">
              Buscando no acervo…
            </p>
          )}

          {status === 'done' && resultados.length === 0 && (
            <p className="py-10 text-center text-sm text-[var(--crash-texto-sec)]">
              Nenhuma cifra pronta encontrada.
            </p>
          )}

          {resultados.length > 0 && (
            <ul className="space-y-3">
              {resultados.map((item) => {
                const detail = detailById[item.id]
                const expanded = expandedId === item.id
                const adicionadoEm = adicionados[item.id]
                return (
                  <li
                    key={item.id}
                    className="rounded-xl border border-white/10 bg-black/30 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-white">{item.titulo}</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              item.tem_versao_comunidade
                                ? 'bg-green-900/35 text-green-300'
                                : 'bg-amber-900/35 text-amber-300'
                            }`}
                          >
                            {item.tem_versao_comunidade
                              ? 'Versão da comunidade'
                              : 'Base do acervo'}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--crash-texto-sec)]">
                          {item.artista || 'Artista não informado'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => togglePreview(item)}
                          className={btnCifraOutlineClassName}
                          disabled={detailLoadingId === item.id}
                        >
                          {detailLoadingId === item.id
                            ? 'Abrindo…'
                            : expanded
                              ? 'Ocultar preview'
                              : 'Ver preview'}
                        </button>
                        <button
                          type="button"
                          onClick={() => adicionarAPasta(item)}
                          className={btnCifraConfirmClassName}
                          disabled={!ministros.length || adicionandoId === item.id || !!adicionadoEm}
                        >
                          {adicionandoId === item.id
                            ? 'Adicionando…'
                            : adicionadoEm
                              ? `Adicionada em ${adicionadoEm}`
                              : 'Adicionar à pasta'}
                        </button>
                      </div>
                    </div>

                    {expanded && detail && (
                      <div className="mt-3 rounded-lg border border-white/10 bg-black/40 p-3">
                        <p className="mb-2 text-xs font-semibold text-[var(--crash-cifra)]">
                          {[detail.versao.tom_original && `Tom ${detail.versao.tom_original}`,
                            detail.versao.bpm && `${detail.versao.bpm} BPM`]
                            .filter(Boolean)
                            .join(' · ') || 'Preview da cifra'}
                        </p>
                        {linhasPreview(detail.versao.secoes).length > 0 ? (
                          <div className="space-y-1 text-sm text-zinc-200">
                            {linhasPreview(detail.versao.secoes).map((linha, index) => (
                              <p key={`${item.id}-${index}`}>{linha}</p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-[var(--crash-texto-sec)]">
                            Cifra pronta para adicionar à pasta.
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <footer className="shrink-0 border-t border-white/10 px-5 py-3">
          <button type="button" onClick={onClose} className={btnCifraOutlineClassName}>
            Fechar
          </button>
        </footer>
      </div>
    </div>
  )
}
