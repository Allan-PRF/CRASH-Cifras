import { isSecaoLinhas, linhasToPlainText, normalizeChordLine } from './chord-schema.js'

/** Regras rígidas para geração de versículos por IA (Bíblia Sagrada apenas). */
export const VERSICULOS_IA_REGRAS_RIGIDAS = `Você SOMENTE pode sugerir versículos da Bíblia Sagrada. É estritamente proibido sugerir textos de outras religiões, filosofias, autoajuda ou qualquer outra fonte que não seja a Bíblia Sagrada.

Independente do estilo da música — gospel, secular ou qualquer outro — os versículos são SEMPRE da Bíblia Sagrada.

Tom das mensagens: EDIFICANTE, REFLEXIVO e MOTIVACIONAL — encorajar, consolar, inspirar esperança, confiança, entrega e obediência amorosa. Evite culpa paralisante.

Prioridade de livros (busque em toda a Bíblia, com ênfase nestes):
- Salmos e Provérbios (Velho Testamento)
- Evangelhos: Mateus, Marcos, Lucas e João
- Cartas paulinas e demais livros do Novo Testamento
- Demais livros do Velho Testamento, quando dialogarem bem com o tema

EVITE passagens de juízo final, condenação, maldição, terror, ameaça ou tom negativo que não edifique a congregação no momento da adoração.
Nunca trazer conteúdo que desanime ou condene sem oferecer esperança em Cristo.`

export const VERSICULOS_IA_FORMATO_JSON = `Retorne APENAS JSON válido (sem markdown), neste formato:
{
  "tema": "tema identificado da música em uma frase",
  "versiculos": [
    {
      "referencia": "Livro capítulo:versículo",
      "texto": "texto fiel do versículo na versão solicitada",
      "palavra": "mensagem curta de aplicação pastoral edificante",
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

export const VERSICULOS_IA_INSTRUCAO_LETRA = `Analise a letra da música abaixo e escolha versículos bíblicos que complementem e aprofundem a mensagem da canção. Cada versículo deve ser único e específico para essa música — não genérico.

Identifique o tema central da letra (ex.: entrega, presença de Deus, esperança, gratidão, consolo, santidade, amor, confiança) e escolha referências que dialoguem com esse tema.

Para cada momento:
- "verso": versículo mais fundacional ou introdutório ao tema
- "refrao": versículo mais celebrativo ou declarativo
- "ponte": versículo mais reflexivo ou de aplicação pessoal

Use referências DIFERENTES e aplicações pastorais DIFERENTES em verso, refrão e ponte — não repita livro, referência nem mensagem.`

/**
 * Prompt para Claude (Anthropic): system + user separados.
 * @param {object} params
 * @param {string} params.versaoBiblica
 * @param {string} [params.titulo]
 * @param {string} [params.artista]
 * @param {string} [params.tom]
 * @param {string} [params.letraCompleta]
 */
export function buildVersiculosIaPrompt({
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
${letraCompleta.trim() || '(sem letra disponível — identifique o tema pelo título e escolha versículos edificantes e específicos ao contexto informado, priorizando Salmos, Provérbios e Novo Testamento)'}

Lembre-se: apenas Bíblia Sagrada; mensagens edificantes, reflexivas e motivacionais; sem juízo, condenação ou maldição.`

  return { system, user }
}

/** @deprecated Use buildVersiculosIaPrompt — mantido para compatibilidade. */
export function buildVersiculosIaMessages(params) {
  const { system, user } = buildVersiculosIaPrompt(params)
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
