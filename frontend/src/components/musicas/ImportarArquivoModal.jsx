import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormField } from '../ui/FormField'
import {
  btnPrimaryClassName,
  btnSecondaryClassName,
  inputClassName,
  selectClassName,
} from '../ui/inputClasses'
import { TODOS_TONS, tomDisplayLabel } from '../../lib/tons'
import {
  posProcessarImportacaoCifra,
  secoesParaCreateMusica,
} from '../../lib/posProcessamentoImport'
import { EXTENSOES_CIFRA_SUPORTADAS } from '../../lib/extractTextoArquivo'
import { createMusica } from '../../services/musicas'
import { publicarCuradoriaAcervo } from '../../services/acervo'
import { loadCifraMonoFont } from '../../lib/monoCharWidth'
import { useAuth } from '../../hooks/useAuth'
import { buildCifraSnapshot } from '@crash-cifras/shared/acervo-snapshot'
import { ensureAuthSession } from '../../lib/authSession'

const ADMIN_EMAIL = 'alanadcms@gmail.com'

const AVISO_PDF_ESCANEADO =
  'Este PDF parece escaneado (sem camada de texto útil). ' +
  'Converta em PDF com texto selecionável ou use ODT/DOCX/TXT.'

function newItemId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatSaveError(err) {
  if (!err) return 'Falha ao salvar'
  if (typeof err === 'string') return err
  const parts = [err.message, err.details, err.hint].filter(Boolean)
  return parts.join(' — ') || 'Falha ao salvar'
}

/**
 * Importa um ou vários arquivos (ODT/PDF/DOCX/TXT) → fila de revisão → editor / lote.
 */
