import { TransporTomControle } from '../cifra/TransporTomControle'

/**
 * Transposição na folha — preview visual + botão Aplicar tom (reescreve acordes).
 */
export function CifraFolhaTransporPreview({
  tomOriginal,
  offsetVisual,
  onOffsetVisualChange,
  tomDestino,
  onTomDestinoChange,
  onAplicarTom,
}) {
  return (
    <TransporTomControle
      tomOriginal={tomOriginal}
      offsetVisual={offsetVisual}
      onOffsetVisualChange={onOffsetVisualChange}
      tomDestino={tomDestino}
      onTomDestinoChange={onTomDestinoChange}
      onAplicarTom={onAplicarTom}
      variant="folha"
    />
  )
}
