import { gerarVersiculosIA } from '../services/versiculos'
import { montarRespostaFallback } from '@crash-cifras/shared/versiculos-fallback'

/**
 * Gera versículos com IA (Claude no backend; prompt: somente Bíblia Sagrada).
 * Se a API falhar, usa fallback local rotacionado.
 */
export async function gerarVersiculos(musica, versaoBiblica = 'NVI') {
  try {
    return await gerarVersiculosIA({
      versaoBiblica,
      titulo: musica?.titulo,
      artista: musica?.artista,
      tom: musica?.tom_exibido || musica?.tom_original || '',
      secoes: musica?.secoes,
    })
  } catch {
    return montarRespostaFallback(musica, versaoBiblica)
  }
}

export { montarRespostaFallback as gerarVersiculosLocais } from '@crash-cifras/shared/versiculos-fallback'

export { escolherVersiculoParaSecao } from '@crash-cifras/shared/versiculos-config'

/** @deprecated Use escolherVersiculoParaSecao com quantidade e secao_id */
export function escolherVersiculoPorSecao(versiculos, momento) {
  if (!Array.isArray(versiculos) || versiculos.length === 0) return null
  return (
    versiculos.find((item) => item.momento === momento) ||
    versiculos.find((item) => item.momento === 'verso') ||
    versiculos[0]
  )
}
