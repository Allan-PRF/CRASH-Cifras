import { InfoTooltip } from '../ui/InfoTooltip'
import { FUNCIONALIDADE_TOOLTIPS } from '../../lib/funcionalidadeTooltips'

export function EquipeLiveIndicator({ isLider, membrosOnline, liderNome, seguindo }) {
  if (!seguindo && !isLider) return null

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
