import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BlocoSecao } from '../cifra/LinhaCifra.jsx'
import { getTomExibido, transposeLinhas } from '../../lib/transpose'
import { simplifyLinhas } from '../../lib/simplify'
import { CifraSecaoEditorVisual } from './CifraSecaoEditorVisual.jsx'
import { btnCifraOutlineClassName, btnSecondaryClassName } from '../ui/inputClasses'

function TituloSecaoFolha({ children }) {
  return (
    <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--crash-cifra)]">
      {children}
    </h2>
  )
}

function FolhaDivisor() {
  return (
    <div
      className="my-8 border-t border-[var(--crash-cifra)]/25"
      role="separator"
      aria-hidden
    />
  )
}

function FolhaAvisoTransposeDesativado({ visivel }) {
  if (!visivel) return null

  return (
    <div
      className="mb-4 flex gap-3 rounded-lg border border-amber-600/35 bg-amber-950/25 px-3 py-2.5 sm:px-4"
      role="status"
    >
      <span className="shrink-0 text-amber-300/90" aria-hidden>
        ℹ️
      </span>
      <p className="text-xs leading-relaxed text-amber-100/95 sm:text-sm">
        Transpose desativado — você está editando no tom original.
      </p>
    </div>
  )
}

function CifraEditorSecaoPreview({
  secao,
  tomOriginal,
  offsetVisual,
  tomDestino,
  simplificar,
}) {
  const linhasExibidas = useMemo(() => {
    let linhas = secao.linhas
    if (offsetVisual && secao.linhas) {
      const tonDestinoCalc = getTomExibido(tomOriginal, offsetVisual, tomDestino)
      linhas = transposeLinhas(secao.linhas, offsetVisual, {
        tonDestino: tonDestinoCalc ?? undefined,
      })
    }
    if (simplificar && linhas) {
      linhas = simplifyLinhas(linhas)
    }
    return linhas
  }, [secao.linhas, offsetVisual, tomOriginal, tomDestino, simplificar])

  const tomGraus = offsetVisual
    ? getTomExibido(tomOriginal, offsetVisual, tomDestino)
    : tomOriginal

  return (
    <BlocoSecao
      linhas={linhasExibidas}
      tomOriginal={tomGraus}
      mostrarAcordes
      mostrarGrau={false}
      visualizacao
      sectionKey={secao.id || secao.slug}
    />
  )
}

function CifraEditorSecaoBloco({
  secao,
  tomOriginal,
  offsetVisual,
  tomDestino,
  simplificar,
  onSecaoLinhasChange,
  onEditStart,
}) {
  const emPreview = offsetVisual !== 0 || simplificar

  return (
    <section>
      <TituloSecaoFolha>{secao.nome || 'Seção'}</TituloSecaoFolha>

      {emPreview ? (
        <div
          className="cursor-text"
          onMouseDown={(e) => {
            if (e.button !== 0) return
            onEditStart?.()
          }}
          role="presentation"
        >
          <CifraEditorSecaoPreview
            secao={secao}
            tomOriginal={tomOriginal}
            offsetVisual={offsetVisual}
            tomDestino={tomDestino}
            simplificar={simplificar}
          />
          <p className="mt-2 text-xs text-[var(--crash-texto-sec)]">
            Clique na letra ou desative Simplificar/Original para editar.
          </p>
        </div>
      ) : (
        <CifraSecaoEditorVisual
          linhas={secao.linhas}
          variant="folha"
          onEditStart={onEditStart}
          onChange={(nextLinhas) => onSecaoLinhasChange?.(nextLinhas)}
        />
      )}
    </section>
  )
}

/**
 * Folha corrida — letra editável (tom original); transpose/simplificar visuais (não persistem).
 * Intro é seção/linhas normais (sem card mão esquerda/direita).
 */
export function CifraEditorFolhaMaquete({
  secoes,
  tomOriginal,
  offsetVisual = 0,
  onOffsetVisualChange,
  tomDestino = null,
  onTomDestinoChange,
  onAddSecao,
  onSecaoLinhasChange,
}) {
  const listaSecoes = secoes ?? []
  const [simplificar, setSimplificar] = useState(false)
  const [avisoTransposeDesativado, setAvisoTransposeDesativado] = useState(false)
  const avisoTimerRef = useRef(null)

  const mostrarAvisoTransposeDesativado = useCallback(() => {
    setAvisoTransposeDesativado(true)
    if (avisoTimerRef.current) clearTimeout(avisoTimerRef.current)
    avisoTimerRef.current = setTimeout(() => {
      setAvisoTransposeDesativado(false)
      avisoTimerRef.current = null
    }, 3000)
  }, [])

  const handleEditStart = useCallback(() => {
    let saiuDoPreview = false
    if (offsetVisual !== 0 && onOffsetVisualChange) {
      onOffsetVisualChange(0)
      onTomDestinoChange?.(null)
      saiuDoPreview = true
    }
    if (simplificar) {
      setSimplificar(false)
      saiuDoPreview = true
    }
    if (saiuDoPreview) mostrarAvisoTransposeDesativado()
  }, [
    offsetVisual,
    onOffsetVisualChange,
    onTomDestinoChange,
    simplificar,
    mostrarAvisoTransposeDesativado,
  ])

  useEffect(() => {
    return () => {
      if (avisoTimerRef.current) clearTimeout(avisoTimerRef.current)
    }
  }, [])

  return (
    <div className="overflow-x-hidden rounded-xl border border-[var(--crash-borda)] bg-black px-3 py-4 sm:px-5 sm:py-5">
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setSimplificar((v) => !v)}
          className={`${btnCifraOutlineClassName} px-3 py-1.5 text-xs sm:text-sm ${
            simplificar ? 'border-[var(--crash-cifra)] bg-[var(--crash-cifra)]/25' : ''
          }`}
          aria-pressed={simplificar}
        >
          Simplificar{simplificar ? ' · ON' : ''}
        </button>
      </div>

      <FolhaAvisoTransposeDesativado visivel={avisoTransposeDesativado} />

      <div className="pb-2">
        {listaSecoes.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--crash-texto-sec)]">
            Nenhuma seção ainda. Use o botão abaixo para adicionar blocos à folha.
          </p>
        ) : (
          listaSecoes.map((secao, index) => (
            <div key={secao.id || `sec-${index}`}>
              {index > 0 ? <FolhaDivisor /> : null}
              <CifraEditorSecaoBloco
                secao={secao}
                tomOriginal={tomOriginal}
                offsetVisual={offsetVisual}
                tomDestino={tomDestino}
                simplificar={simplificar}
                onEditStart={handleEditStart}
                onSecaoLinhasChange={(linhas) => onSecaoLinhasChange?.(index, linhas)}
              />
            </div>
          ))
        )}

        {onAddSecao && (
          <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--crash-cifra)]/20 pt-4">
            <button type="button" onClick={onAddSecao} className={btnSecondaryClassName}>
              + Seção
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
