import { TELEPROMPTER_BARRA_INFERIOR_ALTURA } from './RodapePalavra'

import { TransporTomControle } from '../cifra/TransporTomControle'
import { PwaInstallButton } from '../pwa/PwaInstallButton'
import { PageBackButton } from '../layout/PageBackButton'
import { FUNCIONALIDADE_TOOLTIPS } from '../../lib/funcionalidadeTooltips'
import { InfoTooltip } from '../ui/InfoTooltip'

export function BarraSuperiorTeleprompter({
  musica,
  secaoAtual,
  progresso,
  pausado,
  mostrarGraus,
  mostrarMetronomo,
  metronomeOn,
  modoEvento,
  orientacaoLabel,
  orientacaoIcon,
  tomOriginal,
  offsetSessao,
  onOffsetSessaoChange,
  tomDestino = null,
  onTomDestinoChange,
  onToggleOrientacao,
  onToggleGraus,
  onOpenSettings,
  showOrientacaoToggle = true,
  backTo,
}) {
  const tituloMusica = (
    <>
      <span className="text-[var(--crash-cifra)]">🎵</span>{' '}
      <span className="font-semibold">{musica.titulo}</span>
      {secaoAtual && (
        <>
          <span className="mx-2 text-[var(--crash-texto-sec)]">·</span>
          <span>{secaoAtual.nome}</span>
        </>
      )}
    </>
  )

  const mobileOrientButton = (
    <button
      type="button"
      onClick={onToggleOrientacao}
      className="flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-[var(--crash-cifra)] bg-black/80 px-3 py-2 text-sm text-[var(--crash-cifra)]"
      aria-label={`Alternar orientação: ${orientacaoLabel}`}
    >
      {orientacaoIcon}
    </button>
  )

  const mobileSettingsButton = (
    <button
      type="button"
      onClick={onOpenSettings}
      className="flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-white/15 bg-black/80 px-3 py-2 text-sm text-white"
      aria-label="Configurações do teleprompter"
    >
      ⚙️
    </button>
  )

  return (
    <header className="fixed left-0 right-0 top-0 z-30 border-b border-white/10 bg-black/85 px-3 py-2 text-[13px] font-medium text-white backdrop-blur sm:px-4">
      {/* Mobile: linha 1 = controles; linha 2 = título */}
      <div className="mx-auto max-w-7xl sm:hidden">
        <div className="flex items-center justify-between gap-2">
          <PageBackButton to={backTo} variant="cifra" className="shrink-0 !px-3 !py-1.5 !text-sm" />
          <div className="flex shrink-0 items-center gap-2">
            <PwaInstallButton variant="compact" />
            <TransporTomControle
              tomOriginal={tomOriginal}
              offsetVisual={offsetSessao}
              onOffsetVisualChange={onOffsetSessaoChange}
              tomDestino={tomDestino}
              onTomDestinoChange={onTomDestinoChange}
              variant="teleprompter"
            />
            {showOrientacaoToggle ? mobileOrientButton : null}
            {mobileSettingsButton}
          </div>
        </div>
        <div className="mt-1.5 min-w-0 truncate text-sm leading-snug">{tituloMusica}</div>
      </div>

      {/* Desktop: layout original numa linha */}
      <div className="mx-auto hidden max-w-7xl items-center justify-between gap-3 sm:flex">
        <PageBackButton to={backTo} variant="cifra" className="shrink-0" />
        <div className="min-w-0 flex-1 truncate">{tituloMusica}</div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-[var(--crash-texto-sec)]">{progresso}</span>
          <TransporTomControle
            tomOriginal={tomOriginal}
            offsetVisual={offsetSessao}
            onOffsetVisualChange={onOffsetSessaoChange}
            tomDestino={tomDestino}
            onTomDestinoChange={onTomDestinoChange}
            variant="teleprompter"
          />
          {mostrarMetronomo && (
            <span
              className={`h-2.5 w-2.5 rounded-full bg-[var(--crash-cifra)] transition-opacity ${
                metronomeOn && !pausado && modoEvento ? 'opacity-100' : 'opacity-30'
              }`}
              aria-label="Metrônomo visual"
            />
          )}
          {showOrientacaoToggle && (
          <button
            type="button"
            onClick={onToggleOrientacao}
            className="flex items-center gap-1 rounded-md border border-[var(--crash-cifra)] px-2 py-1 text-[var(--crash-cifra)]"
            aria-label={`Orientação: ${orientacaoLabel}`}
          >
            {orientacaoIcon} {orientacaoLabel}
            <InfoTooltip
              text={
                orientacaoLabel?.toLowerCase().includes('fixo') ||
                orientacaoIcon?.includes('▣')
                  ? FUNCIONALIDADE_TOOLTIPS.modoFixo
                  : orientacaoLabel?.toLowerCase().includes('landscape') ||
                      orientacaoIcon?.includes('↔')
                    ? FUNCIONALIDADE_TOOLTIPS.modoHorizontal
                    : FUNCIONALIDADE_TOOLTIPS.modoVertical
              }
              label="Sobre a orientação"
            />
          </button>
          )}
          <button
            type="button"
            onClick={onToggleGraus}
            className={`flex items-center gap-1 rounded-md border px-2 py-1 ${
              mostrarGraus
                ? 'border-[var(--crash-grau)] text-[var(--crash-grau)]'
                : 'border-white/20 text-[var(--crash-texto-sec)]'
            }`}
          >
            i {mostrarGraus ? 'ON' : 'OFF'}
            <InfoTooltip
              text={FUNCIONALIDADE_TOOLTIPS.grausNashville}
              label="Sobre graus Nashville"
            />
          </button>
          <span className={pausado ? 'text-[var(--crash-cifra)]' : 'text-green-400'}>
            {pausado ? '⏸' : '▶'}
          </span>
          <PwaInstallButton variant="compact" />
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-md border border-white/20 px-2 py-1 text-[var(--crash-texto-sec)] hover:border-[var(--crash-cifra)] hover:text-white"
          >
            ⚙️
          </button>
        </div>
      </div>
    </header>
  )
}

