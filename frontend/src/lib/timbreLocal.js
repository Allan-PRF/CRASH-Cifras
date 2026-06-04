const PRESETS = {
  intro: {
    familia_timbre: 'String Pad',
    timbre_nome: 'String Pad suave',
    brilho: 'suave',
    efeitos: ['Reverb leve', 'Chorus sutil'],
    pedal: 'contínuo',
    toque: 'Notas longas',
    dinamica: 'p',
    textura: 'esparsa',
    equivalente_basico: 'Strings ou Pad',
    equivalente_intermediario: 'Warm Pad + Reverb',
    equivalente_avancado: 'Layer Strings + Soft Pad',
    dica: 'Deixe espaço para a voz e sustente os acordes com suavidade.',
  },
  verso: {
    familia_timbre: 'Electric Piano',
    timbre_nome: 'E.Piano macio',
    brilho: 'médio',
    efeitos: ['Reverb sala', 'Chorus leve'],
    pedal: 'no tempo',
    toque: 'Blocos de acordes leves',
    dinamica: 'mp',
    textura: 'média',
    equivalente_basico: 'E.Piano 1',
    equivalente_intermediario: 'Suitcase EP + Chorus',
    equivalente_avancado: 'Rhodes + Stereo Chorus',
    dica: 'Toque menos notas no grave para não competir com o baixo.',
  },
  pre_refrao: {
    familia_timbre: 'Synth Pad',
    timbre_nome: 'Pad crescente',
    brilho: 'médio',
    efeitos: ['Reverb amplo', 'Delay discreto'],
    pedal: 'contínuo',
    toque: 'Acordes em crescendo',
    dinamica: 'mf',
    textura: 'média',
    equivalente_basico: 'Synth Pad',
    equivalente_intermediario: 'New Age Pad',
    equivalente_avancado: 'Motion Pad com filtro aberto',
    dica: 'Aumente a intensidade aos poucos para preparar o refrão.',
  },
  refrao: {
    familia_timbre: 'Piano + Pad',
    timbre_nome: 'Piano brilhante com pad',
    brilho: 'brilhante',
    efeitos: ['Reverb sala', 'Delay curto'],
    pedal: 'no tempo',
    toque: 'Blocos de acordes',
    dinamica: 'f',
    textura: 'cheia',
    equivalente_basico: 'Grand Piano + Strings',
    equivalente_intermediario: 'Bright Piano + Warm Pad',
    equivalente_avancado: 'Layer Piano/Pad com compressor leve',
    dica: 'Use aberturas maiores na mão direita para preencher o refrão.',
  },
  ponte: {
    familia_timbre: 'Organ',
    timbre_nome: 'Organ gospel',
    brilho: 'médio',
    efeitos: ['Rotary lento', 'Reverb leve'],
    pedal: 'sem pedal',
    toque: 'Arpejos ou riffs suaves',
    dinamica: 'mf',
    textura: 'média',
    equivalente_basico: 'Organ 1',
    equivalente_intermediario: 'Gospel Organ',
    equivalente_avancado: 'Drawbar Organ + Leslie slow',
    dica: 'Evite pedal sustain e deixe o rotary criar movimento.',
  },
  outro: {
    familia_timbre: 'Choir Pad',
    timbre_nome: 'Choir Pad atmosférico',
    brilho: 'suave',
    efeitos: ['Reverb amplo'],
    pedal: 'contínuo',
    toque: 'Notas longas',
    dinamica: 'mp',
    textura: 'esparsa',
    equivalente_basico: 'Choir ou Voice',
    equivalente_intermediario: 'Choir Pad',
    equivalente_avancado: 'Vocal Pad + shimmer reverb',
    dica: 'Finalize com menos movimento e mais sustentação.',
  },
}

export function gerarGuiaTimbreLocal(musica) {
  return {
    origem: 'simulado',
    gerado_em: new Date().toISOString(),
    bpm: musica.bpm,
    tom: musica.tom_original,
    secoes: (musica.secoes || []).map((secao) => ({
      secao_id: secao.id,
      slug: secao.slug,
      nome: secao.nome,
      ...(PRESETS[secao.slug] || PRESETS.verso),
    })),
  }
}

export function timbreParaSecao(guia, secao) {
  if (!guia?.secoes?.length || !secao) return null
  return (
    guia.secoes.find((item) => item.secao_id === secao.id) ||
    guia.secoes.find((item) => item.slug === secao.slug) ||
    null
  )
}

export function equivalentePorNivel(timbre, nivel = 'basico') {
  if (!timbre) return ''
  if (nivel === 'avancado') return timbre.equivalente_avancado
  if (nivel === 'intermediario') return timbre.equivalente_intermediario
  return timbre.equivalente_basico
}
