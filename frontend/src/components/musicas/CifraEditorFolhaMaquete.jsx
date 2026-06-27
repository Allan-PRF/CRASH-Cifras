import { BlocoSecao } from '../cifra/LinhaCifra.jsx'

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

function CifraEditorSecaoBloco({ secao, tomOriginal }) {
  return (
    <section>
      <TituloSecaoFolha>{secao.nome || 'Seção'}</TituloSecaoFolha>
      <BlocoSecao
        linhas={secao.linhas}
        tomOriginal={tomOriginal}
        mostrarAcordes
        mostrarGrau={false}
        visualizacao
        sectionKey={secao.id || secao.slug}
      />
    </section>
  )
}

/**
 * Fase 1 — maquete visual: folha corrida read-only (mesmo look da aba Cifra).
 * Edição e alinhamento fino vêm nas fases seguintes.
 */
export function CifraEditorFolhaMaquete({ intro, secoes, tomOriginal }) {
  const listaSecoes = secoes ?? []

  return (
    <div className="overflow-x-hidden rounded-xl border border-[var(--crash-borda)] bg-black px-3 py-4 sm:px-5 sm:py-5">
      <p className="mb-6 text-[10px] uppercase tracking-widest text-[var(--crash-texto-sec)]/60">
        Pré-visualização do editor — folha corrida
      </p>

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
              <CifraEditorSecaoBloco secao={secao} tomOriginal={tomOriginal} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
