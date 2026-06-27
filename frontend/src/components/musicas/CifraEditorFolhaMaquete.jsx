import { BlocoSecao } from '../cifra/LinhaCifra.jsx'

function introPreenchida(intro) {
  return Boolean(intro?.mao_esquerda?.trim() || intro?.mao_direita?.trim())
}

function CifraEditorIntroBloco({ intro }) {
  if (!introPreenchida(intro)) return null

  const maoE = intro.mao_esquerda?.trim()
  const maoD = intro.mao_direita?.trim()

  return (
    <section className="pb-2">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--crash-cifra)]">
        Introdução
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {maoE && (
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[var(--crash-texto-sec)]/80">
              Mão esquerda
            </p>
            <p className="m-0 whitespace-pre-wrap font-mono text-base leading-snug text-white">
              {intro.mao_esquerda}
            </p>
          </div>
        )}
        {maoD && (
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[var(--crash-texto-sec)]/80">
              Mão direita
            </p>
            <p className="m-0 whitespace-pre-wrap font-mono text-base leading-snug text-white">
              {intro.mao_direita}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

function CifraEditorSecaoBloco({ secao, tomOriginal, comDivisorSuperior }) {
  return (
    <section
      className={
        comDivisorSuperior
          ? 'border-t border-white/[0.08] pt-6'
          : 'pt-1'
      }
    >
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--crash-cifra)]">
        {secao.nome || 'Seção'}
      </h2>
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
      <p className="mb-4 text-[10px] uppercase tracking-widest text-[var(--crash-texto-sec)]/60">
        Pré-visualização do editor — folha corrida
      </p>

      {!temIntro && !temSecoes ? (
        <p className="text-sm text-[var(--crash-texto-sec)]">
          Nenhuma seção ainda. Use &quot;+ Seção&quot; para adicionar blocos à folha.
        </p>
      ) : (
        <div className="space-y-6 pb-2">
          {temIntro && <CifraEditorIntroBloco intro={intro} />}

          {secoes.map((secao, index) => (
            <CifraEditorSecaoBloco
              key={secao.id || `sec-${index}`}
              secao={secao}
              tomOriginal={tomOriginal}
              comDivisorSuperior={index > 0 || temIntro}
            />
          ))}
        </div>
      )}
    </div>
  )
}
