import { useMemo } from 'react'
import { BlocoSecao } from '../cifra/LinhaCifra.jsx'
import { getTomExibido, transposeLinhas } from '../../lib/transpose'
import { CifraFolhaTransporPreview } from './CifraFolhaTransporPreview.jsx'

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
        As cifras ficam sempre no tom original. Transpor aqui é só para visualizar — não
        altera a cifra salva. Para tocar em outro tom, use o transpose no teleprompter.
      </p>
    </div>
  )
}

function LinhaIntro({ rotulo, conteudo }) {
  const preenchido = Boolean(conteudo?.trim())

  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--crash-texto-sec)]">
        {rotulo}
      </p>
      <div
        className={`font-mono text-base leading-snug ${
          preenchido
            ? 'whitespace-pre-wrap text-white'
            : 'min-h-[1.75rem] border-b border-white/10'
        }`}
      >
        {preenchido ? (
          <p className="m-0 whitespace-pre-wrap">{conteudo}</p>
        ) : (
          <p className="m-0 text-transparent select-none" aria-hidden>
            {'\u00A0'}
          </p>
        )}
      </div>
    </div>
  )
}

/** Introdução fixa no topo — sempre visível, com ou sem conteúdo salvo. */
function CifraEditorIntroBloco({ intro }) {
  const maoEsquerda = intro?.mao_esquerda ?? ''
  const maoDireita = intro?.mao_direita ?? ''

  return (
    <section>
      <TituloSecaoFolha>Introdução</TituloSecaoFolha>
      <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
        <LinhaIntro rotulo="Mão esquerda" conteudo={maoEsquerda} />
        <LinhaIntro rotulo="Mão direita" conteudo={maoDireita} />
      </div>
    </section>
  )
}

function linhasParaExibicao(linhas, offsetVisual, tomOriginal) {
  if (!offsetVisual || !linhas) return linhas
  const tomDestino = getTomExibido(tomOriginal, offsetVisual)
  return transposeLinhas(linhas, offsetVisual, { tonDestino })
}

function CifraEditorSecaoBloco({ secao, tomOriginal, offsetVisual }) {
  const linhasExibidas = useMemo(
    () => linhasParaExibicao(secao.linhas, offsetVisual, tomOriginal),
    [secao.linhas, offsetVisual, tomOriginal],
  )

  const tomGraus = offsetVisual
    ? getTomExibido(tomOriginal, offsetVisual)
    : tomOriginal

  return (
    <section>
      <TituloSecaoFolha>{secao.nome || 'Seção'}</TituloSecaoFolha>
      <BlocoSecao
        linhas={linhasExibidas}
        tomOriginal={tomGraus}
        mostrarAcordes
        mostrarGrau={false}
        visualizacao
        sectionKey={secao.id || secao.slug}
      />
    </section>
  )
}

/**
 * Folha corrida read-only — exibição com transpose visual opcional (não persiste).
 */
export function CifraEditorFolhaMaquete({
  intro,
  secoes,
  tomOriginal,
  offsetVisual = 0,
  onOffsetVisualChange,
}) {
  const listaSecoes = secoes ?? []

  return (
    <div className="overflow-x-hidden rounded-xl border border-[var(--crash-borda)] bg-black px-3 py-4 sm:px-5 sm:py-5">
      <FolhaAlertaTomOriginal />

      <div className="mb-5">
        <CifraFolhaTransporPreview
          tomOriginal={tomOriginal}
          offsetVisual={offsetVisual}
          onOffsetVisualChange={onOffsetVisualChange}
        />
      </div>

      <div className="pb-2">
        <CifraEditorIntroBloco intro={intro} />

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
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
