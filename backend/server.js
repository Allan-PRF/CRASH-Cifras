import express from 'express'
import { env } from './config.js'
import {
  botDetector,
  corsConfig,
  helmetConfig,
  honeypot,
  jsonParser,
  rateLimiters,
  removeFingerprint,
  requestId,
  urlencodedParser,
} from './middleware/security.js'
import { apiRouter } from './routes/index.js'

const app = express()
app.set('trust proxy', 1)

app.disable('x-powered-by')

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'crash-cifras-api', env: env.nodeEnv })
})

app.use(removeFingerprint)
app.use(requestId)
app.use(helmetConfig)
app.use(corsConfig)
app.use(honeypot)
app.use(botDetector)
app.use(rateLimiters.general)
app.use(jsonParser)
app.use(urlencodedParser)

app.use('/api', apiRouter)

app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' })
})

app.use((err, req, res, _next) => {
  const isDev = env.nodeEnv === 'development'
  console.error(`[ERRO] ${req.id || '-'} | ${err.message}`)
  const status = err.status || err.statusCode || 500
  const message =
    status < 500
      ? err.message || 'Erro na requisição.'
      : isDev
        ? err.message
        : 'Erro interno. Tente novamente.'
  res.status(status).json({ error: message, requestId: req.id })
})

app.listen(env.port, () => {
  console.log(`CRASH Cifras API — porta ${env.port} (${env.nodeEnv})`)
})
