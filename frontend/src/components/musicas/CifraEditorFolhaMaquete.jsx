import { BlocoSecao } from '../cifra/LinhaCifra.jsx'

function introPreenchida(intro) {
  return Boolean(intro?.mao_esquerda?.trim() || intro?.mao_direita?.trim())
}

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
      className="my-8 border-t border-white/15"
      role="separator"
      aria-hidden
    />
  )
}

function LinhaIntro({ rotulo, conteudo }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--crash-texto-sec)]">
        {rotulo}
      </p>
      <p className="m-0 whitespace-pre-wrap font-mono text-base leading-snug text-white">
        {conteudo?.trim() ? conteudo : '\u00A0'}
      </p>
    </div>
  )
}

function CifraEditorIntroBloco({ intro }) {
  if (!introPreenchida(intro)) return null

  return (
    <section>
      <TituloSecaoFolha>Introdução</TituloSecaoFolha>
      <div className="space-y-5">
        <LinhaIntro rotulo="Mão direita" conteudo={intro.mao_direita} />
        <LinhaIntro rotulo="Mão esquerda" conteudo={intro.mao_esquerda} />
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
  const temIntro = introPreenchida(intro)
  const temSecoes = secoes?.length > 0

  return (
    <div className="overflow-x-hidden rounded-xl border border-[var(--crash-borda)] bg-black px-3 py-4 sm:px-5 sm:py-5">
      <p className="mb-6 text-[10px] uppercase tracking-widest text-[var(--crash-texto-sec)]/60">
        Pré-visualização do editor — folha corrida
      </p>

      {!temIntro && !temSecoes ? (
        <p className="text-sm text-[var(--crash-texto-sec)]">
          Nenhuma seção ainda. Use &quot;+ Seção&quot; para adicionar blocos à folha.
        </p>
      ) : (
        <div className="pb-2">
          {temIntro && <CifraEditorIntroBloco intro={intro} />}

          {secoes.map((secao, index) => (
            <div key={secao.id || `sec-${index}`}>
              {(index > 0 || temIntro) && <FolhaDivisor />}
              <CifraEditorSecaoBloco secao={secao} tomOriginal={tomOriginal} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
