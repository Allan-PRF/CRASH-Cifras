function normalize(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function findSection(secoes, slug) {
  return secoes.find((sec) => sec.slug === slug)
}

function repetitionsFor(text, slug) {
  const patterns = {
    refrao: /refrao\s*(\d)x|refrao.*?(\d)x|(\d)x.*?refrao/,
    verso: /verso\s*(\d)x|verso.*?(\d)x|(\d)x.*?verso/,
    ponte: /ponte\s*(\d)x|ponte.*?(\d)x|(\d)x.*?ponte/,
  }
  const match = text.match(patterns[slug])
  const value = Number(match?.find((part, index) => index > 0 && part))
  return Number.isFinite(value) && value > 0 ? value : 1
}

export function gerarOrdemSecoesLocal(instrucao, secoes) {
  const text = normalize(instrucao)
  const all = secoes.map((sec) => ({ secao_id: sec.id, slug: sec.slug, repeticoes: 1 }))

  if (!text || text.includes('normal') || text.includes('inicio ao fim')) {
    return { ordem: all }
  }

  const refrao = findSection(secoes, 'refrao')
  const verso = findSection(secoes, 'verso')
  const ponte = findSection(secoes, 'ponte')

  if (text.includes('so o refrao') || text.includes('apenas o refrao')) {
    return {
      ordem: refrao
        ? [{ secao_id: refrao.id, slug: refrao.slug, repeticoes: repetitionsFor(text, 'refrao') }]
        : all,
    }
  }

  if (text.includes('iniciar pelo refrao') && refrao) {
    const first = {
      secao_id: refrao.id,
      slug: refrao.slug,
      repeticoes: repetitionsFor(text, 'refrao'),
    }
    return { ordem: [first, ...all] }
  }

  const ordered = []
  if (text.includes('verso') && verso) {
    ordered.push({ secao_id: verso.id, slug: verso.slug, repeticoes: repetitionsFor(text, 'verso') })
  }
  if (text.includes('refrao') && refrao) {
    ordered.push({ secao_id: refrao.id, slug: refrao.slug, repeticoes: repetitionsFor(text, 'refrao') })
  }
  if (text.includes('ponte') && ponte) {
    ordered.push({ secao_id: ponte.id, slug: ponte.slug, repeticoes: repetitionsFor(text, 'ponte') })
  }

  return { ordem: ordered.length ? ordered : all }
}

export function expandirOrdemSecoes(ordemSecoes, secoes) {
  const ordem = ordemSecoes?.ordem?.length
    ? ordemSecoes.ordem
    : secoes.map((sec) => ({ secao_id: sec.id, slug: sec.slug, repeticoes: 1 }))

  return ordem.flatMap((item) => {
    const secao =
      secoes.find((sec) => sec.id === item.secao_id) ||
      secoes.find((sec) => sec.slug === item.slug)
    if (!secao) return []
    return Array.from({ length: item.repeticoes || 1 }, (_, index) => ({
      secao,
      repeticao: index + 1,
      repeticoes: item.repeticoes || 1,
    }))
  })
}