export function ImportarArquivoModal({
  open,
  ministroId,
  onClose,
  onImported,
}) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL
  const errorRef = useRef(null)

  const [fila, setFila] = useState([])
  const [ativoId, setAtivoId] = useState(null)
  const [destino, setDestino] = useState(ministroId ? 'ministro' : 'biblioteca')
  const [busy, setBusy] = useState(false)
  const [busyLabel, setBusyLabel] = useState('')
  const [error, setError] = useState('')
  const [globalAviso, setGlobalAviso] = useState('')

  const ativo = useMemo(
    () => fila.find((i) => i.id === ativoId) || fila[0] || null,
    [fila, ativoId],
  )

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [error])

  if (!open) return null

  function reset() {
    setFila([])
    setAtivoId(null)
    setError('')
    setGlobalAviso('')
    setBusy(false)
    setBusyLabel('')
    setDestino(ministroId ? 'ministro' : 'biblioteca')
  }

  function updateItem(id, patch) {
    setFila((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  async function onFilesChange(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setError('')
    setGlobalAviso('')
    setBusy(true)
    setBusyLabel('Lendo arquivo…')
    try {
      await loadCifraMonoFont()
      const novos = []
      for (const file of files) {
        const id = newItemId()
        try {
          setBusyLabel(`Processando ${file.name}…`)
          const buf = await file.arrayBuffer()
          const result = await posProcessarImportacaoCifra({
            fileData: buf,
            filename: file.name,
          })
          const avisos = [...(result.avisos || [])]
          if (result.escaneado && !avisos.some((a) => /escaneado/i.test(a))) {
            avisos.unshift(AVISO_PDF_ESCANEADO)
          }
          novos.push({
            id,
            filename: file.name,
            processed: result,
            titulo: result.titulo || '',
            artista: result.artista || '',
            tomOriginal: result.tom_original || result.tom_detectado || '',
            status: result.status_revisao || 'ok',
            avisos,
            published: false,
            musicaId: null,
            erro: null,
          })
        } catch (err) {
          novos.push({
            id,
            filename: file.name,
            processed: null,
            titulo: '',
            artista: '',
            tomOriginal: '',
            status: 'precisa_revisao',
            avisos: err?.avisos || [err?.message || 'Falha ao ler arquivo'],
            published: false,
            musicaId: null,
            erro: err?.message || 'Falha ao ler arquivo',
          })
        }
      }
      setFila((prev) => [...prev, ...novos])
      if (!ativoId && novos[0]) setAtivoId(novos[0].id)
      if (novos.some((n) => n.avisos?.length)) {
        setGlobalAviso('Alguns arquivos precisam de revisão (veja avisos).')
      }
    } finally {
      setBusy(false)
      setBusyLabel('')
      e.target.value = ''
    }
  }

  async function salvarItem(item, { openEditor } = { openEditor: true }) {
    if (!item?.processed) throw new Error(item?.erro || 'Item sem cifra processada')
    if (!String(item.titulo || '').trim()) {
      throw new Error('Informe o título antes de salvar')
    }

    await ensureAuthSession()

    const secoes = secoesParaCreateMusica(item.processed)
    const meta = {
      origemImportacao: 'curadoria',
      importadoEm: item.processed.importado_em || new Date().toISOString(),
      arquivoOrigem: item.filename,
      importStatus: 'manual',
      onProgress: setBusyLabel,
    }

    let musica

    if (destino === 'acervo') {
      if (!isAdmin) throw new Error('Apenas admin pode publicar no acervo global')
      setBusyLabel('Publicando no acervo…')
      const cifra = buildCifraSnapshot({
        tomOriginal: item.tomOriginal || null,
        bpm: null,
        secoes,
      })
      const pub = await publicarCuradoriaAcervo({
        titulo: item.titulo.trim(),
        artista: item.artista.trim() || null,
        tomOriginal: item.tomOriginal || null,
        bpm: null,
        cifra,
        arquivoOrigem: item.filename,
      })
      musica = await createMusica({
        ministroId: null,
        titulo: item.titulo.trim(),
        artista: item.artista.trim() || null,
        tomOriginal: item.tomOriginal || null,
        secoesIniciais: secoes,
        acervoVersaoId: pub.acervo_versao_id,
        ...meta,
      })
    } else {
      musica = await createMusica({
        ministroId: destino === 'ministro' ? ministroId || null : null,
        titulo: item.titulo.trim(),
        artista: item.artista.trim() || null,
        tomOriginal: item.tomOriginal || null,
        secoesIniciais: secoes,
        ...meta,
      })
    }

    if (!musica?.id) throw new Error('Música criada sem id — tente novamente')

    updateItem(item.id, {
      published: true,
      musicaId: musica.id,
      status: 'ok',
    })

    // Navegar ANTES de fechar o modal (evita race no celular).
    if (openEditor) {
      setBusyLabel('Abrindo editor…')
      navigate(`/musica/${musica.id}/editar`, { replace: true })
      onClose?.()
      onImported?.(musica)
      return musica
    }

    onImported?.(musica)
    return musica
  }

  async function abrirNoEditor() {
    if (!ativo || busy) return
    setBusy(true)
    setBusyLabel('Salvando…')
    setError('')
    try {
      await salvarItem(ativo, { openEditor: true })
    } catch (err) {
      setError(formatSaveError(err))
    } finally {
      setBusy(false)
      setBusyLabel('')
    }
  }

  async function publicarLote() {
    setBusy(true)
    setBusyLabel('Publicando lote…')
    setError('')
    try {
      const pendentes = fila.filter((i) => !i.published && i.processed)
      for (const item of pendentes) {
        await salvarItem(item, { openEditor: false })
      }
      setGlobalAviso(`${pendentes.length} música(s) publicadas.`)
    } catch (err) {
      setError(formatSaveError(err))
    } finally {
      setBusy(false)
      setBusyLabel('')
    }
  }

  const accept = EXTENSOES_CIFRA_SUPORTADAS.join(',')
  const podeAbrir =
    !busy && Boolean(ativo) && !ativo.published && Boolean(ativo.processed)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/80 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Importar cifras de arquivo"
    >
      <div className="flex max-h-[min(92dvh,100%)] w-full max-w-2xl flex-col rounded-t-2xl border border-[var(--crash-borda)] bg-[var(--crash-fundo-card)] shadow-xl sm:rounded-2xl">
        <div className="shrink-0 border-b border-[var(--crash-borda)] p-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Importar arquivo</h2>
              <p className="mt-1 text-sm text-[var(--crash-texto-sec)]">
                ODT, PDF, DOCX ou TXT — um ou vários. Revisão com status ok / precisa
                revisão.
              </p>
            </div>
            <button
              type="button"
              className="text-[var(--crash-texto-sec)] hover:text-white"
              aria-label="Fechar"
              disabled={busy}
              onClick={() => {
                onClose?.()
                reset()
              }}
            >
              ✕
            </button>
          </div>

          <div className="mt-4">
            <input
              type="file"
              accept={accept}
              multiple
              disabled={busy}
              onChange={onFilesChange}
              className="block w-full text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--crash-cifra)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-black"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5">
          {fila.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[var(--crash-borda)] p-2 sm:max-h-72">
                {fila.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setAtivoId(item.id)}
                      className={`w-full rounded-md px-2 py-1.5 text-left text-xs ${
                        ativo?.id === item.id
                          ? 'bg-[var(--crash-cifra)]/20 text-[var(--crash-cifra)]'
                          : 'text-white/80 hover:bg-white/5'
                      }`}
                    >
                      <span className="block truncate font-medium">{item.filename}</span>
                      <span
                        className={
                          item.status === 'ok' ? 'text-green-400' : 'text-amber-300'
                        }
                      >
                        {item.published
                          ? 'publicada'
                          : item.status === 'ok'
                            ? 'ok'
                            : 'precisa revisão'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="space-y-3">
                {ativo ? (
                  <>
                    {ativo.avisos?.length ? (
                      <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-100">
                        {ativo.avisos.map((a, i) => (
                          <p key={i}>{a}</p>
                        ))}
                      </div>
                    ) : null}

                    <FormField label="Título">
                      <input
                        className={inputClassName}
                        value={ativo.titulo}
                        disabled={busy || ativo.published}
                        onChange={(e) =>
                          updateItem(ativo.id, { titulo: e.target.value })
                        }
                      />
                    </FormField>
                    <FormField label="Artista">
                      <input
                        className={inputClassName}
                        value={ativo.artista}
                        disabled={busy || ativo.published}
                        onChange={(e) =>
                          updateItem(ativo.id, { artista: e.target.value })
                        }
                      />
                    </FormField>
                    <FormField label="Tom original">
                      <select
                        className={selectClassName}
                        value={ativo.tomOriginal || ''}
                        disabled={busy || ativo.published}
                        onChange={(e) =>
                          updateItem(ativo.id, { tomOriginal: e.target.value })
                        }
                      >
                        <option value="">— escolher —</option>
                        {TODOS_TONS.map((t) => (
                          <option key={t} value={t}>
                            {tomDisplayLabel(t)}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    {ativo.processed ? (
                      <p className="text-sm text-[var(--crash-texto-sec)]">
                        Cifra salva em linhas inteiras. A quebra adaptativa acontece no
                        teleprompter, conforme a largura da tela.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-[var(--crash-texto-sec)]">
                    Selecione um arquivo na fila.
                  </p>
                )}
              </div>
            </div>
          ) : null}

          <FormField label="Destino ao salvar" hint="Acervo global só para admin.">
            <select
              className={selectClassName}
              value={destino}
              disabled={busy}
              onChange={(e) => setDestino(e.target.value)}
            >
              <option value="biblioteca">Biblioteca pessoal</option>
              <option value="ministro" disabled={!ministroId}>
                Pasta do ministério
              </option>
              {isAdmin ? <option value="acervo">Acervo global (admin)</option> : null}
            </select>
          </FormField>

          {globalAviso ? (
            <p className="text-sm text-amber-200">{globalAviso}</p>
          ) : null}
        </div>

        <div className="shrink-0 space-y-2 border-t border-[var(--crash-borda)] bg-[var(--crash-fundo-card)] p-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {error ? (
            <p
              ref={errorRef}
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          {busy && busyLabel ? (
            <p className="text-sm text-[var(--crash-cifra)]" role="status" aria-live="polite">
              {busyLabel}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className={btnSecondaryClassName}
              disabled={busy || !fila.some((i) => !i.published && i.processed)}
              onClick={publicarLote}
            >
              Publicar lote
            </button>
            <button
              type="button"
              className={btnPrimaryClassName}
              disabled={!podeAbrir}
              onClick={() => void abrirNoEditor()}
            >
              {busy ? busyLabel || 'Processando…' : 'Abrir no editor'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
