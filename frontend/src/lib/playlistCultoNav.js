/** Próxima música na ordem do culto (playlist de evento). */
export function resolverProximaMusicaCulto(playlist, musicaId) {
  const itens = playlist?.itens
  if (!itens?.length || !musicaId) return null

  const idx = itens.findIndex((it) => String(it.musica_id) === String(musicaId))
  if (idx < 0 || idx >= itens.length - 1) return null

  const atual = itens[idx]
  const proximo = itens[idx + 1]

  return {
    musicaId: proximo.musica_id,
    titulo: proximo.musicas?.titulo?.trim() || 'Próxima música',
    isMedley: atual.medley_proxima_id === proximo.id,
  }
}

/** Título da música ligada por medley (playlist_itens.medley_proxima_id → id do próximo item). */
export function tituloDestinoMedley(item, itens) {
  if (!item?.medley_proxima_id || !itens?.length) return null
  const proximo = itens.find((it) => it.id === item.medley_proxima_id)
  return proximo?.musicas?.titulo?.trim() || null
}
