import { useState } from 'react'
import { PageNav } from '../components/layout/PageNav'
import { ImportarArquivoModal } from '../components/musicas/ImportarArquivoModal'
import { btnPrimaryClassName } from '../components/ui/inputClasses'

/**
 * Área admin: Word/ODT + YouTube → acervo global (atalho comunitário).
 * Acesso: Conta → Curadoria do acervo (só administrador).
 */
export function AdminCuradoria() {
  const [arquivoOpen, setArquivoOpen] = useState(false)
  const [ultimaPublicada, setUltimaPublicada] = useState(null)

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <PageNav
        breadcrumbItems={[
          { label: 'Início', to: '/' },
          { label: 'Conta', to: '/conta' },
          { label: 'Curadoria' },
        ]}
        backTo="/conta"
        backVariant="cifra"
      />

      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Curadoria do acervo</h1>
        <p className="text-sm leading-relaxed text-[var(--crash-texto-sec)]">
          Importe a cifra corrigida (Word, ODT, PDF ou TXT) e cole o link do YouTube da
          canção. A cifra fica no acervo global: quem importar o mesmo vídeo recebe o
          atalho, sem passar pelo motor.
        </p>
      </header>

      <ol className="list-decimal space-y-1 pl-5 text-sm text-[var(--crash-texto-sec)]">
        <li>Escolha o arquivo da cifra</li>
        <li>Confira título, artista e tom</li>
        <li>Cole o link do YouTube (obrigatório)</li>
        <li>Publique no acervo global</li>
      </ol>

      {ultimaPublicada ? (
        <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Publicada: {ultimaPublicada}
        </p>
      ) : null}

      <button
        type="button"
        className={`${btnPrimaryClassName} w-full sm:w-auto`}
        onClick={() => setArquivoOpen(true)}
      >
        Importar documento e publicar
      </button>

      <ImportarArquivoModal
        open={arquivoOpen}
        somenteAcervo
        onClose={() => setArquivoOpen(false)}
        onImported={(musica) => {
          setUltimaPublicada(
            [musica?.titulo, musica?.artista].filter(Boolean).join(' · ') ||
              'Música publicada no acervo',
          )
        }}
      />
    </section>
  )
}
