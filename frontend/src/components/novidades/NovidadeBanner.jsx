import { useEffect, useState } from 'react'
import { fetchNovidadeAtiva } from '../../services/novidades'
import { NovidadeModal } from './NovidadeModal'

const dismissKey = (id) => `crash-novidade-dismissed-${id}`

export function NovidadeBanner() {
  const [novidade, setNovidade] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    fetchNovidadeAtiva()
      .then((data) => {
        if (!data) {
          setNovidade(null)
          return
        }
        const dismissed = localStorage.getItem(dismissKey(data.id)) === '1'
        setNovidade(data)
        setHidden(dismissed)
      })
      .catch(() => setNovidade(null))
  }, [])

  if (!novidade || hidden) return null

  function dismiss() {
    localStorage.setItem(dismissKey(novidade.id), '1')
    setHidden(true)
  }

  return (
    <>
      <div className="relative rounded-2xl border border-[var(--crash-cifra)]/40 bg-[var(--crash-cifra)]/10 p-4 pr-12">
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 rounded-md p-1 text-[var(--crash-texto-sec)] hover:bg-black/20 hover:text-white"
          aria-label="Fechar banner"
        >
          ✕
        </button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--crash-cifra)]">
              <span aria-hidden>🎉</span> Novidade
            </p>
            <h2 className="mt-1 font-bold text-white">{novidade.titulo}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-[var(--crash-texto-sec)]">
              {novidade.descricao}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="shrink-0 rounded-lg bg-[var(--crash-cifra)] px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
          >
            Ver novidade
          </button>
        </div>
      </div>

      <NovidadeModal
        novidade={novidade}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  )
}
