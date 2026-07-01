/** Slugs canônicos de seção (PRD + adendos) */
/** Tons válidos para tom_original (maiores + menores) */
export const TONS_MAIORES = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
]

export const TONS_MENORES = [
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm',
]

export const TODOS_TONS = [...TONS_MAIORES, ...TONS_MENORES]

export const SECAO_SLUGS = [
  'intro',
  'verso',
  'pre_refrao',
  'refrao',
  'ponte',
  'outro',
]

/** Mapeamento slug → momento do versículo bíblico (adendo 3) */
export const SECAO_PARA_MOMENTO_VERSICULO = {
  intro: 'verso',
  verso: 'verso',
  pre_refrao: 'refrao',
  refrao: 'refrao',
  ponte: 'ponte',
  outro: 'ponte',
}

export const VERSOES_BIBLICAS = [
  { sigla: 'NVI', nome: 'Nova Versão Internacional' },
  { sigla: 'ACF', nome: 'Almeida Corrigida Fiel (ARC)' },
  { sigla: 'NVT', nome: 'Nova Versão Transformadora' },
  { sigla: 'ARA', nome: 'Almeida Revista e Atualizada' },
  { sigla: 'NTLH', nome: 'Nova Tradução na Linguagem de Hoje' },
  { sigla: 'KJA', nome: 'King James Atualizada' },
]

export const NIVEIS_TECLADO = ['basico', 'intermediario', 'avancado']

export const PLANOS = ['gratuito', 'solo', 'equipe']

export const TRIAL_DIAS = { solo: 30, equipe: 30 }

export const TRIAL_DIAS_PADRAO = 30

export const PLANOS_ASSINATURA = {
  gratuito: {
    id: 'gratuito',
    nome: 'Gratuito',
    price: 0,
    trial_dias: 0,
    descricao: 'Para testar a base do CRASH Cifras.',
    recursos: ['Cadastro manual limitado', 'Teleprompter básico', 'Configurações locais'],
  },
  solo: {
    id: 'solo',
    nome: 'Solo',
    price: 1999,
    trial_dias: 30,
    descricao: 'Para músicos individuais',
    recursos: [
      'Teleprompter BPM automático',
      'Importação via YouTube',
      'Transposição de tom',
      'Playlist de eventos',
      'Graus Nashville',
      'Versículos bíblicos ON/OFF (em Configurações)',
      'Diretor de arranjo + Medley',
      'Histórico de eventos',
    ],
  },
  equipe: {
    id: 'equipe',
    nome: 'Equipe',
    price: 9998,
    trial_dias: 30,
    descricao: 'Para grupos e equipes musicais',
    recursos: [
      'Tudo do Solo +',
      'Sound Guide de timbre',
      'Modo sincronizado em tempo real',
      'Visão coordenador',
      'Cache offline do evento',
    ],
  },
}

export const IMPORT_STATUS = [
  'manual',
  'pending',
  'processing',
  'ready',
  'failed',
]

export const PLAYLIST_STATUS = ['rascunho', 'preparado', 'realizado']

export const INSTRUMENTOS = [
  { id: 'guitarra', nome: 'Guitarra' },
  { id: 'baixo', nome: 'Baixo' },
  { id: 'teclado', nome: 'Teclado' },
  { id: 'bateria', nome: 'Bateria' },
  { id: 'violao', nome: 'Violão' },
  { id: 'voz', nome: 'Voz' },
  { id: 'mesa', nome: 'Mesa de Som' },
]

export const EQUIPE_TIPOS_MEMBRO = ['lider', 'musico', 'mesa']

export const EQUIPE_MAX_MUSICOS = 6
export const EQUIPE_MAX_MESA = 1
export const EQUIPE_CODIGO_LENGTH = 6
