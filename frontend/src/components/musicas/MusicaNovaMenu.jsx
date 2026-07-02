import { useState } from 'react'
import { btnPrimaryClassName } from '../ui/inputClasses'
import { ImportarYoutubeModal } from './ImportarYoutubeModal'

export function MusicaNovaMenu({ ministroId, ministroNome, onImported }) {
  const [importOpen, setImportOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setImportOpen(true)}
        className={btnPrimaryClassName}
      >
        + Música
      </button>

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
