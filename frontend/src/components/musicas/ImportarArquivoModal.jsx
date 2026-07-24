import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
import { createMusica, updateMusicaYoutubeUrl } from '../../services/musicas'
import { buscarAcervoCatalogo, isAcervoFonteDespublicadaError, isAcervoTituloDivergenteError, publicarCuradoriaAcervo } from '../../services/acervo'
import { ConfirmPublishTituloModal } from './ConfirmPublishTituloModal'
import { ConfirmPublishDespublicadaModal } from './ConfirmPublishDespublicadaModal'
import { loadCifraMonoFont } from '../../lib/monoCharWidth'
import { useAuth } from '../../hooks/useAuth'
import { isAdminUser } from '../../lib/admin'
import {
  classificarChecagemCuradoria,
  podePublicarDepoisDaChecagem,
  resumoMusicaAcervo,
} from '../../lib/curadoriaDuplicidade'
import { buildCifraSnapshot } from '@crash-cifras/shared/acervo-snapshot'
import { validateYoutubeUrl } from '@crash-cifras/shared/validate-youtube-url'
import { ensureAuthSession } from '../../lib/authSession'
import { readArquivoCifraBytes, isEmptyPdfError, MENSAGEM_ARQUIVO_VAZIO_DRIVE } from '../../lib/readArquivoCifraBytes'

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
 * Importa arquivos (ODT/PDF/DOCX/TXT) — restrito ao admin (curadoria).
 * Destino padrão: acervo global com YouTube = fonte_url (atalho comunitário).
 *
 * @param {boolean} [somenteAcervo] — trava no acervo global e exige YouTube (página Conta).
 */