function bpmModoTitle(bpmModoIcon) {
  if (bpmModoIcon === '▣') return 'Modo fixo — BPM não rola a folha'
  if (bpmModoIcon === '↔') return 'BPM landscape (só neste aparelho)'
  return 'BPM oficial da música (banco)'
}

function BpmControls({
  bpm,
  modoEvento,
  bpmModoIcon,
  onBpmDown,
  onBpmUp,
  layout,
}) {
  const labelClass = modoEvento ? 'text-[var(--crash-cifra)]' : 'text-[var(--crash-texto-sec)]'
  const bpmTitle = bpmModoTitle(bpmModoIcon)

  const downButton = (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onBpmDown?.(e)
      }}
      className={
        layout === 'mobile'
          ? 'flex h-9 min-w-9 flex-1 items-center justify-center rounded-lg hover:bg-white/10'
          : 'min-h-10 min-w-10 rounded px-2 py-1 hover:bg-white/10'
      }
      aria-label="Diminuir BPM"
    >
      −
    </button>
  )

  const upButton = (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onBpmUp?.(e)
      }}
      className={
        layout === 'mobile'
          ? 'flex h-9 min-w-9 flex-1 items-center justify-center rounded-lg hover:bg-white/10'
          : 'min-h-10 min-w-10 rounded px-2 py-1 hover:bg-white/10'
      }
      aria-label="Aumentar BPM"
    >
      +
    </button>
  )

  if (layout === 'mobile') {
    return (
      <div className="flex shrink-0 flex-col items-center rounded-xl border border-white/10 px-2 py-1 text-sm text-white sm:hidden">
        <span className={`whitespace-nowrap text-xs font-medium ${labelClass}`} title={bpmTitle}>
          BPM {bpm || '—'} {bpmModoIcon}
        </span>
        <div className="mt-0.5 flex w-full items-center gap-0.5">
          {downButton}
          {upButton}
        </div>
      </div>
    )
  }

  return (
    <div className="hidden shrink-0 items-center gap-1 rounded-xl border border-white/10 px-2 py-1 text-sm text-white sm:flex">
      <span className={`whitespace-nowrap ${labelClass}`} title={bpmTitle}>
        BPM: {bpm || '—'} {bpmModoIcon}
      </span>
      {downButton}
      {upButton}
    </div>
  )
}

export function BarraInferiorTeleprompter({
  pausado,
  bpm,
  modoEvento,
  fontLabel,
  onPrev,
  onReset,
  onTogglePause,
  onNext,
  onBpmDown,
  onBpmUp,
  onFontDown,
  onFontUp,
  footerClassName = '',
  bpmModoIcon = '↕',
  showSectionNav = true,
}) {
  const buttonClass =
    'min-h-12 min-w-12 rounded-xl border border-white/15 bg-white/5 px-4 text-lg font-semibold text-white transition hover:border-[var(--crash-cifra)] hover:text-[var(--crash-cifra)]'

  return (
    <footer
      className={`fixed bottom-0 left-0 right-0 z-30 flex items-center border-t border-white/10 bg-black/90 px-2 backdrop-blur sm:px-4 ${footerClassName}`}
      style={{ height: TELEPROMPTER_BARRA_INFERIOR_ALTURA }}
    >
      <div className="mx-auto flex max-w-4xl items-center justify-center gap-1.5 sm:gap-3">
        <span className="hidden sm:inline-flex">
          <InfoTooltip
            text={FUNCIONALIDADE_TOOLTIPS.barraBlocos}
            label="Sobre a barra de seções"
          />
        </span>
        {showSectionNav && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onPrev?.()
          }}
          className={buttonClass}
          aria-label="Seção anterior"
        >
          ⏮
        </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onReset?.()
          }}
          className={buttonClass}
          aria-label="Voltar ao início da música"
        >
          🔄
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onTogglePause?.()
          }}
          className="hidden min-h-14 min-w-16 rounded-xl bg-[var(--crash-cifra)] px-5 text-xl font-bold text-black transition hover:opacity-90 sm:inline-flex sm:items-center sm:justify-center"
          aria-label={pausado ? 'Retomar' : 'Pausar'}
        >
          {pausado ? '▶' : '⏸'}
        </button>
        {showSectionNav && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onNext?.()
          }}
          className={buttonClass}
          aria-label="Próxima seção"
        >
          ⏭
        </button>
        )}
        <div className="ml-1 hidden items-center gap-1 rounded-xl border border-white/10 px-2 py-1 text-sm text-white sm:flex">
          <span className="text-[var(--crash-texto-sec)]">Fonte {fontLabel}</span>
          <button type="button" onClick={onFontDown} className="rounded px-2 py-1 hover:bg-white/10">
            −
          </button>
          <button type="button" onClick={onFontUp} className="rounded px-2 py-1 hover:bg-white/10">
            +
          </button>
        </div>
        <BpmControls
          bpm={bpm}
          modoEvento={modoEvento}
          bpmModoIcon={bpmModoIcon}
          onBpmDown={onBpmDown}
          onBpmUp={onBpmUp}
          layout="mobile"
        />
        <BpmControls
          bpm={bpm}
          modoEvento={modoEvento}
          bpmModoIcon={bpmModoIcon}
          onBpmDown={onBpmDown}
          onBpmUp={onBpmUp}
          layout="desktop"
        />
      </div>
    </footer>
  )
}
