import assert from 'node:assert/strict'
import {
  classificarChecagemCuradoria,
  podePublicarDepoisDaChecagem,
  resumoMusicaAcervo,
} from '../src/lib/curadoriaDuplicidade.js'

const porUrl = {
  duplicidade: {
    tipo: 'fonte_url',
    musica: {
      id: 'url-1',
      titulo: 'Bondade de Deus',
      artista: 'Isaías Saad',
    },
    candidatos: [],
    requer_confirmacao_admin: false,
  },
}

const estadoUrl = classificarChecagemCuradoria(porUrl)
assert.equal(estadoUrl.tipo, 'fonte_url')
assert.equal(estadoUrl.musica.id, 'url-1')
assert.equal(estadoUrl.bloqueiaPublicacao, false)
assert.equal(
  podePublicarDepoisDaChecagem({ checagem: porUrl }),
  true,
  'match por URL deve reutilizar a entrada sem confirmação',
)

const porTitulo = {
  duplicidade: {
    tipo: 'titulo_artista',
    musica: null,
    candidatos: [
      {
        id: 'nome-1',
        titulo: 'Bondade de Deus',
        artista: 'Fanuel Palácio',
      },
    ],
    requer_confirmacao_admin: true,
  },
}

const estadoTitulo = classificarChecagemCuradoria(porTitulo)
assert.equal(estadoTitulo.tipo, 'titulo_artista')
assert.equal(estadoTitulo.candidatos.length, 1)
assert.equal(estadoTitulo.bloqueiaPublicacao, true)
assert.equal(
  podePublicarDepoisDaChecagem({
    checagem: porTitulo,
    permitirDuplicataNome: false,
  }),
  false,
  'match apenas pelo nome deve bloquear por padrão',
)
assert.equal(
  podePublicarDepoisDaChecagem({
    checagem: porTitulo,
    permitirDuplicataNome: true,
  }),
  true,
  'somente confirmação explícita do admin libera outra gravação',
)

const nova = { duplicidade: { tipo: null, candidatos: [], musica: null } }
assert.equal(classificarChecagemCuradoria(nova).tipo, 'novo')
assert.equal(
  podePublicarDepoisDaChecagem({ checagem: nova }),
  true,
  'sem duplicata deve permitir criar',
)

assert.equal(
  resumoMusicaAcervo({
    titulo: 'Bondade de Deus',
    artista: 'Isaías Saad',
  }),
  'Bondade de Deus · Isaías Saad',
)

console.log('curadoria-duplicidade: ok')
