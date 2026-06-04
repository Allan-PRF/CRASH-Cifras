import { isSecaoLinhas, linhasToPlainText, normalizeChordLine } from './chord-schema.js'

/** Regras rígidas para geração de versículos por IA (Bíblia Sagrada apenas). */
export const VERSICULOS_IA_REGRAS_RIGIDAS = `Você SOMENTE pode sugerir versículos da Bíblia Sagrada. É estritamente proibido sugerir textos de outras religiões, filosofias, autoajuda ou qualquer outra fonte que não seja a Bíblia Sagrada.

Independente do estilo da música — gospel, secular ou qualquer outro — os versículos são SEMPRE da Bíblia Sagrada.

Prioridade de livros:
- Salmos e Provérbios (Velho Testamento)
- Novo Testamento completo
- Todos os livros da Bíblia

As mensagens devem ser sempre voltadas ao amor e arrependimento.
Nunca trazer conteúdo de julgamento, condenação ou qualquer direção fora do contexto bíblico.`

export const VERSICULOS_IA_FORMATO_JSON = `Retorne APENAS JSON válido (sem markdown), neste formato:
{
  "tema": "tema identificado da música em uma frase",
  "versiculos": [
    {
      "referencia": "Livro capítulo:versículo",
      "texto": "texto fiel do versículo na versão solicitada",
      "palavra": "mensagem curta de aplicação pastoral (amor e arrependimento)",
      "momento": "verso"
    },
    {
      "referencia": "...",
      "texto": "...",
      "palavra": "...",
      "momento": "refrao"
    },
    {
      "referencia": "...",
      "texto": "...",
      "palavra": "...",
      "momento": "ponte"
    }
  ]
}

Gere exatamente 3 versículos: um para momento "verso", um para "refrao" e um para "ponte".`

export const VERSICULOS_IA_INSTRUCAO_LETRA = `Analise a letra da música abaixo e escolha um versículo bíblico que complemente e aprofunde a mensagem da canção. O versículo deve ser único e específico para essa música.

Identifique o tema central da letra (ex.: entrega, santidade, presença de Deus, arrependimento, esperança) e escolha referências bíblicas que dialoguem com esse tema.

Para verso, refrão e ponte, use versículos e aplicações pastorais DIFERENTES — não repita a mesma referência nem mensagens genéricas que serviriam para qualquer música.`

/**
 * @param {object} params
 * @param {string} params.versaoBiblica
 * @param {string} [params.titulo]
 * @param {string} [params.artista]
 * @param {string} [params.tom]
 * @param {string} [params.letraCompleta]
 */
export function buildVersiculosIaMessages({
  versaoBiblica = 'NVI',
  titulo = '',
  artista = '',
  tom = '',
  letraCompleta = '',
}) {
  const system = `${VERSICULOS_IA_REGRAS_RIGIDAS}

${VERSICULOS_IA_FORMATO_JSON}`

  const user = `Versão bíblica obrigatória: ${versaoBiblica}

Música: ${titulo || 'Sem título'}
${artista ? `Artista/ministro: ${artista}` : ''}
${tom ? `Tom musical: ${tom}` : 'Tom musical: (não informado)'}

${VERSICULOS_IA_INSTRUCAO_LETRA}

Letra completa da música:
${letraCompleta.trim() || '(sem letra disponível — identifique o tema pelo título e escolha versículos de adoração, amor e arrependimento, ainda assim específicos ao contexto informado)'}

Lembre-se: apenas Bíblia Sagrada; mensagens de amor e arrependimento; sem julgamento ou condenação.`

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

/**
 * Extrai a letra completa a partir das seções (formato SecaoLinhas / cifra).
 * @param {Array<{ nome?: string, slug?: string, linhas?: import('./chord-schema.js').SecaoLinhas | unknown }>} secoes
 */
export function resumirLetraDasSecoes(secoes) {
  if (!Array.isArray(secoes) || secoes.length === 0) return ''

  return secoes
    .map((secao) => {
      const bloco = secao.linhas
      let texto = ''

      if (isSecaoLinhas(bloco)) {
        texto = linhasToPlainText(bloco)
      } else if (Array.isArray(bloco)) {
        texto = bloco
          .map((linha) => {
            if (typeof linha === 'string') return linha
            if (linha?.lyricLine != null) return String(linha.lyricLine)
            if (linha?.texto != null) return String(linha.texto)
            if (linha?.letra != null) return String(linha.letra)
            return normalizeChordLine(linha).lyricLine
          })
          .filter((l) => String(l).trim())
          .join('\n')
      }

      const tituloSecao = secao.nome || secao.slug || 'Seção'
      return texto.trim() ? `[${tituloSecao}]\n${texto.trim()}` : ''
    })
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 12000)
}
