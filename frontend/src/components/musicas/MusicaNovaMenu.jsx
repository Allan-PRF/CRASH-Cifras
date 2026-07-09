import { useState } from 'react'
import { btnPrimaryClassName } from '../ui/inputClasses'
import { ImportarYoutubeModal } from './ImportarYoutubeModal'

export function MusicaNovaMenu({
  ministroId,
  ministroNome,
  onImported,
  resumeJob = null,
  importOpen: importOpenProp,
  onImportOpenChange,
}) {
  const [importOpenInternal, setImportOpenInternal] = useState(false)
  const importOpen = importOpenProp ?? importOpenInternal
  const setImportOpen = onImportOpenChange ?? setImportOpenInternal

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
        resumeJob={resumeJob}
        onClose={() => setImportOpen(false)}
        onImported={(job) => {
          onImported?.(job)
        }}
      />
    </>
  )
}
