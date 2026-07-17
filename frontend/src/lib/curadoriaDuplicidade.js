/**
 * Traduz a resposta de GET /acervo/buscar para o estado da Curadoria.
 * Mantém a decisão de duplicar pelo nome exclusivamente no frontend/admin.
 */
export function classificarChecagemCuradoria(response) {
  const duplicidade = response?.duplicidade

  if (duplicidade?.tipo === 'fonte_url' && duplicidade.musica) {
    return {
      tipo: 'fonte_url',
      musica: duplicidade.musica,
      candidatos: [],
      bloqueiaPublicacao: false,
      requerConfirmacaoAdmin: false,
    }
  }

  if (
    duplicidade?.tipo === 'titulo_artista' &&
    Array.isArray(duplicidade.candidatos) &&
    duplicidade.candidatos.length
  ) {
    return {
      tipo: 'titulo_artista',
      musica: null,
      candidatos: duplicidade.candidatos,
      bloqueiaPublicacao: true,
      requerConfirmacaoAdmin: true,
    }
  }

  return {
    tipo: 'novo',
    musica: null,
    candidatos: [],
    bloqueiaPublicacao: false,
    requerConfirmacaoAdmin: false,
  }
}

export function podePublicarDepoisDaChecagem({
  checagem,
  permitirDuplicataNome = false,
}) {
  const estado = classificarChecagemCuradoria(checagem)
  if (estado.tipo !== 'titulo_artista') return true
  return Boolean(permitirDuplicataNome)
}

export function resumoMusicaAcervo(musica) {
  return [musica?.titulo, musica?.artista].filter(Boolean).join(' · ')
}
