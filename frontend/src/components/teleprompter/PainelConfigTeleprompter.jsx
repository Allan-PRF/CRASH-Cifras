import { InfoTooltip } from '../ui/InfoTooltip'
import { TransporTomControle } from '../cifra/TransporTomControle'
import { FUNCIONALIDADE_TOOLTIPS } from '../../lib/funcionalidadeTooltips'

export function PainelConfigTeleprompter({
  open,
  modoEvento,
  orientacaoLabel,
  orientacaoDescricao,
  orientacaoIcon,
  mostrarGraus,
  mostrarAcordes,
  simplificar = false,
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
  tomOriginal,
  offsetSessao,
  onOffsetSessaoChange,
  tomDestino = null,
  onTomDestinoChange,
  onClose,
  onToggleModo,
  onToggleOrientacao,
  showOrientacaoToggle = true,
  onToggleGraus,
  onToggleAcordes,
  onToggleSimplificar,
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
        <h2 className="flex items-center gap-2 text-lg font-bold">
          ⚙️ Teleprompter
          <InfoTooltip
            text={FUNCIONALIDADE_TOOLTIPS.teleprompter}
            label="Sobre o teleprompter"
          />
        </h2>
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
          title="Rolagem automática"
          description="Letra sobe no BPM (4 compassos por linha). Desligado = folha parada para rolar com o dedo."
          active={modoEvento}
          onClick={onToggleModo}
        />
        {showOrientacaoToggle && (
        <button
          type="button"
          onClick={onToggleOrientacao}
          className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:border-[var(--crash-cifra)]"
        >
          <span>
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <span>
                {orientacaoIcon} Orientação: {orientacaoLabel}
              </span>
              <InfoTooltip
                text={
                  orientacaoLabel?.toLowerCase().includes('fixo') ||
                  orientacaoIcon?.includes('▣')
                    ? FUNCIONALIDADE_TOOLTIPS.modoFixo
                    : orientacaoLabel?.toLowerCase().includes('deitado') ||
                        orientacaoLabel?.toLowerCase().includes('landscape') ||
                        orientacaoIcon?.includes('↔')
                      ? FUNCIONALIDADE_TOOLTIPS.modoHorizontal
                      : FUNCIONALIDADE_TOOLTIPS.modoVertical
                }
                label="Sobre a orientação do teleprompter"
              />
            </span>
            <span className="mt-1 block text-xs text-[var(--crash-texto-sec)]">
              {orientacaoDescricao}
            </span>
          </span>
          <span className="text-xs font-bold text-[var(--crash-cifra)]">Alternar</span>
        </button>
        )}
        <ConfigRow
          title="Acordes"
          tooltip={FUNCIONALIDADE_TOOLTIPS.cifras}
          active={mostrarAcordes}
          onClick={onToggleAcordes}
        />
        <ConfigRow
          title="Simplificar"
          description="Só visual — mostra tríades básicas (cifra salva intacta)."
          active={simplificar}
          onClick={onToggleSimplificar}
        />
        <ConfigRow
          title="Graus Nashville"
          tooltip={FUNCIONALIDADE_TOOLTIPS.grausNashville}
          active={mostrarGraus}
          onClick={onToggleGraus}
        />
        <ConfigRow
          title="Versículos"
          tooltip={FUNCIONALIDADE_TOOLTIPS.versiculos}
          active={mostrarVersiculos}
          onClick={onToggleVersiculos}
        />
        <ConfigRow
          title="Metrônomo visual"
          tooltip={FUNCIONALIDADE_TOOLTIPS.metronomo}
          active={mostrarMetronomo}
          onClick={onToggleMetronomo}
        />

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold">Tom de execução</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--crash-texto-sec)]">
            Só visual — não altera a cifra salva.
          </p>
          <div className="mt-3">
            <TransporTomControle
              tomOriginal={tomOriginal}
              offsetVisual={offsetSessao}
              onOffsetVisualChange={onOffsetSessaoChange}
              tomDestino={tomDestino}
              onTomDestinoChange={onTomDestinoChange}
              variant="teleprompter"
            />
          </div>
        </div>

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
              ? 'Na 1ª vez que iniciar o teleprompter, o vídeo começa junto; depois ficam independentes.'
              : 'Teleprompter e YouTube sempre independentes (sem início conjunto).'
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
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              🎛️ Ver timbre da seção
              <InfoTooltip text={FUNCIONALIDADE_TOOLTIPS.timbre} label="Sobre o guia de timbre" />
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
        Atalhos: Espaço pausa/retoma · ↑/↓ fonte · G graus · T painel · M rolagem automática
        {showOrientacaoToggle ? ' · O alterna layout (↔ ↕ ▣)' : ''}
        {' · '}+/− BPM.
      </p>
    </aside>
  )
}

const controlButton =
  'flex-1 rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:border-[var(--crash-cifra)] hover:text-[var(--crash-cifra)]'

function ConfigRow({ title, tooltip, description, active, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:border-[var(--crash-cifra)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span>
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          {title}
          {tooltip ? <InfoTooltip text={tooltip} label={`Sobre ${title}`} /> : null}
        </span>
        {description ? (
          <span className="mt-1 block text-xs text-[var(--crash-texto-sec)]">
            {description}
          </span>
        ) : null}
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
