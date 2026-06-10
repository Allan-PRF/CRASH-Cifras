import { Router } from 'express'

const LOG = '[debug-cc]'

const TEST_URL = 'https://www.cifraclub.com.br/julliany-souza/lindo-momento/'

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
}

function logDebugCc(...args) {
  console.log(LOG, ...args)
}

/**
 * @param {string} label
 * @param {string} url
 * @param {{ headers?: Record<string, string>|null, timeoutMs: number }} opts
 */
async function probeFetch(label, url, { headers = null, timeoutMs }) {
  const startedAt = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const fetchOpts = { signal: controller.signal }
  if (headers && Object.keys(headers).length > 0) {
    fetchOpts.headers = headers
  }

  try {
    logDebugCc(`${label} — iniciando`, {
      url,
      timeoutMs,
      headers: headers ? Object.keys(headers) : [],
    })

    const res = await fetch(url, fetchOpts)
    clearTimeout(timer)

    const html = await res.text()
    const result = {
      forma: label,
      sucesso: res.ok,
      httpStatus: res.status,
      httpStatusText: res.statusText || null,
      erroTipo: res.ok ? null : 'HttpError',
      erroCodigo: res.ok ? null : String(res.status),
      erroMensagem: res.ok ? null : `HTTP ${res.status} ${res.statusText || ''}`.trim(),
      htmlChars: html.length,
      temCifraCnt: /cifra_cnt|id=["']cifra_cnt["']/i.test(html),
      titleTag: html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || null,
      duracaoMs: Date.now() - startedAt,
      timeoutMs,
      headersEnviados: headers ? Object.keys(headers) : [],
    }

    logDebugCc(`${label} — concluído`, result)
    return result
  } catch (err) {
    clearTimeout(timer)

    const isAbort = err?.name === 'AbortError'
    const result = {
      forma: label,
      sucesso: false,
      httpStatus: null,
      httpStatusText: null,
      erroTipo: err?.name || 'Error',
      erroCodigo: err?.code || (isAbort ? 'TIMEOUT/ABORT' : null),
      erroMensagem: err?.message || String(err),
      htmlChars: 0,
      temCifraCnt: false,
      titleTag: null,
      duracaoMs: Date.now() - startedAt,
      timeoutMs,
      headersEnviados: headers ? Object.keys(headers) : [],
    }

    logDebugCc(`${label} — falhou`, result)
    return result
  }
}

export const debugRouter = Router()

/**
 * Diagnóstico temporário: testa fetch ao Cifra Club a partir do servidor (Railway).
 * GET /api/debug/cifraclub-test
 * GET /api/debug/cifraclub-test?url=https://...
 */
debugRouter.get('/cifraclub-test', async (req, res) => {
  const url =
    typeof req.query.url === 'string' && req.query.url.startsWith('https://www.cifraclub.com.br/')
      ? req.query.url
      : TEST_URL

  logDebugCc('endpoint acionado', {
    url,
    nodeEnv: process.env.NODE_ENV || 'unknown',
    userAgent: req.headers['user-agent'] || null,
  })

  const producaoFetchHtml = {
    descricao: 'fetchHtml em cifraClub.js (produção atual)',
    timeoutMs: 12000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/json',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
    nota: 'Produção JÁ envia User-Agent (equivalente à Forma B abaixo, timeout 12s).',
  }

  const [formaA, formaB, formaC] = await Promise.all([
    probeFetch('A_sem_headers', url, { headers: null, timeoutMs: 12000 }),
    probeFetch('B_com_user_agent', url, { headers: BROWSER_HEADERS, timeoutMs: 12000 }),
    probeFetch('C_user_agent_timeout_30s', url, { headers: BROWSER_HEADERS, timeoutMs: 30000 }),
  ])

  const interpretacao = interpretarResultados(formaA, formaB, formaC)

  const payload = {
    ok: true,
    timestamp: new Date().toISOString(),
    urlTestada: url,
    producaoFetchHtml,
    resultados: { formaA, formaB, formaC },
    interpretacao,
  }

  logDebugCc('resumo', interpretacao)
  res.json(payload)
})

function interpretarResultados(a, b, c) {
  const algumComCifra = [a, b, c].some((r) => r.temCifraCnt)
  const todosFalharam = [a, b, c].every((r) => !r.sucesso && !r.temCifraCnt)

  if (algumComCifra) {
    const qual = [a, b, c].filter((r) => r.temCifraCnt).map((r) => r.forma)
    return {
      hipoteseProvavel:
        a.temCifraCnt && !b.temCifraCnt
          ? 'improvável — sem headers funcionou e com headers não'
          : !a.temCifraCnt && (b.temCifraCnt || c.temCifraCnt)
            ? 'headers_user_agent_necessarios'
            : c.temCifraCnt && !b.temCifraCnt
              ? 'timeout_insuficiente_12s'
              : 'fetch_ok_com_cifra',
      formasComCifra: qual,
      bloqueioIpDatacenter: false,
    }
  }

  if (todosFalharam) {
    const statuses = [a, b, c].map((r) => r.httpStatus).filter(Boolean)
    const erros = [a, b, c].map((r) => r.erroCodigo || r.erroTipo)

    if (statuses.some((s) => s === 403 || s === 401 || s === 429)) {
      return {
        hipoteseProvavel: 'bloqueio_ip_ou_waf',
        httpStatuses: statuses,
        erros,
        bloqueioIpDatacenter: true,
      }
    }

    if (erros.some((e) => /TIMEOUT|ABORT|ETIMEDOUT/i.test(String(e)))) {
      return {
        hipoteseProvavel: 'timeout_rede',
        httpStatuses: statuses,
        erros,
        bloqueioIpDatacenter: false,
      }
    }

    if (erros.some((e) => /ECONNREFUSED|ENOTFOUND|ECONNRESET/i.test(String(e)))) {
      return {
        hipoteseProvavel: 'rede_saida_railway',
        httpStatuses: statuses,
        erros,
        bloqueioIpDatacenter: false,
      }
    }

    return {
      hipoteseProvavel: 'falha_desconhecida_revisar_logs',
      httpStatuses: statuses,
      erros,
      bloqueioIpDatacenter: null,
    }
  }

  return {
    hipoteseProvavel: 'resposta_sem_cifra_revisar_html',
    bloqueioIpDatacenter: null,
  }
}
