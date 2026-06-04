/** Intro do card (mãos) tem texto preenchido. */
export function introComConteudo(intro) {
  return Boolean(intro?.mao_esquerda?.trim() || intro?.mao_direita?.trim())
}

/** Intro normalizado para INSERT em `musicas.intro`, ou null se vazio. */
export function normalizarIntroParaCopia(intro) {
  if (!introComConteudo(intro)) return null
  return {
    mao_esquerda: intro.mao_esquerda.trim(),
    mao_direita: intro.mao_direita?.trim() || '',
  }
}

/**
 * Seções para cópia. Omitimos slug `intro` só quando o card de introdução já foi copiado,
 * para não duplicar. Se a intro existir só como seção (import CC), mantemos a seção.
 */
export function secoesParaCopia(secoes, { omitirSecaoIntro = false } = {}) {
  return (secoes || [])
    .filter((sec) => !(omitirSecaoIntro && sec.slug === 'intro'))
    .map(({ slug, nome, ordem_original, linhas }) => ({
      slug,
      nome,
      ordem_original,
      linhas,
    }))
}

export function logCompartilharCopia({
  titulo,
  ministroIdDestino,
  secoes,
  intro,
  tomOriginal,
  bpm,
  artista,
}) {
  console.log('[compartilhar] música:', titulo, '→ ministro', ministroIdDestino)
  console.log('[compartilhar] seções copiadas:', secoes.length, secoes.map((s) => s.slug))
  console.log('[compartilhar] intro:', intro)
  console.log('[compartilhar] tom:', tomOriginal, 'bpm:', bpm, 'artista:', artista)
}
