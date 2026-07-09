import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import {
  cancelarImportJob,
  fetchImportJob,
  fetchImportJobsAtivos,
} from '../../services/importacao'
import { clearImportJobRef, loadImportJobRef } from '../../lib/importJobStorage'
import { useProgressoEstimadoMotor } from '../../hooks/useProgressoEstimadoMotor'
import { PROGRESSO_MOTOR_TETO } from '../../lib/progressoImportacaoEstimado'
import { btnSecondaryClassName } from '../ui/inputClasses'

const POLL_ATIVOS_MS = 8000
const POLL_JOB_MS = 4000

function progressoExibido(job) {
  const concluido = job?.status === 'completed' || job?.status === 'done'
  const aguardandoMotor = job?.status === 'processing' && !concluido
  if (concluido) return 100
  if (aguardandoMotor) {
    return Math.min(PROGRESSO_MOTOR_TETO, job?.progresso ?? 55)
  }
  return Math.min(PROGRESSO_MOTOR_TETO, job?.progresso ?? 5)
}

export function ImportacaoEmAndamentoBanner({
  ministroId,
  onJobChange,
  onVerProgresso,
  onConcluido,
}) {
  const { session, loading: authLoading } = useAuth()
  const [job, setJob] = useState(null)
  const [cancelando, setCancelando] = useState(false)
  const [erro, setErro] = useState('')
  const onJobChangeRef = useRef(onJobChange)
  const onConcluidoRef = useRef(onConcluido)

  useEffect(() => {
    onJobChangeRef.current = onJobChange
  }, [onJobChange])

  useEffect(() => {
    onConcluidoRef.current = onConcluido
  }, [onConcluido])

  const aguardandoMotor = job?.status === 'processing'
  const { progresso: estimado } = useProgressoEstimadoMotor(aguardandoMotor, job?.id)
  const bruto = aguardandoMotor ? Math.max(estimado, progressoExibido(job)) : progressoExibido(job)
  const progresso = Math.round(bruto)

  useEffect(() => {
    if (authLoading || !session?.access_token) return undefined

    let cancelado = false

    async function carregar() {
      try {
        const salvos = loadImportJobRef(ministroId)
        const ativos = await fetchImportJobsAtivos({ ministroId })
        const candidato =
          ativos.find((j) => j.id === salvos?.jobId) || ativos[0] || null

        if (cancelado) return

        setErro('')

        if (!candidato && salvos?.jobId) {
          try {
            const antigo = await fetchImportJob(salvos.jobId)
            if (!cancelado && antigo?.status === 'processing') {
              setJob(antigo)
              onJobChangeRef.current?.(antigo)
              return
            }
          } catch {
            clearImportJobRef(ministroId)
          }
        }

        if (candidato?.status === 'processing') {
          setJob(candidato)
          onJobChangeRef.current?.(candidato)
        } else {
          setJob(null)
          onJobChangeRef.current?.(null)
          clearImportJobRef(ministroId)
        }
      } catch {
        /* falha transitória — sem banner de erro na pasta vazia */
      }
    }

    void carregar()
    const interval = setInterval(() => void carregar(), POLL_ATIVOS_MS)
    return () => {
      cancelado = true
      clearInterval(interval)
    }
  }, [ministroId, session?.access_token, authLoading])

  useEffect(() => {
    if (!job?.id || job.status !== 'processing' || authLoading || !session?.access_token) {
      return undefined
    }

    const interval = setInterval(async () => {
      try {
        const atualizado = await fetchImportJob(job.id)
        setJob(atualizado)
        onJobChangeRef.current?.(atualizado)
        setErro('')

        if (atualizado.status === 'completed' || atualizado.status === 'done') {
          clearImportJobRef(ministroId)
          onConcluidoRef.current?.(atualizado)
        } else if (atualizado.status === 'failed') {
          clearImportJobRef(ministroId)
          setErro(atualizado.erro || 'Falha na importação.')
        }
      } catch {
        /* mantém último estado conhecido */
      }
    }, POLL_JOB_MS)

    return () => clearInterval(interval)
  }, [job?.id, job?.status, ministroId, session?.access_token, authLoading])

  if (!job || job.status !== 'processing') {
    if (erro) {
      return (
        <p className="rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2 text-sm text-red-300">
          {erro}
        </p>
      )
    }
    return null
  }

  async function handleCancelar() {
    if (!job?.id || cancelando) return
    setCancelando(true)
    setErro('')
    try {
      const cancelado = await cancelarImportJob(job.id)
      clearImportJobRef(ministroId)
      setJob(null)
      onJobChangeRef.current?.(null)
      if (cancelado?.status === 'failed') {
        setErro(cancelado.erro || 'Importação cancelada.')
      }
    } catch (err) {
      setErro(err.message || 'Não foi possível cancelar.')
    } finally {
      setCancelando(false)
    }
  }

  return (
    <div
      className="space-y-3 rounded-xl border border-[var(--crash-cifra)]/50 bg-[var(--crash-cifra)]/10 p-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--crash-cifra)]">
            Gerando cifra em segundo plano…
          </p>
          <p className="mt-1 text-xs text-[var(--crash-texto-sec)]">
            Pode fechar o app — o motor no servidor continua. {job.etapa}
          </p>
        </div>
        <span className="text-xs font-medium text-white">{progresso}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/40">
        <div
          className="h-full rounded-full bg-[var(--crash-cifra)] transition-[width] duration-700 ease-out"
          style={{ width: `${progresso}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onVerProgresso?.(job)} className={btnSecondaryClassName}>
          Ver progresso
        </button>
        <button
          type="button"
          onClick={() => void handleCancelar()}
          disabled={cancelando}
          className={btnSecondaryClassName}
        >
          {cancelando ? 'Cancelando…' : 'Cancelar importação'}
        </button>
      </div>
    </div>
  )
}
