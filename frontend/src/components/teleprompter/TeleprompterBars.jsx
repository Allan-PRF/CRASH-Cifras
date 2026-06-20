import { TELEPROMPTER_BARRA_INFERIOR_ALTURA } from './RodapePalavra'

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
  onToggleOrientacao,
  onToggleGraus,
  onOpenSettings,
  onBack,
}) {
  return (
    <header className="fixed left-0 right-0 top-0 z-30 border-b border-white/10 bg-black/85 px-4 py-2 text-[13px] font-medium text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-md px-2 py-1 text-xl leading-none text-[var(--crash-texto-sec)] hover:bg-white/10 hover:text-white"
          aria-label="Voltar para a música"
        >
          ←
        </button>
        <div className="min-w-0 flex-1 truncate">
          <span className="text-[var(--crash-cifra)]">🎵</span>{' '}
          <span className="font-semibold">{musica.titulo}</span>
          {secaoAtual && (
            <>
              <span className="mx-2 text-[var(--crash-texto-sec)]">·</span>
              <span>{secaoAtual.nome}</span>
            </>
          )}
        </div>
        <div className="hidden shrink-0 items-center gap-3 sm:flex">
          <span className="text-[var(--crash-texto-sec)]">{progresso}</span>
          <span>Tom: {musica.tom_exibido || '—'}</span>
          {mostrarMetronomo && (
            <span
              className={`h-2.5 w-2.5 rounded-full bg-[var(--crash-cifra)] transition-opacity ${
                metronomeOn && !pausado && modoEvento ? 'opacity-100' : 'opacity-30'
              }`}
              aria-label="Metrônomo visual"
            />
          )}
          <button
            type="button"
            onClick={onToggleOrientacao}
            className="flex items-center gap-1 rounded-md border border-[var(--crash-cifra)] px-2 py-1 text-[var(--crash-cifra)]"
            aria-label={`Orientação: ${orientacaoLabel}`}
          >
            {orientacaoIcon} {orientacaoLabel}
            <InfoTooltip
              text={
                orientacaoLabel?.toLowerCase().includes('horizontal') ||
                orientacaoIcon?.includes('📺')
                  ? FUNCIONALIDADE_TOOLTIPS.modoHorizontal
                  : FUNCIONALIDADE_TOOLTIPS.modoVertical
              }
              label="Sobre a orientação"
            />
          </button>
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
}) {
  const buttonClass =
    'min-h-12 min-w-12 rounded-xl border border-white/15 bg-white/5 px-4 text-lg font-semibold text-white transition hover:border-[var(--crash-cifra)] hover:text-[var(--crash-cifra)]'

  return (
    <footer
      className={`fixed bottom-0 left-0 right-0 z-30 flex items-center border-t border-white/10 bg-black/90 px-4 backdrop-blur ${footerClassName}`}
      style={{ height: TELEPROMPTER_BARRA_INFERIOR_ALTURA }}
    >
      <div className="mx-auto flex max-w-4xl items-center justify-center gap-2 sm:gap-3">
        <InfoTooltip
          text={FUNCIONALIDADE_TOOLTIPS.barraBlocos}
          label="Sobre a barra de seções"
        />
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
          className="min-h-14 min-w-16 rounded-xl bg-[var(--crash-cifra)] px-5 text-xl font-bold text-black transition hover:opacity-90"
          aria-label={pausado ? 'Retomar' : 'Pausar'}
        >
          {pausado ? '▶' : '⏸'}
        </button>
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
        <div className="ml-1 hidden items-center gap-1 rounded-xl border border-white/10 px-2 py-1 text-sm text-white sm:flex">
          <span className="text-[var(--crash-texto-sec)]">Fonte {fontLabel}</span>
          <button type="button" onClick={onFontDown} className="rounded px-2 py-1 hover:bg-white/10">
            −
          </button>
          <button type="button" onClick={onFontUp} className="rounded px-2 py-1 hover:bg-white/10">
            +
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-xl border border-white/10 px-2 py-1 text-sm text-white">
          <span
            className={modoEvento ? 'text-[var(--crash-cifra)]' : 'text-[var(--crash-texto-sec)]'}
            title={
              bpmModoIcon === '↔'
                ? 'BPM landscape (só neste aparelho)'
                : 'BPM oficial da música (banco)'
            }
          >
            BPM: {bpm || '—'} {bpmModoIcon}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onBpmDown?.(e)
            }}
            className="min-h-10 min-w-10 rounded px-2 py-1 hover:bg-white/10"
            aria-label="Diminuir BPM"
          >
            −
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onBpmUp?.(e)
            }}
            className="min-h-10 min-w-10 rounded px-2 py-1 hover:bg-white/10"
            aria-label="Aumentar BPM"
          >
            +
          </button>
        </div>
      </div>
    </footer>
  )
}
