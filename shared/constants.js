/** Slugs canônicos de seção (PRD + adendos) */
/** Tons válidos para tom_original (maiores + menores) */
export const TONS_MAIORES = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
]

export const TONS_MENORES = [
  'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'Abm', 'Am', 'Bbm', 'Bm',
]

export const TODOS_TONS = [...TONS_MAIORES, ...TONS_MENORES]

/** Rótulo amigável na UI — valor canônico (chave) não muda. Menores: m nos dois lados. */
export const TOM_LABELS = {
  C: 'C',
  Db: 'C#/Db',
  'C#': 'C#/Db',
  D: 'D',
  Eb: 'D#/Eb',
  'D#': 'D#/Eb',
  E: 'E',
  F: 'F',
  'F#': 'F#/Gb',
  Gb: 'F#/Gb',
  G: 'G',
  Ab: 'G#/Ab',
  'G#': 'G#/Ab',
  A: 'A',
  Bb: 'A#/Bb',
  'A#': 'A#/Bb',
  B: 'B',
  Cm: 'Cm',
  'C#m': 'C#m/Dbm',
  Dbm: 'C#m/Dbm',
  Dm: 'Dm',
  Ebm: 'D#m/Ebm',
  'D#m': 'D#m/Ebm',
  Em: 'Em',
  Fm: 'Fm',
  'F#m': 'F#m/Gbm',
  Gbm: 'F#m/Gbm',
  Gm: 'Gm',
  Abm: 'G#m/Abm',
  'G#m': 'G#m/Abm',
  Am: 'Am',
  Bbm: 'A#m/Bbm',
  'A#m': 'A#m/Bbm',
  Bm: 'Bm',
}

/** @param {string|null|undefined} tom */
export function tomDisplayLabel(tom) {
  if (!tom) return '—'
  return TOM_LABELS[tom] ?? tom
}

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

/** Rótulo único para UI de trial (landing, login, indicação). */
export const TRIAL_DIAS_GRATIS_LABEL = `${TRIAL_DIAS_PADRAO} dias grátis`

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
