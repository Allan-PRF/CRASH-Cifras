/**
 * Versículos genéricos quando a IA (Claude) falha ou não está configurada.
 * Triplas edificantes — rotação determinística por música.
 */

const VERSICULOS_FALLBACK_TRIPLAS = [
  {
    verso: {
      referencia: 'Salmos 16:11',
      texto: 'Tu me farás ver a vereda da vida; na tua presença há plenitude de alegria.',
      palavra: 'A presença de Deus é o lugar onde a alma encontra descanso e alegria verdadeira.',
    },
    refrao: {
      referencia: 'João 4:23',
      texto: 'Os verdadeiros adoradores adorarão o Pai em espírito e em verdade.',
      palavra: 'Deus busca corações sinceros — adoração que nasce por dentro, não só por forma.',
    },
    ponte: {
      referencia: 'Filipenses 4:13',
      texto: 'Tudo posso naquele que me fortalece.',
      palavra: 'Nossa força para continuar vem de Cristo, não da nossa capacidade humana.',
    },
  },
  {
    verso: {
      referencia: 'Salmos 23:1',
      texto: 'O Senhor é o meu pastor; nada me faltará.',
      palavra: 'Confiar no Senhor como pastor é descansar sabendo que Ele cuida de cada detalhe.',
    },
    refrao: {
      referencia: 'Romanos 8:28',
      texto: 'Sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus.',
      palavra: 'Mesmo o que não entendemos, Deus pode usar para nosso crescimento e Seu propósito.',
    },
    ponte: {
      referencia: 'Mateus 11:28',
      texto: 'Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos aliviarei.',
      palavra: 'Jesus convida os exaustos a encontrar descanso real — não performance, mas comunhão.',
    },
  },
  {
    verso: {
      referencia: 'Salmos 46:10',
      texto: 'Aquietai-vos e sabei que eu sou Deus.',
      palavra: 'No silêncio diante de Deus, redescobrimos quem Ele é e quem somos nEle.',
    },
    refrao: {
      referencia: 'João 3:16',
      texto: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito.',
      palavra: 'O amor de Deus é a base de toda adoração — Ele deu o melhor por nós.',
    },
    ponte: {
      referencia: '1 Pedro 5:7',
      texto: 'Lançai sobre ele toda a vossa ansiedade, porque ele tem cuidado de vós.',
      palavra: 'Podemos entregar nossas preocupações a Deus — Ele se importa conosco de verdade.',
    },
  },
  {
    verso: {
      referencia: 'Salmos 37:4',
      texto: 'Deleita-te também no Senhor, e ele te concederá os desejos do teu coração.',
      palavra: 'Quando o prazer maior é Deus, nossos anseios se alinham com o Seu coração.',
    },
    refrao: {
      referencia: 'Isaías 40:31',
      texto: 'Os que esperam no Senhor renovam as suas forças.',
      palavra: 'Esperar em Deus não é parar — é confiar enquanto Ele nos sustenta.',
    },
    ponte: {
      referencia: '2 Timóteo 1:7',
      texto: 'Deus não nos deu espírito de covardia, mas de poder, de amor e de moderação.',
      palavra: 'O Espírito de Deus em nós produz coragem, amor e equilíbrio para seguir adiante.',
    },
  },
  {
    verso: {
      referencia: 'Provérbios 3:5',
      texto: 'Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento.',
      palavra: 'Confiar em Deus é soltar o controle e caminhar guiados pela Sua sabedoria.',
    },
    refrao: {
      referencia: 'Salmos 34:8',
      texto: 'Provai e vede que o Senhor é bom; bem-aventurado o homem que nele se refugia.',
      palavra: 'Experimentar a bondade de Deus transforma a forma como enfrentamos a vida.',
    },
    ponte: {
      referencia: 'João 14:27',
      texto: 'Deixo-vos a paz, a minha paz vos dou; não vo-la dou como o mundo a dá.',
      palavra: 'A paz de Cristo guarda o coração de um jeito que o mundo não consegue oferecer.',
    },
  },
  {
    verso: {
      referencia: 'Provérbios 16:3',
      texto: 'Consagre ao Senhor tudo o que você faz, e os seus planos serão bem-sucedidos.',
      palavra: 'Entregar nossos planos a Deus é o primeiro passo para caminhos abençoados.',
    },
    refrao: {
      referencia: 'Salmos 91:1',
      texto: 'Aquele que habita no abrigo do Altíssimo e descansa à sombra do Todo-Poderoso.',
      palavra: 'Permanecer perto de Deus é encontrar refúgio seguro em meio às tempestades.',
    },
    ponte: {
      referencia: 'Romanos 15:13',
      texto: 'O Deus de esperança vos encha de toda alegria e paz na vossa fé.',
      palavra: 'Deus é fonte de esperança — Ele enche nosso coração de alegria e paz pela fé.',
    },
  },
  {
    verso: {
      referencia: 'Salmos 103:1',
      texto: 'Bendize, ó minha alma, ao Senhor, e tudo o que há em mim bendiga o seu santo nome.',
      palavra: 'Adoração começa quando todo o nosso ser se volta para louvar a Deus.',
    },
    refrao: {
      referencia: 'Mateus 5:14',
      texto: 'Vós sois a luz do mundo.',
      palavra: 'Cristo nos chama a refletir Sua luz onde quer que estejamos.',
    },
    ponte: {
      referencia: 'Efésios 3:20',
      texto: 'Aquele que é capaz de fazer infinitamente mais do que tudo o que pedimos ou pensamos.',
      palavra: 'O poder de Deus em nós supera tudo que imaginamos — Ele pode fazer muito mais.',
    },
  },
  {
    verso: {
      referencia: 'Salmos 121:1',
      texto: 'Levanto os meus olhos para os montes; de onde me vem o socorro?',
      palavra: 'Nossa ajuda não vem das circunstâncias — vem do Senhor, criador de tudo.',
    },
    refrao: {
      referencia: 'João 15:5',
      texto: 'Eu sou a videira, vós sois os ramos; quem permanece em mim dá fruto.',
      palavra: 'Permanecer unidos a Cristo é a fonte de uma vida que produz fruto duradouro.',
    },
    ponte: {
      referencia: 'Hebreus 10:23',
      texto: 'Retenhamos firmes a confissão da nossa esperança, pois aquele que prometeu é fiel.',
      palavra: 'Podemos firmar nossa esperança — Deus é fiel às Suas promessas.',
    },
  },
  {
    verso: {
      referencia: 'Provérbios 18:10',
      texto: 'Torre forte é o nome do Senhor; a ela correrá o justo e estará seguro.',
      palavra: 'O nome do Senhor é refúgio — correr para Ele é encontrar segurança.',
    },
    refrao: {
      referencia: 'Salmos 27:1',
      texto: 'O Senhor é a minha luz e a minha salvação; a quem temerei?',
      palavra: 'Com Deus como luz, o medo perde força — podemos caminhar com confiança.',
    },
    ponte: {
      referencia: 'Colossenses 3:15',
      texto: 'Permaneça a paz de Cristo em vossos corações.',
      palavra: 'A paz de Cristo pode governar nosso coração mesmo em meio ao caos.',
    },
  },
  {
    verso: {
      referencia: 'Salmos 34:18',
      texto: 'Perto está o Senhor dos que têm o coração quebrantado.',
      palavra: 'Deus não se afasta da dor — Ele se aproxima dos corações feridos.',
    },
    refrao: {
      referencia: 'Mateus 6:33',
      texto: 'Buscai primeiro o reino de Deus e a sua justiça, e todas estas coisas vos serão acrescentadas.',
      palavra: 'Priorizar Deus reorganiza nossa vida — Ele cuida do que precisamos.',
    },
    ponte: {
      referencia: '2 Coríntios 5:17',
      texto: 'Se alguém está em Cristo, nova criatura é; as coisas antigas já passaram.',
      palavra: 'Em Cristo há recomeço — nossa identidade é renovada pela graça.',
    },
  },
  {
    verso: {
      referencia: 'Salmos 139:23',
      texto: 'Sonda-me, ó Deus, e conhece o meu coração; prova-me e conhece os meus pensamentos.',
      palavra: 'Convidar Deus a examinar nosso coração é caminhar em transparência e crescimento.',
    },
    refrao: {
      referencia: 'João 10:10',
      texto: 'Eu vim para que tenham vida e a tenham plenamente.',
      palavra: 'Jesus veio nos dar vida abundante — mais do que existir, é viver com propósito.',
    },
    ponte: {
      referencia: 'Tiago 1:5',
      texto: 'Se algum de vós tem falta de sabedoria, peça-a a Deus, que a todos dá liberalmente.',
      palavra: 'Deus generosamente concede sabedoria a quem a pede com fé.',
    },
  },
  {
    verso: {
      referencia: 'Provérbios 4:23',
      texto: 'Sobre tudo o que se deve guardar, guarda o teu coração, porque dele procedem as saídas da vida.',
      palavra: 'Cuidar do coração é proteger a fonte de nossas palavras, atitudes e caminhos.',
    },
    refrao: {
      referencia: 'Salmos 63:3',
      texto: 'Porque a tua bondade é melhor do que a vida, os meus lábios te louvarão.',
      palavra: 'A bondade de Deus merece louvor — ela supera tudo que este mundo oferece.',
    },
    ponte: {
      referencia: '1 João 4:19',
      texto: 'Nós amamos porque ele nos amou primeiro.',
      palavra: 'Nosso amor a Deus e ao próximo nasce do amor que Ele derramou sobre nós primeiro.',
    },
  },
]

