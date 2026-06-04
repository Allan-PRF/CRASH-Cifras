function titleFromYoutubeUrl(url) {
  try {
    const parsed = new URL(url)
    const id = parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop()
    return id ? `Importação ${id}` : 'Música importada'
  } catch {
    return 'Música importada'
  }
}

export function buildMockImportResult({ youtubeUrl, ministroId }) {
  const title = titleFromYoutubeUrl(youtubeUrl)
  return {
    musica: {
      ministro_id: ministroId || null,
      titulo: title,
      artista: 'YouTube',
      youtube_url: youtubeUrl,
      bpm: 72,
      tom_original: 'Em',
      import_status: 'ready',
    },
    secoes: [
      {
        slug: 'intro',
        nome: 'Intro',
        ordem_original: 0,
        linhas: {
          lines: [
            {
              segments: [
                { chord: 'Em', text: '' },
                { chord: 'G', text: '' },
                { chord: 'D', text: '' },
              ],
            },
          ],
        },
      },
      {
        slug: 'verso',
        nome: 'Verso 1',
        ordem_original: 1,
        linhas: {
          lines: [
            {
              segments: [
                { chord: 'Em', text: 'Letra transcrita aparecerá aqui ' },
                { chord: 'G', text: 'após o worker real processar o áudio.' },
              ],
            },
            {
              segments: [{ chord: 'D', text: 'Esta é uma prévia editável.' }],
            },
          ],
        },
      },
      {
        slug: 'refrao',
        nome: 'Refrão',
        ordem_original: 2,
        linhas: {
          lines: [
            {
              segments: [
                { chord: 'C', text: 'Refrão gerado como placeholder ' },
                { chord: 'D', text: 'para validar o fluxo.' },
              ],
            },
          ],
        },
      },
    ],
  }
}
