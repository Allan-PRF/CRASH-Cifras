import { gerarVersiculosIA } from '../services/versiculos'

const VERSICULOS_BASE = [
  {
    referencia: 'Salmos 16:11',
    texto: 'Na tua presença há plenitude de alegria.',
    palavra:
      'A adoração começa quando reconhecemos que a presença de Deus é o nosso maior tesouro.',
    momento: 'verso',
  },
  {
    referencia: 'João 4:23',
    texto: 'Os verdadeiros adoradores adorarão o Pai em espírito e em verdade.',
    palavra:
      'Deus não procura performance perfeita; Ele procura um coração inteiro diante dele.',
    momento: 'refrao',
  },
  {
    referencia: 'Isaías 6:3',
    texto: 'Santo, santo, santo é o Senhor dos Exércitos.',
    palavra:
      'Quando a santidade de Deus ocupa o centro, todo o ambiente se curva em adoração.',
    momento: 'ponte',
  },
]

function inferirTema(musica) {
  const text = `${musica?.titulo || ''} ${musica?.artista || ''}`.toLowerCase()
  if (text.includes('espírito') || text.includes('espirito')) {
    return 'Presença do Espírito Santo e rendição'
  }
  if (text.includes('santo')) return 'Santidade de Deus'
  if (text.includes('amor')) return 'Amor de Deus'
  if (text.includes('presença') || text.includes('presenca')) {
    return 'Presença de Deus e adoração genuína'
  }
  return 'Adoração, entrega e confiança em Deus'
}

export function gerarVersiculosLocais(musica, versaoBiblica = 'NVI') {
  const tema = inferirTema(musica)
  return {
    tema,
    versao_biblica: versaoBiblica,
    versiculos: VERSICULOS_BASE.map((item) => ({
      ...item,
      versao: versaoBiblica,
    })),
  }
}

/**
 * Gera versículos com IA (prompt rígido: somente Bíblia Sagrada).
 * Se a API falhar, usa fallback local.
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
    return gerarVersiculosLocais(musica, versaoBiblica)
  }
}

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
