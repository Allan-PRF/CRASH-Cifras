import { useCallback, useEffect, useState } from 'react'
import { BlocoSecao } from '../cifra/LinhaCifra'
import { ConfirmDeleteModal } from '../ui/ConfirmDeleteModal'
import {
  btnCifraConfirmClassName,
  btnCifraOutlineClassName,
  btnPrimaryClassName,
} from '../ui/inputClasses'
import {
  buscarVersaoAcervo,
  listarVersoesAcervo,
  restaurarVersaoAcervo,
} from '../../services/acervo'

const PREVIEW_MAX_SECOES = 2

function tempoRelativo(iso) {
  if (!iso) return ''
  const diffMs = Date.now() - new Date(iso).getTime()
  if (diffMs < 0) return 'agora'
  const days = Math.floor(diffMs / 86400000)
  if (days < 1) return 'hoje'
  if (days === 1) return 'há 1 dia'
  if (days < 30) return `há ${days} dias`
  const months = Math.floor(days / 30)
  if (months === 1) return 'há 1 mês'
  if (months < 12) return `há ${months} meses`
  const years = Math.floor(months / 12)
  return years === 1 ? 'há 1 ano' : `há ${years} anos`
}

function labelPopularidade(versao) {
  const adocoes = (versao.aceitacao_count || 0) + (versao.convergencia_count || 0)
  if (adocoes === 0) {
    return versao.origem === 'motor' ? 'Versão base do motor' : 'Ainda sem adoções na comunidade'
  }
  if (adocoes === 1) return 'Adotada por 1 músico'
  return `Adotada por ${adocoes} músicos`
}

function estrelasPopularidade(versao) {
  const adocoes = (versao.aceitacao_count || 0) + (versao.convergencia_count || 0)
  if (adocoes === 0) return null
  const filled = Math.min(5, Math.max(1, Math.ceil(Math.log2(adocoes + 1) * 2)))
  return {
    filled,
    label: `${filled} de 5 — ${labelPopularidade(versao)}`,
  }
}

function VersaoBadges({ versao }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {versao.is_top && (
        <span className="rounded-full border border-amber-500/50 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
          👑 Top do ranking
        </span>
      )}
      {versao.is_motor_original && (
        <span className="rounded-full border border-[var(--crash-cifra)]/50 bg-[var(--crash-cifra)]/15 px-2 py-0.5 text-[11px] font-semibold text-[var(--crash-cifra)]">
          🔧 Original do Motor
        </span>
      )}
      {versao.is_sua_versao_atual && (
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
          ✓ Sua versão atual
        </span>
      )}
    </div>
  )
}

function VersaoPreview({ detail, loading }) {
  if (loading) {
    return (
      <p className="py-4 text-center text-sm text-[var(--crash-texto-sec)]">
        Carregando preview…
      </p>
    )
  }
  if (!detail?.secoes?.length) {
    return (
      <p className="py-3 text-sm text-[var(--crash-texto-sec)]">
        Esta versão não tem seções para exibir.
      </p>
    )
  }

  const previewSecoes = detail.secoes.slice(0, PREVIEW_MAX_SECOES)
  const tom = detail.tom_original || detail.cifra?.tom_original || null

  return (
    <div className="space-y-4 rounded-xl border border-[var(--crash-cifra)]/25 bg-black/60 p-3">
      {previewSecoes.map((sec, index) => (
        <div key={sec.slug || index}>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--crash-cifra)]">
            {sec.nome || `Seção ${index + 1}`}
          </p>
          <BlocoSecao
            linhas={sec.linhas}
            tomOriginal={tom}
            mostrarAcordes
            mostrarGrau={false}
            visualizacao
            sectionKey={`preview-${index}`}
          />
        </div>
      ))}
      {detail.secoes.length > PREVIEW_MAX_SECOES && (
        <p className="text-center text-xs text-[var(--crash-texto-sec)]">
          + {detail.secoes.length - PREVIEW_MAX_SECOES} seção(ões) nesta versão
        </p>
      )}
    </div>
  )
}

