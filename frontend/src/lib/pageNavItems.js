/** Itens de breadcrumb para páginas de música (visualização, edição, teleprompter). */
export function musicaBreadcrumbItems(musica, { suffix } = {}) {
  const items = [{ label: 'Início', to: '/' }]
  if (musica?.ministro_id) {
    items.push({
      label: musica.ministro?.nome || 'Ministro',
      to: `/ministro/${musica.ministro_id}`,
    })
  }
  if (musica?.titulo) {
    items.push({
      label: musica.titulo,
      to: suffix ? `/teleprompter/musica/${musica.id}` : undefined,
    })
  }
  if (suffix) {
    items.push({ label: suffix })
  }
  return items
}
