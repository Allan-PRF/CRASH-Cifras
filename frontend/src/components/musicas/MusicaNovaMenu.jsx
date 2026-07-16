import { useState } from 'react'
import { btnPrimaryClassName, btnSecondaryClassName } from '../ui/inputClasses'
import { useAuth } from '../../hooks/useAuth'
import { isAdminUser } from '../../lib/admin'
import { ImportarYoutubeModal } from './ImportarYoutubeModal'
import { ImportarArquivoModal } from './ImportarArquivoModal'

export function MusicaNovaMenu({
  ministroId,
  ministroNome,
  onImported,
  resumeJob = null,
  importOpen: importOpenProp,
  onImportOpenChange,
}) {
  const { user } = useAuth()
  const isAdmin = isAdminUser(user)
  const [importOpenInternal, setImportOpenInternal] = useState(false)
  const importOpen = importOpenProp ?? importOpenInternal
  const setImportOpen = onImportOpenChange ?? setImportOpenInternal
  const [arquivoOpen, setArquivoOpen] = useState(false)

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className={btnPrimaryClassName}
        >
          + Música (YouTube)
        </button>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => setArquivoOpen(true)}
            className={`${btnSecondaryClassName} hidden lg:inline-flex`}
          >
            Importar arquivo
          </button>
        ) : null}
      </div>

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

      {isAdmin ? (
        <ImportarArquivoModal
          open={arquivoOpen}
          ministroId={ministroId}
          onClose={() => setArquivoOpen(false)}
          onImported={(musica) => {
            onImported?.(musica)
          }}
        />
      ) : null}
    </>
  )
}
