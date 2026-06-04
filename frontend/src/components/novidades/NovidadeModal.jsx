import { youtubeEmbedUrl } from '../../lib/youtubeEmbed'

export function NovidadeModal({ novidade, open, onClose }) {
  if (!open || !novidade) return null

  const embed = youtubeEmbedUrl(novidade.video_url)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="novidade-modal-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--crash-borda)] bg-[var(--crash-fundo-card)] p-5 shadow-xl">
        <header className="flex items-start justify-between gap-3">
          <h2 id="novidade-modal-title" className="text-lg font-bold text-white">
            {novidade.titulo}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2 py-1 text-sm text-[var(--crash-texto-sec)] hover:bg-white/10 hover:text-white"
            aria-label="Fechar"
          >
            ✕
          </button>
        </header>

        <p className="mt-3 text-sm text-[var(--crash-texto-sec)]">{novidade.descricao}</p>

        {embed ? (
          <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-xl border border-[var(--crash-borda)] bg-black">
            <iframe
              title={novidade.titulo}
              src={embed}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : novidade.video_url ? (
          <p className="mt-4 text-xs text-red-400">Link de vídeo inválido.</p>
        ) : null}
      </div>
    </div>
  )
}
