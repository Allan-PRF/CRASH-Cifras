export function PainelConfigTeleprompter({
  open,
  modoEvento,
  orientacaoLabel,
  orientacaoDescricao,
  orientacaoIcon,
  mostrarGraus,
  mostrarAcordes,
  mostrarVersiculos,
  mostrarMetronomo,
  miniPlayerYoutube,
  sincronizarVideo,
  temYoutube,
  onToggleMiniPlayer,
  onToggleSincronizarVideo,
  temTimbre,
  fontLabel,
  bpm,
  onClose,
  onToggleModo,
  onToggleOrientacao,
  onToggleGraus,
  onToggleAcordes,
  onToggleVersiculos,
  onToggleMetronomo,
  onShowTimbre,
  onFontDown,
  onFontUp,
  onBpmDown,
  onBpmUp,
}) {
  if (!open) return null

  return (
    <aside
      className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-sm border-l border-white/10 bg-black/95 p-5 text-white shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-label="Configurações do teleprompter"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">⚙️ Teleprompter</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-2 py-1 text-[var(--crash-texto-sec)] hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="mt-6 space-y-5">
        <ConfigRow
          title="Modo Evento"
          description="Rolagem suave sincronizada ao BPM (1 linha por compasso)."
          active={modoEvento}
          onClick={onToggleModo}
        />
        <button
          type="button"
          onClick={onToggleOrientacao}
          className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:border-[var(--crash-cifra)]"
        >
          <span>
            <span className="block text-sm font-semibold">
              {orientacaoIcon} Orientação: {orientacaoLabel}
            </span>
            <span className="mt-1 block text-xs text-[var(--crash-texto-sec)]">
              {orientacaoDescricao}
            </span>
          </span>
          <span className="text-xs font-bold text-[var(--crash-cifra)]">Alternar</span>
        </button>
        <ConfigRow
          title="Acordes"
          description="Linha laranja acima da letra."
          active={mostrarAcordes}
          onClick={onToggleAcordes}
        />
        <ConfigRow
          title="Graus Nashville"
          description="Linha azul abaixo da letra."
          active={mostrarGraus}
          onClick={onToggleGraus}
        />
        <ConfigRow
          title="Versículos"
          description="Rodapé bíblico contextual."
          active={mostrarVersiculos}
          onClick={onToggleVersiculos}
        />
        <ConfigRow
          title="Metrônomo visual"
          description="Ponto laranja piscando no tempo."
          active={mostrarMetronomo}
          onClick={onToggleMetronomo}
        />
        <ConfigRow
          title="Mini player YouTube"
          description={
            temYoutube
              ? 'Vídeo 160×90 no canto inferior direito (arraste para mover).'
              : 'Esta música não tem link do YouTube.'
          }
          active={miniPlayerYoutube && temYoutube}
          onClick={temYoutube ? onToggleMiniPlayer : undefined}
          disabled={!temYoutube}
        />
        <ConfigRow
          title={`Sincronizar com YouTube: ${sincronizarVideo ? 'ON' : 'OFF'}`}
          description={
            sincronizarVideo
              ? 'Play/pause do teleprompter controla o vídeo.'
              : 'Teleprompter e YouTube pausam/tocam de forma independente.'
          }
          active={sincronizarVideo}
          onClick={onToggleSincronizarVideo}
          disabled={!miniPlayerYoutube || !temYoutube}
        />
        <button
          type="button"
          disabled={!temTimbre}
          onClick={onShowTimbre}
          className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:border-[var(--crash-cifra)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span>
            <span className="block text-sm font-semibold">🎛️ Ver timbre da seção</span>
            <span className="mt-1 block text-xs text-[var(--crash-texto-sec)]">
              Card flutuante com timbre, efeitos e pedal.
            </span>
          </span>
          <span className="text-[var(--crash-cifra)]">Abrir</span>
        </button>

        <ControlGroup title={`Fonte: ${fontLabel}`}>
          <button type="button" onClick={onFontDown} className={controlButton}>
            P−
          </button>
          <button type="button" onClick={onFontUp} className={controlButton}>
            G+
          </button>
        </ControlGroup>

        <ControlGroup title={`BPM: ${bpm || '—'}`}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onBpmDown?.(e)
            }}
            className={controlButton}
          >
            −1
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onBpmUp?.(e)
            }}
            className={controlButton}
          >
            +1
          </button>
        </ControlGroup>
      </div>

      <p className="mt-8 rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-relaxed text-[var(--crash-texto-sec)]">
        Atalhos: Espaço pausa/retoma · ←/→ muda seção · ↑/↓ fonte · G graus ·
        T painel · M modo Evento/Ensaio.
      </p>
    </aside>
  )
}

const controlButton =
  'flex-1 rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:border-[var(--crash-cifra)] hover:text-[var(--crash-cifra)]'

function ConfigRow({ title, description, active, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:border-[var(--crash-cifra)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-xs text-[var(--crash-texto-sec)]">
          {description}
        </span>
      </span>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
          active
            ? 'bg-[var(--crash-cifra)] text-black'
            : 'bg-white/10 text-[var(--crash-texto-sec)]'
        }`}
      >
        {active ? 'ON' : 'OFF'}
      </span>
    </button>
  )
}

function ControlGroup({ title, children }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-3 flex gap-2">{children}</div>
    </div>
  )
}