function VersaoCard({
  versao,
  expanded,
  previewDetail,
  previewLoading,
  onToggleExpand,
  onUsar,
  aplicandoId,
}) {
  const estrelas = estrelasPopularidade(versao)
  const isAtual = versao.is_sua_versao_atual

  return (
    <article
      className={`rounded-xl border bg-black/50 transition ${
        isAtual
          ? 'border-emerald-500/40 ring-1 ring-emerald-500/20'
          : versao.is_top
            ? 'border-amber-500/35'
            : 'border-[var(--crash-cifra)]/35'
      }`}
    >
      <button
        type="button"
        onClick={() => onToggleExpand(versao.id)}
        className="flex w-full flex-col gap-2 p-4 text-left transition hover:bg-white/[0.03]"
        aria-expanded={expanded}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-white">{versao.autor?.display_name || '—'}</p>
            <p className="mt-0.5 text-xs text-[var(--crash-texto-sec)]">
              Tom {versao.tom_original || '—'}
              {versao.bpm ? ` · ${versao.bpm} BPM` : ''}
              {versao.created_at ? ` · ${tempoRelativo(versao.created_at)}` : ''}
            </p>
          </div>
          <span
            className="shrink-0 text-lg text-[var(--crash-cifra)] transition"
            aria-hidden
          >
            {expanded ? '▾' : '▸'}
          </span>
        </div>

        <VersaoBadges versao={versao} />

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="text-[var(--crash-cifra)]">{labelPopularidade(versao)}</span>
          {estrelas && (
            <span
              className="text-amber-400 tracking-tight"
              title={estrelas.label}
              aria-label={estrelas.label}
            >
              {'★'.repeat(estrelas.filled)}
              <span className="text-white/20">{'★'.repeat(5 - estrelas.filled)}</span>
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/10 px-4 pb-4 pt-2">
          <VersaoPreview detail={previewDetail} loading={previewLoading} />
          <div className="mt-4 flex justify-end">
            {isAtual ? (
              <button
                type="button"
                disabled
                className={`${btnCifraOutlineClassName} opacity-50`}
              >
                Versão em uso
              </button>
            ) : (
              <button
                type="button"
                disabled={Boolean(aplicandoId)}
                onClick={() => onUsar(versao)}
                className={btnPrimaryClassName}
              >
                {aplicandoId === versao.id ? 'Aplicando…' : 'Usar esta versão'}
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

export function AcervoVitrineModal({ open, musicaId, onClose, onVersaoAplicada }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lista, setLista] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [previewById, setPreviewById] = useState({})
  const [previewLoadingId, setPreviewLoadingId] = useState(null)
  const [confirmVersao, setConfirmVersao] = useState(null)
  const [aplicandoId, setAplicandoId] = useState(null)

  const carregarLista = useCallback(() => {
    if (!musicaId) return
    setLoading(true)
    setError('')
    listarVersoesAcervo(musicaId)
      .then((res) => setLista(res))
      .catch((err) => setError(err.message || 'Não foi possível carregar as versões.'))
      .finally(() => setLoading(false))
  }, [musicaId])

  useEffect(() => {
    if (!open) return
    setExpandedId(null)
    setPreviewById({})
    setPreviewLoadingId(null)
    setConfirmVersao(null)
    setAplicandoId(null)
    carregarLista()
  }, [open, carregarLista])

  async function toggleExpand(versaoId) {
    if (expandedId === versaoId) {
      setExpandedId(null)
      return
    }
    setExpandedId(versaoId)
    if (previewById[versaoId]) return

    setPreviewLoadingId(versaoId)
    try {
      const detail = await buscarVersaoAcervo(versaoId)
      setPreviewById((prev) => ({ ...prev, [versaoId]: detail }))
    } catch (err) {
      setError(err.message || 'Não foi possível carregar o preview.')
    } finally {
      setPreviewLoadingId(null)
    }
  }

  async function handleConfirmUsar() {
    if (!confirmVersao) return
    setAplicandoId(confirmVersao.id)
    setError('')
    try {
      const result = await restaurarVersaoAcervo(musicaId, confirmVersao.id)
      onVersaoAplicada?.(result)
      setConfirmVersao(null)
      onClose()
    } catch (err) {
      setError(err.message || 'Não foi possível aplicar a versão.')
      throw err
    } finally {
      setAplicandoId(null)
    }
  }

  if (!open) return null

  const tituloAcervo = lista?.acervo?.titulo
  const artistaAcervo = lista?.acervo?.artista

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 p-0 sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="acervo-vitrine-title"
        onClick={onClose}
      >
        <div
          className="flex max-h-[min(92svh,720px)] w-full max-w-2xl flex-col rounded-t-2xl border border-[var(--crash-cifra)]/40 bg-[var(--crash-fundo-card)] shadow-2xl sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="shrink-0 border-b border-[var(--crash-cifra)]/30 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="acervo-vitrine-title"
                  className="text-lg font-bold text-[var(--crash-cifra)]"
                >
                  Acervo da Comunidade
                </h2>
                {(tituloAcervo || artistaAcervo) && (
                  <p className="mt-1 text-sm text-white">
                    {tituloAcervo}
                    {artistaAcervo && (
                      <span className="text-[var(--crash-texto-sec)]"> · {artistaAcervo}</span>
                    )}
                  </p>
                )}
                <p className="mt-1 text-xs text-[var(--crash-texto-sec)]">
                  Compare versões, espiar a cifra e trazer a que combina com você.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-2 py-1 text-xl leading-none text-[var(--crash-texto-sec)] hover:bg-white/10 hover:text-white"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {loading && (
              <p className="py-8 text-center text-sm text-[var(--crash-texto-sec)]">
                Carregando versões…
              </p>
            )}

            {!loading && error && !lista?.versoes?.length && (
              <p className="rounded-lg border border-red-800/50 bg-red-950/30 p-4 text-sm text-red-300">
                {error}
              </p>
            )}

            {!loading && lista?.versoes?.length === 0 && (
              <p className="py-8 text-center text-sm text-[var(--crash-texto-sec)]">
                Nenhuma versão encontrada no acervo desta música.
              </p>
            )}

            {!loading && lista?.versoes?.length > 0 && (
              <div className="space-y-3">
                {error && (
                  <p className="rounded-lg border border-red-800/50 bg-red-950/30 p-3 text-sm text-red-300">
                    {error}
                  </p>
                )}
                {lista.versoes.map((versao) => (
                  <VersaoCard
                    key={versao.id}
                    versao={versao}
                    expanded={expandedId === versao.id}
                    previewDetail={previewById[versao.id]}
                    previewLoading={previewLoadingId === versao.id}
                    onToggleExpand={toggleExpand}
                    onUsar={setConfirmVersao}
                    aplicandoId={aplicandoId}
                  />
                ))}
              </div>
            )}
          </div>

          <footer className="shrink-0 border-t border-white/10 px-5 py-3">
            <button type="button" onClick={onClose} className={btnCifraOutlineClassName}>
              Fechar
            </button>
          </footer>
        </div>
      </div>

      <ConfirmDeleteModal
        open={Boolean(confirmVersao)}
        title="Usar esta versão"
        message="Isso vai substituir sua cifra atual por esta versão da comunidade. Suas edições não salvas serão descartadas. Continuar?"
        confirmLabel="Usar esta versão"
        confirmLoadingLabel="Aplicando…"
        confirmButtonClassName={btnCifraConfirmClassName}
        cancelLabel="Cancelar"
        onClose={() => setConfirmVersao(null)}
        onConfirm={handleConfirmUsar}
      />
    </>
  )
}
