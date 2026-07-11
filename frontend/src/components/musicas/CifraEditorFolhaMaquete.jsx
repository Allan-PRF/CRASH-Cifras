import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BlocoSecao } from '../cifra/LinhaCifra.jsx'
import { getTomExibido, transposeLinhas } from '../../lib/transpose'
import { CifraFolhaTransporPreview } from './CifraFolhaTransporPreview.jsx'
import { CifraSecaoEditorVisual } from './CifraSecaoEditorVisual.jsx'
import { IntroducaoEditor } from './IntroducaoEditor.jsx'

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

function FolhaAlertaTomOriginal() {
  return (
    <div
      className="mb-4 flex gap-3 rounded-lg border border-sky-600/30 bg-sky-950/20 px-3 py-3 sm:px-4"
      role="status"
    >
      <span className="shrink-0 text-sky-300/90" aria-hidden>
        ℹ️
      </span>
      <p className="text-xs leading-relaxed text-sky-100/90 sm:text-sm">
        Escolha um tom para visualizar ou use <strong className="font-semibold">Aplicar tom</strong>{' '}
        para reescrever todos os acordes da cifra no tom escolhido. A introdução (mãos) não
        transponde.
      </p>
    </div>
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
}) {
  const linhasExibidas = useMemo(() => {
    if (!offsetVisual || !secao.linhas) {
      return secao.linhas
    }
    const tonDestinoCalc = getTomExibido(tomOriginal, offsetVisual, tomDestino)
    return transposeLinhas(secao.linhas, offsetVisual, {
      tonDestino: tonDestinoCalc ?? undefined,
    })
  }, [secao.linhas, offsetVisual, tomOriginal, tomDestino])

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
  onSecaoLinhasChange,
  onEditStart,
}) {
  const emPreviewTransposto = offsetVisual !== 0

  return (
    <section>
      <TituloSecaoFolha>{secao.nome || 'Seção'}</TituloSecaoFolha>

      {emPreviewTransposto ? (
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
          />
          <p className="mt-2 text-xs text-[var(--crash-texto-sec)]">
            Clique na letra ou use &quot;Original&quot; para editar no tom original.
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
 * Folha corrida — letra editável (tom original); transpose visual opcional (não persiste).
 */
export function CifraEditorFolhaMaquete({
  intro,
  introEditorRef,
  onIntroChange,
  secoes,
  tomOriginal,
  offsetVisual = 0,
  onOffsetVisualChange,
  tomDestino = null,
  onTomDestinoChange,
  onAplicarTom,
  onSecaoLinhasChange,
}) {
  const listaSecoes = secoes ?? []
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
    if (offsetVisual !== 0 && onOffsetVisualChange) {
      onOffsetVisualChange(0)
      onTomDestinoChange?.(null)
      mostrarAvisoTransposeDesativado()
    }
  }, [offsetVisual, onOffsetVisualChange, onTomDestinoChange, mostrarAvisoTransposeDesativado])

  useEffect(() => {
    return () => {
      if (avisoTimerRef.current) clearTimeout(avisoTimerRef.current)
    }
  }, [])

  return (
    <div className="overflow-x-hidden rounded-xl border border-[var(--crash-borda)] bg-black px-3 py-4 sm:px-5 sm:py-5">
      <FolhaAlertaTomOriginal />
      <FolhaAvisoTransposeDesativado visivel={avisoTransposeDesativado} />

      <div className="mb-5">
        <CifraFolhaTransporPreview
          tomOriginal={tomOriginal}
          offsetVisual={offsetVisual}
          onOffsetVisualChange={onOffsetVisualChange}
          tomDestino={tomDestino}
          onTomDestinoChange={onTomDestinoChange}
          onAplicarTom={onAplicarTom}
        />
      </div>

      <div className="pb-2">
        <IntroducaoEditor
          ref={introEditorRef}
          intro={intro}
          variant="folha"
          onChange={onIntroChange}
        />

        {listaSecoes.length === 0 ? (
          <p className="mt-8 text-sm text-[var(--crash-texto-sec)]">
            Nenhuma seção ainda. Use &quot;+ Seção&quot; para adicionar blocos à folha.
          </p>
        ) : (
          listaSecoes.map((secao, index) => (
            <div key={secao.id || `sec-${index}`}>
              <FolhaDivisor />
              <CifraEditorSecaoBloco
                secao={secao}
                tomOriginal={tomOriginal}
                offsetVisual={offsetVisual}
                tomDestino={tomDestino}
                onEditStart={handleEditStart}
                onSecaoLinhasChange={(linhas) => onSecaoLinhasChange?.(index, linhas)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
