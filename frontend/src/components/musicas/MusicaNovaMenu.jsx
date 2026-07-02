import { useEffect, useRef, useState } from 'react'
import { btnPrimaryClassName } from '../ui/inputClasses'
import { ImportarYoutubeModal } from './ImportarYoutubeModal'

export function MusicaNovaMenu({ ministroId, ministroNome, onImported }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className={btnPrimaryClassName}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          + Música
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-2 min-w-[200px] overflow-hidden rounded-xl border border-[var(--crash-borda)] bg-[var(--crash-fundo-card)] py-1 shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              className="block w-full px-4 py-2.5 text-left text-sm text-white transition hover:bg-[var(--crash-cifra)]/10"
              onClick={() => {
                setMenuOpen(false)
                setImportOpen(true)
              }}
            >
              Importar do YouTube
            </button>
          </div>
        )}
      </div>

      <ImportarYoutubeModal
        open={importOpen}
        ministroId={ministroId}
        ministroNome={ministroNome}
        onClose={() => setImportOpen(false)}
        onImported={(job) => {
          onImported?.(job)
        }}
      />
    </>
  )
}
