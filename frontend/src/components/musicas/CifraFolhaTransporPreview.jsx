import { TransporTomControle } from '../cifra/TransporTomControle'

/**
 * Transposição só visual na folha — popover com TranspositorTom (maiores + menores).
 */
export function CifraFolhaTransporPreview({
  tomOriginal,
  offsetVisual,
  onOffsetVisualChange,
}) {
  return (
    <TransporTomControle
      tomOriginal={tomOriginal}
      offsetVisual={offsetVisual}
      onOffsetVisualChange={onOffsetVisualChange}
      variant="folha"
    />
  )
}
