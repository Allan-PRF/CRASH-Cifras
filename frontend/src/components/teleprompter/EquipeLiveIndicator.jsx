import { InfoTooltip } from '../ui/InfoTooltip'
import { FUNCIONALIDADE_TOOLTIPS } from '../../lib/funcionalidadeTooltips'

export function EquipeLiveIndicator({
  isLider,
  membrosOnline,
  liderNome,
  seguindo,
  variant = 'default',
}) {
  if (!seguindo && !isLider) return null

  if (variant === 'compact') {
    const detail = isLider
      ? `${membrosOnline} membro${membrosOnline !== 1 ? 's' : ''} conectado${membrosOnline !== 1 ? 's' : ''}`
      : liderNome
        ? `Seguindo ${liderNome}`
        : 'Sincronizado com a equipe'

    return (
      <div
        className="flex max-w-[10rem] items-center gap-1.5 rounded-full border border-green-700/40 bg-green-950/85 px-2 py-1 text-[10px] shadow-lg shadow-black/40 backdrop-blur-sm"
        title={detail}
      >
        <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-green-400" />
        <span className="truncate font-semibold text-green-400">AO VIVO</span>
        {isLider && membrosOnline > 0 ? (
          <span className="shrink-0 text-green-200/70">{membrosOnline}</span>
        ) : null}
      </div>
    )
  }

  if (isLider) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-green-700/40 bg-green-950/40 px-3 py-1 text-xs">
        <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
        <span className="font-semibold text-green-400">AO VIVO</span>
        <span className="text-green-200/70">
          {membrosOnline} membro{membrosOnline !== 1 ? 's' : ''} conectado{membrosOnline !== 1 ? 's' : ''}
        </span>
        <InfoTooltip text={FUNCIONALIDADE_TOOLTIPS.modoBanda} label="Sobre o modo banda" />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-green-700/40 bg-green-950/40 px-3 py-1 text-xs">
      <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
      <span className="font-semibold text-green-400">AO VIVO</span>
      {liderNome && (
        <span className="text-green-200/70">Seguindo {liderNome}</span>
      )}
      <InfoTooltip text={FUNCIONALIDADE_TOOLTIPS.modoBanda} label="Sobre o modo banda" />
    </div>
  )
}
