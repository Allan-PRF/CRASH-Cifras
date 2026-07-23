import { useCallback, useEffect, useState } from 'react'
import { PageNav } from '../components/layout/PageNav'
import { ImportarArquivoModal } from '../components/musicas/ImportarArquivoModal'
import {
  btnPrimaryClassName,
  btnSecondaryClassName,
  inputClassName,
} from '../components/ui/inputClasses'
import {
  buscarAcervoCatalogo,
  corrigirMetadadosAcervo,
  impactoMetadadosAcervo,
  isFonteUrlEmUsoError,
} from '../services/acervo'

/**
 * Área admin: Word/ODT + YouTube → acervo global (atalho comunitário).
 * + correção de metadados (fonte_url / título / artista) com propagação do link.
 * Acesso: Conta → Curadoria do acervo (só administrador).
 */
export function AdminCuradoria() {
  const [arquivoOpen, setArquivoOpen] = useState(false)
  const [ultimaPublicada, setUltimaPublicada] = useState(null)

  const [buscaQ, setBuscaQ] = useState('')
  const [buscaLoading, setBuscaLoading] = useState(false)
  const [buscaErro, setBuscaErro] = useState(null)
  const [resultados, setResultados] = useState([])

  const [selecionadaId, setSelecionadaId] = useState(null)
  const [tituloDraft, setTituloDraft] = useState('')
  const [artistaDraft, setArtistaDraft] = useState('')
  const [fonteUrlDraft, setFonteUrlDraft] = useState('')
  const [propagarYoutube, setPropagarYoutube] = useState(true)

  const [impacto, setImpacto] = useState(null)
  const [impactoLoading, setImpactoLoading] = useState(false)
  const [impactoErro, setImpactoErro] = useState(null)

  const [salvando, setSalvando] = useState(false)
  const [salvarMsg, setSalvarMsg] = useState(null)
  const [salvarErro, setSalvarErro] = useState(null)

  // Impacto é somente leitura: atualiza contagens/conflito, NUNCA os drafts do form.
  const carregarImpacto = useCallback(async (acervoMusicaId, fonteUrl) => {
    if (!acervoMusicaId) return
    setImpactoLoading(true)
    setImpactoErro(null)
    try {
      const data = await impactoMetadadosAcervo(acervoMusicaId, { fonteUrl })
      setImpacto(data)
    } catch (err) {
      setImpacto(null)
      setImpactoErro(err?.response?.data?.error || err?.message || 'Falha ao carregar impacto')
    } finally {
      setImpactoLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selecionadaId) return
    const t = setTimeout(() => {
      void carregarImpacto(selecionadaId, fonteUrlDraft)
    }, 350)
    return () => clearTimeout(t)
  }, [selecionadaId, fonteUrlDraft, carregarImpacto])

  async function buscarEntradas(e) {
    e?.preventDefault?.()
    const q = String(buscaQ || '').trim()
    if (q.length < 2) {
      setBuscaErro('Digite ao menos 2 caracteres.')
      return
    }
    setBuscaLoading(true)
    setBuscaErro(null)
    setSalvarMsg(null)
    setSalvarErro(null)
    try {
      const data = await buscarAcervoCatalogo({ q, limit: 20 })
      setResultados(data?.resultados || [])
    } catch (err) {
      setResultados([])
      setBuscaErro(err?.response?.data?.error || err?.message || 'Falha na busca')
    } finally {
      setBuscaLoading(false)
    }
  }

  function selecionarEntrada(item) {
    setSelecionadaId(item.id)
    setTituloDraft(item.titulo || '')
    setArtistaDraft(item.artista || '')
    setFonteUrlDraft(item.fonte_url || '')
    setPropagarYoutube(true)
    setSalvarMsg(null)
    setSalvarErro(null)
    setImpacto(null)
  }

  async function salvarMetadados(e) {
    e?.preventDefault?.()
    if (!selecionadaId) return
    // Snapshot no clique — não depende de re-render / debounce do impacto.
    const enviado = {
      titulo: tituloDraft,
      artista: artistaDraft,
      fonteUrl: fonteUrlDraft,
      propagarYoutube,
    }
    setSalvando(true)
    setSalvarMsg(null)
    setSalvarErro(null)
    try {
      const result = await corrigirMetadadosAcervo(selecionadaId, enviado)
      const n = result?.propagacao_youtube?.atualizadas ?? 0
      setSalvarMsg(
        result.alterado
          ? `Metadados salvos.${propagarYoutube ? ` YouTube propagado para ${n} cópia(s).` : ''} Cifra intacta: ${result?.prova?.cifra_intacta ? 'sim' : 'não'}.`
          : `Nenhuma alteração detectada. Enviado: ${enviado.fonteUrl || '(vazio)'} · Salvo: ${result?.musica?.fonte_url || '(vazio)'}.`,
      )
      // Só reescreve o form quando o servidor de fato alterou — no-op não cloba o draft.
      if (result.alterado && result?.musica) {
        setTituloDraft(result.musica.titulo || '')
        setArtistaDraft(result.musica.artista || '')
        setFonteUrlDraft(result.musica.fonte_url || '')
        setResultados((prev) =>
          prev.map((r) =>
            r.id === selecionadaId
              ? {
                  ...r,
                  titulo: result.musica.titulo,
                  artista: result.musica.artista,
                  fonte_url: result.musica.fonte_url,
                }
              : r,
          ),
        )
      }
      await carregarImpacto(
        selecionadaId,
        result.alterado ? result.musica?.fonte_url : enviado.fonteUrl,
      )
    } catch (err) {
      if (isFonteUrlEmUsoError(err)) {
        setSalvarErro(err.message)
      } else {
        setSalvarErro(err?.message || 'Falha ao salvar')
      }
    } finally {
      setSalvando(false)
    }
  }

  const elegiveis = impacto?.elegiveis_propagacao ?? 0
  const conflito = impacto?.conflito

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <PageNav
        breadcrumbItems={[
          { label: 'Início', to: '/' },
          { label: 'Conta', to: '/conta' },
          { label: 'Curadoria' },
        ]}
        backTo="/conta"
        backVariant="cifra"
      />

      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Curadoria do acervo</h1>
        <p className="text-sm leading-relaxed text-[var(--crash-texto-sec)]">
          Importe a cifra corrigida (Word, ODT, PDF ou TXT) e cole o link do YouTube da
          canção. A cifra fica no acervo global: quem importar o mesmo vídeo recebe o
          atalho, sem passar pelo motor.
        </p>
      </header>

      <ol className="list-decimal space-y-1 pl-5 text-sm text-[var(--crash-texto-sec)]">
        <li>Escolha o arquivo da cifra</li>
        <li>Confira título, artista e tom</li>
        <li>Cole o link do YouTube (obrigatório)</li>
        <li>Publique no acervo global</li>
      </ol>

      {ultimaPublicada ? (
        <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Publicada: {ultimaPublicada}
        </p>
      ) : null}

      <button
        type="button"
        className={`${btnPrimaryClassName} w-full sm:w-auto`}
        onClick={() => setArquivoOpen(true)}
      >
        Importar documento e publicar
      </button>

      <ImportarArquivoModal
        open={arquivoOpen}
        somenteAcervo
        onClose={() => setArquivoOpen(false)}
        onImported={(musica) => {
          setUltimaPublicada(
            [musica?.titulo, musica?.artista].filter(Boolean).join(' · ') ||
              'Música publicada no acervo',
          )
        }}
      />

      <hr className="border-[var(--crash-borda)]" />

      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-white">Corrigir entrada publicada</h2>
          <p className="text-sm text-[var(--crash-texto-sec)]">
            Ajusta link do YouTube, título e artista. Não altera a cifra. Propaga só o link
            para cópias que ainda têm o URL antigo.
          </p>
        </header>

        <form onSubmit={buscarEntradas} className="flex flex-col gap-2 sm:flex-row">
          <input
            className={inputClassName}
            value={buscaQ}
            onChange={(e) => setBuscaQ(e.target.value)}
            placeholder="Buscar por título ou artista"
            aria-label="Buscar entrada do acervo"
          />
          <button
            type="submit"
            className={`${btnSecondaryClassName} shrink-0`}
            disabled={buscaLoading}
          >
            {buscaLoading ? 'Buscando…' : 'Buscar'}
          </button>
        </form>
        {buscaErro ? <p className="text-sm text-red-300">{buscaErro}</p> : null}

        {resultados.length > 0 ? (
          <ul className="divide-y divide-[var(--crash-borda)] rounded-lg border border-[var(--crash-borda)]">
            {resultados.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => selecionarEntrada(item)}
                  className={`w-full px-3 py-2 text-left text-sm transition hover:bg-white/5 ${
                    selecionadaId === item.id ? 'bg-[var(--crash-cifra)]/10' : ''
                  }`}
                >
                  <span className="font-medium text-white">{item.titulo}</span>
                  {item.artista ? (
                    <span className="text-[var(--crash-texto-sec)]"> · {item.artista}</span>
                  ) : null}
                  {item.fonte_url ? (
                    <div className="mt-0.5 truncate text-xs text-[var(--crash-texto-sec)]">
                      {item.fonte_url}
                    </div>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {selecionadaId ? (
          <form onSubmit={salvarMetadados} className="space-y-3 rounded-lg border border-[var(--crash-borda)] p-4">
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--crash-texto-sec)]">Título</span>
              <input
                className={inputClassName}
                value={tituloDraft}
                onChange={(e) => setTituloDraft(e.target.value)}
                required
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--crash-texto-sec)]">Artista</span>
              <input
                className={inputClassName}
                value={artistaDraft}
                onChange={(e) => setArtistaDraft(e.target.value)}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--crash-texto-sec)]">YouTube (fonte_url)</span>
              <input
                className={inputClassName}
                value={fonteUrlDraft}
                onChange={(e) => setFonteUrlDraft(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
              />
            </label>

            {impactoLoading ? (
              <p className="text-xs text-[var(--crash-texto-sec)]">Calculando impacto…</p>
            ) : impactoErro ? (
              <p className="text-sm text-red-300">{impactoErro}</p>
            ) : impacto ? (
              <p className="text-xs text-[var(--crash-texto-sec)]">
                Cópias ligadas: {impacto.copias_ligadas} · elegíveis à propagação do link:{' '}
                {elegiveis}
              </p>
            ) : null}

            {conflito ? (
              <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                Este link já pertence a «{conflito.rotulo}». Ao salvar, a API recusará (409).
              </p>
            ) : null}

            <label className="flex items-start gap-2 text-sm text-white">
              <input
                type="checkbox"
                className="mt-1"
                checked={propagarYoutube}
                onChange={(e) => setPropagarYoutube(e.target.checked)}
              />
              <span>
                Propagar YouTube ({elegiveis} {elegiveis === 1 ? 'cópia' : 'cópias'})
                <span className="block text-xs text-[var(--crash-texto-sec)]">
                  Só atualiza cópias cujo link ainda é o antigo. Cifra pessoal não é tocada.
                </span>
              </span>
            </label>

            <button
              type="submit"
              className={btnPrimaryClassName}
              disabled={salvando || Boolean(conflito)}
            >
              {salvando ? 'Salvando…' : 'Salvar metadados'}
            </button>

            {salvarMsg ? (
              <p className="text-sm text-emerald-200">{salvarMsg}</p>
            ) : null}
            {salvarErro ? <p className="text-sm text-red-300">{salvarErro}</p> : null}
          </form>
        ) : null}
      </section>
    </section>
  )
}