function hashString(value) {
  const s = String(value || '')
  let h = 0
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) >>> 0
  }
  return h
}

function inferirTemaFallback(musica) {
  const text = `${musica?.titulo || ''} ${musica?.artista || ''}`.toLowerCase()
  if (text.includes('espírito') || text.includes('espirito')) {
    return 'Presença do Espírito Santo e rendição'
  }
  if (text.includes('santo')) return 'Santidade de Deus e adoração'
  if (text.includes('amor')) return 'Amor de Deus e resposta de gratidão'
  if (text.includes('presença') || text.includes('presenca')) {
    return 'Presença de Deus e adoração genuína'
  }
  if (text.includes('paz')) return 'Paz e confiança em Deus'
  if (text.includes('esperança') || text.includes('esperanca')) {
    return 'Esperança e fidelidade de Deus'
  }
  return 'Adoração, entrega e confiança em Deus'
}

/**
 * Escolhe uma tripla (verso/refrão/ponte) de forma determinística.
 * @param {{ titulo?: string, artista?: string, id?: string }} [musica]
 */
export function escolherTriplaFallback(musica = {}) {
  const key =
    musica.id ||
    `${String(musica.titulo || '').trim()}|${String(musica.artista || '').trim()}` ||
    'default'
  const idx = hashString(key) % VERSICULOS_FALLBACK_TRIPLAS.length
  return VERSICULOS_FALLBACK_TRIPLAS[idx]
}

/**
 * Resposta no mesmo formato da IA ({ tema, versao_biblica, versiculos }).
 * @param {object} [musica]
 * @param {string} [versaoBiblica]
 */
export function montarRespostaFallback(musica = {}, versaoBiblica = 'NVI') {
  const tripla = escolherTriplaFallback(musica)
  const momentos = ['verso', 'refrao', 'ponte']

  return {
    tema: inferirTemaFallback(musica),
    versao_biblica: versaoBiblica,
    versiculos: momentos.map((momento) => ({
      ...tripla[momento],
      momento,
      versao: versaoBiblica,
    })),
  }
}
