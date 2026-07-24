import assert from 'node:assert/strict'
import {
  buscarAcervoPorFonteUrl,
  buscarAcervoReady,
  buscarItemAcervoReady,
  canonicalizarYoutubeUrl,
  checarDuplicidadeAcervo,
} from '../lib/acervoBusca.js'

function fakeDb(rows, calls) {
  const builder = {
    from(table) {
      calls.push(['from', table])
      return this
    },
    select(columns) {
      calls.push(['select', columns])
      return this
    },
    eq(column, value) {
      calls.push(['eq', column, value])
      return this
    },
    or(filter) {
      calls.push(['or', filter])
      return this
    },
    order(column, options) {
      calls.push(['order', column, options])
      return this
    },
    limit(value) {
      calls.push(['limit', value])
      return Promise.resolve({ data: rows, error: null })
    },
    maybeSingle() {
      calls.push(['maybeSingle'])
      return Promise.resolve({ data: rows[0] || null, error: null })
    },
  }

  return {
    from(table) {
      return builder.from(table)
    },
  }
}

function fakeCatalogDb({ musica, versao }, calls) {
  return {
    from(table) {
      calls.push(['from', table])
      const row = table === 'acervo_musicas' ? musica : versao
      return {
        select(columns) {
          calls.push(['select', table, columns])
          return this
        },
        eq(column, value) {
          calls.push(['eq', table, column, value])
          return this
        },
        maybeSingle() {
          return Promise.resolve({ data: row || null, error: null })
        },
      }
    },
  }
}

assert.equal(
  canonicalizarYoutubeUrl('https://youtu.be/abcdefghijk?t=25'),
  'https://www.youtube.com/watch?v=abcdefghijk',
  'URL curta deve virar watch canônica',
)

assert.equal(
  canonicalizarYoutubeUrl('https://www.youtube.com/watch?v=ZYXWVUTSRQP&list=teste'),
  'https://www.youtube.com/watch?v=ZYXWVUTSRQP',
  'parâmetros extras não entram na fonte_url',
)

assert.throws(
  () => canonicalizarYoutubeUrl('https://example.com/video'),
  /YouTube/i,
  'domínio externo deve ser rejeitado',
)

{
  const calls = []
  const row = {
    id: 'acervo-1',
    fonte_url: 'https://www.youtube.com/watch?v=abcdefghijk',
    status: 'pending',
  }
  const result = await buscarAcervoPorFonteUrl('https://youtu.be/abcdefghijk', {
    db: fakeDb([row], calls),
  })

  assert.equal(result.musica.id, 'acervo-1')
  assert.ok(
    calls.some(
      (call) =>
        call[0] === 'eq' &&
        call[1] === 'fonte_url' &&
        call[2] === 'https://www.youtube.com/watch?v=abcdefghijk',
    ),
    'checagem por URL deve usar igualdade na URL canônica',
  )
  assert.equal(
    calls.some((call) => call[0] === 'eq' && call[1] === 'status'),
    false,
    'anti-duplicata por URL deve encontrar também pending/failed',
  )
}

{
  const calls = []
  const result = await buscarItemAcervoReady('acervo-1', {
    db: fakeCatalogDb(
      {
        musica: {
          id: 'acervo-1',
          titulo: 'Bondade de Deus',
          artista: 'Isaías Saad',
          status: 'ready',
          versao_top_id: 'versao-1',
        },
        versao: {
          id: 'versao-1',
          acervo_musica_id: 'acervo-1',
          origem: 'curadoria',
          tom_original: 'D',
          bpm: 68,
          cifra: {
            secoes: [
              {
                slug: 'verso',
                nome: 'Verso 1',
                ordem_original: 0,
                linhas: { lines: [{ lyricLine: 'Eu te amo, Deus' }] },
              },
            ],
          },
        },
      },
      calls,
    ),
  })

  assert.equal(result.musica.id, 'acervo-1')
  assert.equal(result.versao.id, 'versao-1')
  assert.equal(result.versao.secoes[0].slug, 'verso')
  assert.ok(
    calls.some(
      (call) =>
        call[0] === 'eq' &&
        call[1] === 'acervo_musicas' &&
        call[2] === 'status' &&
        call[3] === 'ready',
    ),
    'preview só deve abrir item ready',
  )
  assert.ok(
    calls.some(
      (call) =>
        call[0] === 'eq' &&
        call[1] === 'acervo_versoes' &&
        call[2] === 'id' &&
        call[3] === 'versao-1',
    ),
    'preview deve buscar exatamente a versão principal',
  )
}