export function ImportarArquivoModal({
  open,
  ministroId,
  onClose,
  onImported,
  somenteAcervo = false,
}) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = isAdminUser(user)
  const errorRef = useRef(null)
  const savingRef = useRef(false)
  const acervoCheckRequestRef = useRef(0)

  const [fila, setFila] = useState([])
  const [ativoId, setAtivoId] = useState(null)
  const [destino, setDestino] = useState('acervo')
  const [busy, setBusy] = useState(false)
  const [busyLabel, setBusyLabel] = useState('')
  const [error, setError] = useState('')
  const [globalAviso, setGlobalAviso] = useState('')
  /** Após salvar fora do acervo: vincular YouTube sem worker. */
  const [posSalvar, setPosSalvar] = useState(null)
  const [youtubeDraft, setYoutubeDraft] = useState('')
  const [publishTituloGuard, setPublishTituloGuard] = useState(null)
  const [publishDespublicadaGuard, setPublishDespublicadaGuard] = useState(null)

  const destinoEfetivo = somenteAcervo ? 'acervo' : destino

  const ativo = useMemo(
    () => fila.find((i) => i.id === ativoId) || fila[0] || null,
    [fila, ativoId],
  )

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [error])

  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const ativoIdCheck = ativo?.id || null
  const ativoTituloCheck = String(ativo?.titulo || '').trim()
  const ativoArtistaCheck = String(ativo?.artista || '').trim()
  const ativoYoutubeCheck = String(ativo?.youtubeUrl || '').trim()
  const ativoPublishedCheck = Boolean(ativo?.published)

  useEffect(() => {
    if (
      !open ||
      !isAdmin ||
      destinoEfetivo !== 'acervo' ||
      !ativoIdCheck ||
      ativoPublishedCheck
    ) {
      return undefined
    }

    const youtubeValidation = ativoYoutubeCheck
      ? validateYoutubeUrl(ativoYoutubeCheck)
      : null
    const q = ativoTituloCheck || ativoArtistaCheck

    if (ativoYoutubeCheck && !youtubeValidation?.valid) {
      setFila((prev) =>
        prev.map((item) =>
          item.id === ativoIdCheck
            ? {
                ...item,
                acervoCheckStatus: 'invalid_url',
                acervoCheck: null,
                acervoCheckError: youtubeValidation?.error || 'Link do YouTube inválido.',
                permitirDuplicataNome: false,
              }
            : item,
        ),
      )
      return undefined
    }

    if (q.length < 2 && !youtubeValidation?.valid) {
      return undefined
    }

    const requestId = ++acervoCheckRequestRef.current
    setFila((prev) =>
      prev.map((item) =>
        item.id === ativoIdCheck
          ? {
              ...item,
              acervoCheckStatus: 'loading',
              acervoCheckError: null,
              permitirDuplicataNome: false,
            }
          : item,
      ),
    )

    const timer = setTimeout(async () => {
      try {
        const result = await buscarAcervoCatalogo({
          q: q.length >= 2 ? q : null,
          fonteUrl: youtubeValidation?.valid ? ativoYoutubeCheck : null,
          titulo: ativoTituloCheck,
          artista: ativoArtistaCheck,
          limit: 10,
        })
        if (requestId !== acervoCheckRequestRef.current) return
        setFila((prev) =>
          prev.map((item) =>
            item.id === ativoIdCheck
              ? {
                  ...item,
                  acervoCheckStatus: 'ready',
                  acervoCheck: result,
                  acervoCheckError: null,
                  permitirDuplicataNome: false,
                }
              : item,
          ),
        )
      } catch (err) {
        if (requestId !== acervoCheckRequestRef.current) return
        setFila((prev) =>
          prev.map((item) =>
            item.id === ativoIdCheck
              ? {
                  ...item,
                  acervoCheckStatus: 'error',
                  acervoCheck: null,
                  acervoCheckError:
                    err?.message || 'Não foi possível consultar o acervo.',
                  permitirDuplicataNome: false,
                }
              : item,
          ),
        )
      }
    }, 500)

    return () => {
      clearTimeout(timer)
      acervoCheckRequestRef.current += 1
    }
  }, [
    open,
    isAdmin,
    destinoEfetivo,
    ativoIdCheck,
    ativoTituloCheck,
    ativoArtistaCheck,
    ativoYoutubeCheck,
    ativoPublishedCheck,
  ])

  if (!open) return null

  if (!isAdmin) {
    return null
  }

  function reset() {
    setFila([])
    setAtivoId(null)
    setError('')
    setGlobalAviso('')
    setBusy(false)
    setBusyLabel('')
    savingRef.current = false
    setPosSalvar(null)
    setYoutubeDraft('')
    setDestino('acervo')
  }

  function updateItem(id, patch) {
    setFila((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  async function checarItemAntesDePublicar(item) {
    const youtubeUrl = String(item.youtubeUrl || '').trim()
    const validation = validateYoutubeUrl(youtubeUrl)
    if (!validation.valid) {
      throw new Error(validation.error || 'Link do YouTube inválido.')
    }

    setBusyLabel('Verificando duplicidade no acervo…')
    const result = await buscarAcervoCatalogo({
      q: String(item.titulo || item.artista || '').trim(),
      fonteUrl: youtubeUrl,
      titulo: item.titulo,
      artista: item.artista,
      limit: 10,
    })
    const estado = classificarChecagemCuradoria(result)

    updateItem(item.id, {
      acervoCheckStatus: 'ready',
      acervoCheck: result,
      acervoCheckError: null,
    })

    if (
      estado.tipo === 'titulo_artista' &&
      !podePublicarDepoisDaChecagem({
        checagem: result,
        permitirDuplicataNome: item.permitirDuplicataNome,
      })
    ) {
      const primeira = resumoMusicaAcervo(estado.candidatos[0])
      throw new Error(
        `Possível duplicata no acervo${primeira ? `: ${primeira}` : ''}. Confirme “É outra gravação” antes de publicar.`,
      )
    }

    return { result, estado }
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
          if (typeof file.size === 'number' && file.size === 0) {
            throw new Error(MENSAGEM_ARQUIVO_VAZIO_DRIVE)
          }
          const buf = await readArquivoCifraBytes(file)
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
            youtubeUrl: '',
            acervoCheckStatus: 'idle',
            acervoCheck: null,
            acervoCheckError: null,
            permitirDuplicataNome: false,
            status: result.status_revisao || 'ok',
            avisos,
            published: false,
            musicaId: null,
            erro: null,
          })
        } catch (err) {
          const msg = isEmptyPdfError(err)
            ? MENSAGEM_ARQUIVO_VAZIO_DRIVE
            : err?.message || 'Falha ao ler arquivo'
          novos.push({
            id,
            filename: file.name,
            processed: null,
            titulo: '',
            artista: '',
            tomOriginal: '',
            youtubeUrl: '',
            acervoCheckStatus: 'idle',
            acervoCheck: null,
            acervoCheckError: null,
            permitirDuplicataNome: false,
            status: 'precisa_revisao',
            avisos: err?.avisos || [msg],
            published: false,
            musicaId: null,
            erro: msg,
          })
          setError(msg)
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

  async function salvarItem(
    item,
    { openEditor = true, confirmarMesmoLink = false, reativarDespublicada = false } = {},
  ) {
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

    if (destinoEfetivo === 'acervo') {
      if (!isAdmin) throw new Error('Apenas admin pode publicar no acervo global')
      const rawYt = String(item.youtubeUrl || '').trim()
      if (!rawYt) {
        throw new Error('Informe o link do YouTube para publicar no acervo global.')
      }
      const ytCheck = validateYoutubeUrl(rawYt)
      if (!ytCheck.valid) {
        throw new Error(ytCheck.error || 'Link do YouTube inválido.')
      }
      const youtubeCanonical = `https://www.youtube.com/watch?v=${ytCheck.videoId}`

      await checarItemAntesDePublicar(item)

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
        youtubeUrl: youtubeCanonical,
        confirmarMesmoLink,
        reativarDespublicada,
      })
      setPublishTituloGuard(null)
      setPublishDespublicadaGuard(null)
      musica = await createMusica({
        ministroId: null,
        titulo: item.titulo.trim(),
        artista: item.artista.trim() || null,
        tomOriginal: item.tomOriginal || null,
        youtubeUrl: youtubeCanonical,
        secoesIniciais: secoes,
        acervoVersaoId: pub.acervo_versao_id,
        ...meta,
      })
    } else {
      musica = await createMusica({
        ministroId: destinoEfetivo === 'ministro' ? ministroId || null : null,
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

    if (openEditor) {
      onImported?.(musica)
      if (destinoEfetivo === 'acervo') {
        setGlobalAviso(
          `“${item.titulo.trim()}” no acervo global com o link YouTube. Pode importar a próxima.`,
        )
        setBusyLabel('')
        return musica
      }
      setPosSalvar({
        musicaId: musica.id,
        titulo: item.titulo.trim(),
      })
      setYoutubeDraft('')
      setBusyLabel('')
      return musica
    }

    onImported?.(musica)
    return musica
  }

  function fecharAposSalvar(path) {
    reset()
    onClose?.()
    navigate(path, { replace: true })
  }

  async function vincularYoutubeEIr(path) {
    if (!posSalvar?.musicaId || savingRef.current) return
    const raw = youtubeDraft.trim()
    if (!raw) {
      setError('Cole o link do YouTube ou escolha pular.')
      return
    }
    const validation = validateYoutubeUrl(raw)
    if (!validation.valid) {
      setError(validation.error || 'Link do YouTube inválido.')
      return
    }

    savingRef.current = true
    setBusy(true)
    setBusyLabel('Vinculando YouTube…')
    setError('')
    try {
      await updateMusicaYoutubeUrl(posSalvar.musicaId, raw)
      fecharAposSalvar(path)
    } catch (err) {
      setError(formatSaveError(err))
    } finally {
      savingRef.current = false
      setBusy(false)
      setBusyLabel('')
    }
  }

  function pularYoutubeEIr(path) {
    if (!posSalvar?.musicaId) return
    fecharAposSalvar(path)
  }

  async function abrirNoEditor() {
    // Ref evita double-tap no celular; botão NÃO fica disabled (iOS engole toque em disabled).
    if (savingRef.current) return
    if (!ativo) {
      setError('Selecione um arquivo na fila.')
      return
    }
    if (!ativo.processed) {
      setError(ativo.erro || 'Arquivo ainda sem cifra processada.')
      return
    }
    if (ativo.published) {
      if (ativo.musicaId) {
        navigate(`/musica/${ativo.musicaId}/editar`, { replace: true })
        onClose?.()
      }
      return
    }
    if (!String(ativo.titulo || '').trim()) {
      setError('Informe o título antes de salvar.')
      return
    }
    if (destinoEfetivo === 'acervo' && !String(ativo.youtubeUrl || '').trim()) {
      setError('Cole o link do YouTube para publicar no acervo global.')
      return
    }

    savingRef.current = true
    setBusy(true)
    setBusyLabel(destinoEfetivo === 'acervo' ? 'Publicando no acervo…' : 'Salvando…')
    setError('')
    try {
      await salvarItem(ativo, { openEditor: true })
    } catch (err) {
      if (isAcervoTituloDivergenteError(err)) {
        setPublishTituloGuard({
          itemId: ativo.id,
          entradaRotulo: err.entrada_encontrada?.rotulo,
          copiaRotulo: err.copia?.rotulo,
        })
        return
      }
      if (isAcervoFonteDespublicadaError(err)) {
        setPublishDespublicadaGuard({
          itemId: ativo.id,
          entradaRotulo: err.entrada_despublicada?.rotulo,
        })
        return
      }
      setError(formatSaveError(err))
    } finally {
      savingRef.current = false
      setBusy(false)
      setBusyLabel('')
    }
  }

  async function publicarLote() {
    if (savingRef.current) return
    savingRef.current = true
    setBusy(true)
    setBusyLabel('Publicando lote…')
    setError('')
    try {
      const pendentes = fila.filter((i) => !i.published && i.processed)
      if (!pendentes.length) {
        setError('Nenhum arquivo pronto para publicar.')
        return
      }
      if (destinoEfetivo === 'acervo') {
        const semLink = pendentes.find((i) => !String(i.youtubeUrl || '').trim())
        if (semLink) {
          setError(
            `Informe o YouTube em cada arquivo. Falta em: ${semLink.filename}`,
          )
          return
        }
      }
      for (const item of pendentes) {
        await salvarItem(item, { openEditor: false })
      }
      setGlobalAviso(
        destinoEfetivo === 'acervo'
          ? `${pendentes.length} música(s) no acervo global.`
          : `${pendentes.length} música(s) publicadas.`,
      )
    } catch (err) {
      setError(formatSaveError(err))
    } finally {
      savingRef.current = false
      setBusy(false)
      setBusyLabel('')
    }
  }

  const accept = EXTENSOES_CIFRA_SUPORTADAS.join(',')
  const checagemAtiva = classificarChecagemCuradoria(ativo?.acervoCheck)
  const duplicidadeNomePendente =
    destinoEfetivo === 'acervo' &&
    ativo?.acervoCheckStatus === 'ready' &&
    checagemAtiva.tipo === 'titulo_artista' &&
    !ativo?.permitirDuplicataNome

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Importar cifras de arquivo"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) {
          if (posSalvar?.musicaId) {
            pularYoutubeEIr(`/musica/${posSalvar.musicaId}/editar`)
            return
          }
          onClose?.()
          reset()
        }
      }}
    >
      <div
        className="relative z-[101] flex max-h-[min(92dvh,100%)] w-full max-w-2xl flex-col rounded-t-2xl border border-[var(--crash-borda)] bg-[var(--crash-fundo-card)] shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-[var(--crash-borda)] p-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">
                {posSalvar ? 'Vincular YouTube' : 'Publicar no acervo global'}
              </h2>
              <p className="mt-1 text-sm text-[var(--crash-texto-sec)]">
                {posSalvar
                  ? `“${posSalvar.titulo}” foi salva. Cole o link do vídeo (só grava na sua cópia — sem motor).`
                  : 'ODT, PDF, DOCX ou TXT + link do YouTube. Sem o link a publicação não segue.'}
              </p>
            </div>
            <button
              type="button"
              className="min-h-11 min-w-11 text-[var(--crash-texto-sec)] hover:text-white"
              aria-label="Fechar"
              disabled={busy}
              onClick={() => {
                if (posSalvar?.musicaId) {
                  pularYoutubeEIr(`/musica/${posSalvar.musicaId}/editar`)
                  return
                }
                onClose?.()
                reset()
              }}
            >
              ✕
            </button>
          </div>

          {!posSalvar ? (
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
          ) : null}
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5">
          {posSalvar ? (
            <div className="space-y-3">
              <FormField
                label="Link do YouTube"
                hint="Opcional agora. Necessário depois para publicar no acervo da comunidade."
              >
                <input
                  className={inputClassName}
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  placeholder="https://www.youtube.com/watch?v=…"
                  value={youtubeDraft}
                  disabled={busy}
                  onChange={(e) => setYoutubeDraft(e.target.value)}
                />
              </FormField>
            </div>
          ) : fila.length > 0 ? (
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
                          updateItem(ativo.id, {
                            titulo: e.target.value,
                            acervoCheckStatus: 'idle',
                            acervoCheck: null,
                            acervoCheckError: null,
                            permitirDuplicataNome: false,
                          })
                        }
                      />
                    </FormField>

                    {destinoEfetivo === 'acervo' ? (
                      <div className="rounded-xl border border-[var(--crash-cifra)]/50 bg-[var(--crash-cifra)]/10 p-3">
                        <FormField
                          label="Link do YouTube (obrigatório)"
                          hint="Casa a cifra com o vídeo. Quem importar este link recebe o atalho."
                        >
                          <input
                            className={inputClassName}
                            type="url"
                            inputMode="url"
                            autoComplete="off"
                            placeholder="https://www.youtube.com/watch?v=…"
                            value={ativo.youtubeUrl || ''}
                            disabled={busy || ativo.published}
                            onChange={(e) =>
                              updateItem(ativo.id, {
                                youtubeUrl: e.target.value,
                                acervoCheckStatus: 'idle',
                                acervoCheck: null,
                                acervoCheckError: null,
                                permitirDuplicataNome: false,
                              })
                            }
                          />
                        </FormField>
                      </div>
                    ) : null}

                    {destinoEfetivo === 'acervo' &&
                    ativo.acervoCheckStatus === 'loading' ? (
                      <p
                        className="rounded-lg border border-[var(--crash-borda)] px-3 py-2 text-sm text-[var(--crash-texto-sec)]"
                        role="status"
                      >
                        Verificando se esta música já existe no acervo…
                      </p>
                    ) : null}

                    {destinoEfetivo === 'acervo' &&
                    ['invalid_url', 'error'].includes(ativo.acervoCheckStatus) ? (
                      <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                        {ativo.acervoCheckError}
                      </p>
                    ) : null}

                    {destinoEfetivo === 'acervo' &&
                    ativo.acervoCheckStatus === 'ready' &&
                    checagemAtiva.tipo === 'fonte_url' ? (
                      <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                        <p className="font-semibold">Este link já existe no acervo.</p>
                        <p className="mt-1">
                          {resumoMusicaAcervo(checagemAtiva.musica)}. A publicação será
                          adicionada a essa entrada, sem criar música duplicada.
                        </p>
                      </div>
                    ) : null}

                    {destinoEfetivo === 'acervo' &&
                    ativo.acervoCheckStatus === 'ready' &&
                    checagemAtiva.tipo === 'titulo_artista' ? (
                      <div className="space-y-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
                        <p className="font-semibold">
                          Possível duplicata por título e artista
                        </p>
                        <p>
                          O link é diferente, mas já existe uma música com os mesmos
                          dados:
                        </p>
                        <ul className="list-disc space-y-1 pl-5">
                          {checagemAtiva.candidatos.slice(0, 3).map((candidato) => (
                            <li key={candidato.id}>
                              {resumoMusicaAcervo(candidato)}
                              {candidato.fonte_url ? ' · com YouTube vinculado' : ''}
                            </li>
                          ))}
                        </ul>
                        {ativo.permitirDuplicataNome ? (
                          <p className="font-semibold text-emerald-200">
                            Confirmado: é outra gravação. Uma nova entrada poderá ser
                            criada.
                          </p>
                        ) : (
                          <>
                            <p>
                              Se for a mesma gravação, revise o link e não publique. Se
                              realmente for outra, confirme abaixo.
                            </p>
                            <button
                              type="button"
                              className={btnSecondaryClassName}
                              disabled={busy}
                              onClick={() =>
                                updateItem(ativo.id, {
                                  permitirDuplicataNome: true,
                                })
                              }
                            >
                              Confirmar: é outra gravação
                            </button>
                          </>
                        )}
                      </div>
                    ) : null}

                    {destinoEfetivo === 'acervo' &&
                    ativo.acervoCheckStatus === 'ready' &&
                    checagemAtiva.tipo === 'novo' ? (
                      <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-200">
                        Nenhuma duplicata exata por link ou título+artista. Pronta para
                        criar uma entrada no acervo.
                      </p>
                    ) : null}

                    <FormField label="Artista">
                      <input
                        className={inputClassName}
                        value={ativo.artista}
                        disabled={busy || ativo.published}
                        onChange={(e) =>
                          updateItem(ativo.id, {
                            artista: e.target.value,
                            acervoCheckStatus: 'idle',
                            acervoCheck: null,
                            acervoCheckError: null,
                            permitirDuplicataNome: false,
                          })
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

          {!posSalvar && !somenteAcervo ? (
            <FormField
              label="Destino ao salvar"
              hint="Acervo global = cifra + YouTube disponíveis para todos."
            >
              <select
                className={selectClassName}
                value={destino}
                disabled={busy}
                onChange={(e) => setDestino(e.target.value)}
              >
                <option value="acervo">Acervo global (atalho YouTube)</option>
                <option value="biblioteca">Biblioteca pessoal</option>
                <option value="ministro" disabled={!ministroId}>
                  Pasta do ministério
                </option>
              </select>
            </FormField>
          ) : null}

          {!posSalvar && somenteAcervo ? (
            <p className="rounded-lg border border-[var(--crash-borda)] px-3 py-2 text-sm text-[var(--crash-texto-sec)]">
              Destino: <span className="text-white">acervo global</span> — o YouTube é
              obrigatório em cada canção.
            </p>
          ) : null}

          {globalAviso ? (
            <p className="text-sm text-amber-200">{globalAviso}</p>
          ) : null}
        </div>

        <div className="relative z-[102] shrink-0 space-y-2 border-t border-[var(--crash-borda)] bg-[var(--crash-fundo-card)] p-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pointer-events-auto">
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
          {posSalvar ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <button
                type="button"
                className={`${btnSecondaryClassName} min-h-11 touch-manipulation`}
                disabled={busy}
                onClick={() => pularYoutubeEIr(`/musica/${posSalvar.musicaId}/editar`)}
              >
                Pular · editor
              </button>
              <button
                type="button"
                className={`${btnSecondaryClassName} min-h-11 touch-manipulation`}
                disabled={busy}
                onClick={() => pularYoutubeEIr(`/teleprompter/musica/${posSalvar.musicaId}`)}
              >
                Pular · teleprompter
              </button>
              <button
                type="button"
                className={`${btnPrimaryClassName} min-h-11 touch-manipulation`}
                disabled={busy || !youtubeDraft.trim()}
                onClick={() =>
                  void vincularYoutubeEIr(`/teleprompter/musica/${posSalvar.musicaId}`)
                }
              >
                {busy ? busyLabel || 'Vinculando…' : 'Vincular e abrir teleprompter'}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={`${btnSecondaryClassName} min-h-11 touch-manipulation`}
                disabled={busy}
                onClick={() => void publicarLote()}
              >
                Publicar lote
              </button>
              <button
                type="button"
                className={`${btnPrimaryClassName} min-h-11 min-w-[9rem] touch-manipulation`}
                disabled={
                  busy ||
                  ativo?.acervoCheckStatus === 'loading' ||
                  duplicidadeNomePendente ||
                  (destinoEfetivo === 'acervo' &&
                    !String(ativo?.youtubeUrl || '').trim())
                }
                onClick={() => void abrirNoEditor()}
              >
                {busy
                  ? busyLabel || 'Processando…'
                  : destinoEfetivo === 'acervo'
                    ? 'Publicar no acervo'
                    : 'Salvar canção'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {createPortal(modal, document.body)}
      <ConfirmPublishTituloModal
        open={Boolean(publishTituloGuard)}
        entradaRotulo={publishTituloGuard?.entradaRotulo}
        copiaRotulo={publishTituloGuard?.copiaRotulo}
        confirming={busy}
        onClose={() => setPublishTituloGuard(null)}
        onCorrigirLink={() => {
          setPublishTituloGuard(null)
          setError('Corrija o link do YouTube e tente publicar de novo.')
        }}
        onPublicarMesmoAssim={() => {
          const item = fila.find((i) => i.id === publishTituloGuard?.itemId) || ativo
          if (!item) return
          savingRef.current = true
          setBusy(true)
          setBusyLabel('Publicando no acervo…')
          void salvarItem(item, { openEditor: true, confirmarMesmoLink: true })
            .catch((err) => {
              if (isAcervoFonteDespublicadaError(err)) {
                setPublishTituloGuard(null)
                setPublishDespublicadaGuard({
                  itemId: item.id,
                  entradaRotulo: err.entrada_despublicada?.rotulo,
                })
                return
              }
              setError(formatSaveError(err))
            })
            .finally(() => {
              savingRef.current = false
              setBusy(false)
              setBusyLabel('')
            })
        }}
      />
      <ConfirmPublishDespublicadaModal
        open={Boolean(publishDespublicadaGuard)}
        entradaRotulo={publishDespublicadaGuard?.entradaRotulo}
        confirming={busy}
        onCancelar={() => setPublishDespublicadaGuard(null)}
        onReativarEPublicar={() => {
          const item =
            fila.find((i) => i.id === publishDespublicadaGuard?.itemId) || ativo
          if (!item) return
          savingRef.current = true
          setBusy(true)
          setBusyLabel('Publicando no acervo…')
          void salvarItem(item, {
            openEditor: true,
            reativarDespublicada: true,
            confirmarMesmoLink: true,
          })
            .catch((err) => setError(formatSaveError(err)))
            .finally(() => {
              savingRef.current = false
              setBusy(false)
              setBusyLabel('')
            })
        }}
      />
    </>
  )
}
