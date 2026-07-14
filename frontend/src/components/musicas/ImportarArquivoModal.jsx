import { useMemo, useState } from 'react'
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
import { buildCifraSnapshot } from '@crash-cifras/shared'

const ADMIN_EMAIL = 'alanadcms@gmail.com'

const AVISO_PDF_ESCANEADO =
  'Este PDF parece escaneado (sem camada de texto útil). ' +
  'Converta em PDF com texto selecionável ou use ODT/DOCX/TXT.'

function newItemId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
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

  const [fila, setFila] = useState([])
  const [ativoId, setAtivoId] = useState(null)
  const [destino, setDestino] = useState(ministroId ? 'ministro' : 'biblioteca')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [globalAviso, setGlobalAviso] = useState('')

  const ativo = useMemo(
    () => fila.find((i) => i.id === ativoId) || fila[0] || null,
    [fila, ativoId],
  )

  if (!open) return null

  function reset() {
    setFila([])
    setAtivoId(null)
    setError('')
    setGlobalAviso('')
    setBusy(false)
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
    try {
      await loadCifraMonoFont()
      const novos = []
      for (const file of files) {
        const id = newItemId()
        try {
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
            status: result.status_revisao || (result.wrap_ok ? 'ok' : 'precisa_revisao'),
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
      e.target.value = ''
    }
  }

  async function salvarItem(item, { openEditor } = { openEditor: true }) {
    if (!item?.processed) throw new Error(item?.erro || 'Item sem cifra processada')
    if (!item.titulo.trim()) throw new Error('Informe o título antes de salvar')

    const secoes = secoesParaCreateMusica(item.processed)
    const meta = {
      origemImportacao: 'curadoria',
      importadoEm: item.processed.importado_em || new Date().toISOString(),
      arquivoOrigem: item.filename,
      importStatus: 'manual',
    }

    if (destino === 'acervo') {
      if (!isAdmin) throw new Error('Apenas admin pode publicar no acervo global')
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
      // Também cria cópia pessoal ligada (biblioteca) para edição imediata
      const musica = await createMusica({
        ministroId: null,
        titulo: item.titulo.trim(),
        artista: item.artista.trim() || null,
        tomOriginal: item.tomOriginal || null,
        secoesIniciais: secoes,
        acervoVersaoId: pub.acervo_versao_id,
        ...meta,
      })
      updateItem(item.id, {
        published: true,
        musicaId: musica.id,
        status: 'ok',
      })
      onImported?.(musica)
      if (openEditor) {
        onClose?.()
        reset()
        navigate(`/musica/${musica.id}/editar`)
      }
      return musica
    }

    const musica = await createMusica({
      ministroId: destino === 'ministro' ? ministroId || null : null,
      titulo: item.titulo.trim(),
      artista: item.artista.trim() || null,
      tomOriginal: item.tomOriginal || null,
      secoesIniciais: secoes,
      ...meta,
    })
    updateItem(item.id, {
      published: true,
      musicaId: musica.id,
      status: 'ok',
    })
    onImported?.(musica)
    if (openEditor) {
      onClose?.()
      reset()
      navigate(`/musica/${musica.id}/editar`)
    }
    return musica
  }

  async function abrirNoEditor() {
    if (!ativo) return
    setBusy(true)
    setError('')
    try {
      await salvarItem(ativo, { openEditor: true })
    } catch (err) {
      setError(err?.message || 'Falha ao salvar')
    } finally {
      setBusy(false)
    }
  }

  async function publicarLote() {
    setBusy(true)
    setError('')
    try {
      const pendentes = fila.filter((i) => !i.published && i.processed)
      for (const item of pendentes) {
        await salvarItem(item, { openEditor: false })
      }
      setGlobalAviso(`${pendentes.length} música(s) publicadas.`)
    } catch (err) {
      setError(err?.message || 'Falha no lote')
    } finally {
      setBusy(false)
    }
  }

  const accept = EXTENSOES_CIFRA_SUPORTADAS.join(',')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Importar cifras de arquivo"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-[var(--crash-borda)] bg-[var(--crash-fundo-card)] p-5 shadow-xl">
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

        {fila.length > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-[12rem_1fr]">
            <ul className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-[var(--crash-borda)] p-2">
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
                      onChange={(e) => updateItem(ativo.id, { titulo: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Artista">
                    <input
                      className={inputClassName}
                      value={ativo.artista}
                      disabled={busy || ativo.published}
                      onChange={(e) => updateItem(ativo.id, { artista: e.target.value })}
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

                  {ativo.processed?.wrap_overflow?.length ? (
                    <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-100">
                      <p className="font-semibold">Linhas acima da largura:</p>
                      <ul className="mt-1 list-disc pl-5">
                        {ativo.processed.wrap_overflow.slice(0, 6).map((o, i) => (
                          <li key={i}>
                            [{o.secao}] {o.width}&gt;{o.maxCols}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : ativo.processed ? (
                    <p className="text-sm text-green-400">
                      Linhas cabem em {ativo.processed.maxCols} colunas.
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
          <p className="mt-2 text-sm text-amber-200">{globalAviso}</p>
        ) : null}
        {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
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
            disabled={busy || !ativo || ativo.published || !ativo.processed}
            onClick={abrirNoEditor}
          >
            {busy ? 'Processando…' : 'Abrir no editor'}
          </button>
        </div>
      </div>
    </div>
  )
}