{
  const calls = []
  const rows = [
    {
      id: 'ready-1',
      titulo: 'Bondade de Deus',
      artista: 'Isaías Saad',
      status: 'ready',
      versoes_comunidade: [{ id: 'correcao-1' }],
    },
  ]
  const result = await buscarAcervoReady(
    { q: 'Bondade de Deus', limit: 200 },
    { db: fakeDb(rows, calls) },
  )

  assert.equal(result.resultados.length, 1)
  assert.equal(result.query_norm, 'bondade de deus')
  assert.equal(result.resultados[0].tem_versao_comunidade, true)
  assert.ok(
    calls.some(
      (call) => call[0] === 'eq' && call[1] === 'status' && call[2] === 'ready',
    ),
    'catálogo deve consultar somente status ready',
  )
  assert.ok(
    calls.some(
      (call) => call[0] === 'eq' && call[1] === 'publicado' && call[2] === true,
    ),
    'catálogo deve consultar somente publicado=true',
  )
  assert.ok(
    calls.some(
      (call) =>
        call[0] === 'or' &&
        call[1] ===
          'titulo_norm.ilike.%bondade de deus%,artista_norm.ilike.%bondade de deus%',
    ),
    'busca deve procurar o termo normalizado em título OU artista',
  )
  assert.ok(
    calls.some((call) => call[0] === 'limit' && call[1] === 50),
    'limit deve ser protegido entre 1 e 50',
  )
}

{
  let tituloFoiConsultado = false
  const existente = { id: 'por-url', status: 'ready' }
  const result = await checarDuplicidadeAcervo(
    {
      fonteUrl: 'https://youtu.be/abcdefghijk',
      titulo: 'Bondade de Deus',
      artista: 'Isaías Saad',
    },
    {
      porFonteUrl: async () => ({
        canonicalUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
        musica: existente,
      }),
      porTituloArtista: async () => {
        tituloFoiConsultado = true
        return [{ id: 'por-titulo' }]
      },
    },
  )

  assert.equal(result.tipo, 'fonte_url')
  assert.equal(result.musica.id, 'por-url')
  assert.equal(result.requer_confirmacao_admin, false)
  assert.equal(result.pode_criar, false)
  assert.equal(tituloFoiConsultado, false, 'URL deve ter prioridade absoluta')
}

{
  const candidato = { id: 'por-titulo', status: 'ready' }
  const result = await checarDuplicidadeAcervo(
    {
      fonteUrl: 'https://youtu.be/abcdefghijk',
      titulo: 'Bondade de Deus',
      artista: 'Fanuel Palácio',
    },
    {
      porFonteUrl: async () => ({
        canonicalUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
        musica: null,
      }),
      porTituloArtista: async () => [candidato],
    },
  )

  assert.equal(result.tipo, 'titulo_artista')
  assert.deepEqual(result.candidatos, [candidato])
  assert.equal(result.requer_confirmacao_admin, true)
  assert.equal(result.pode_criar, false)
}

{
  const result = await checarDuplicidadeAcervo(
    {
      fonteUrl: 'https://youtu.be/abcdefghijk',
      titulo: 'Canção inédita',
      artista: 'Artista',
    },
    {
      porFonteUrl: async () => ({
        canonicalUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
        musica: null,
      }),
      porTituloArtista: async () => [],
    },
  )

  assert.equal(result.tipo, null)
  assert.equal(result.requer_confirmacao_admin, false)
  assert.equal(result.pode_criar, true)
}

console.log('acervo-busca: ok')
