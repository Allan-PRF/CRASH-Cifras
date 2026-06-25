import { v4 as uuidv4 } from 'uuid'
import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { env } from '../config.js'

const isDev = env.nodeEnv === 'development'

export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://www.youtube.com',
        'https://www.gstatic.com',
      ],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https://*.supabase.co',
        'https://img.youtube.com',
        'https://i.ytimg.com',
      ],
      frameSrc: ['https://www.youtube.com', 'https://www.youtube-nocookie.com'],
      connectSrc: [
        "'self'",
        'https://*.supabase.co',
        'wss://*.supabase.co',
        'https://api.infinitepay.io',
        'https://api.openai.com',
      ],
      mediaSrc: ["'self'", 'https://www.youtube.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
})

const allowedOrigins = [
  'https://www.crashcifras.com.br',
  'https://crashcifras.com.br',
  'https://crashcifras.vercel.app',
  ...env.corsOrigins,
].filter(Boolean)

export const corsConfig = cors({
  origin(origin, callback) {
    if (!origin && isDev) return callback(null, true)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`CORS bloqueado para origem: ${origin}`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'x-acervo-motor-secret'],
  exposedHeaders: ['X-Request-ID', 'X-Timestamp'],
})

function buildLimiter({ windowMs, max, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
  })
}

export const rateLimiters = {
  auth: buildLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Muitas tentativas de login. Aguarde 15 minutos.',
    skipSuccessfulRequests: true,
  }),
  payment: buildLimiter({
    windowMs: 60 * 1000,
    max: 3,
    message: 'Muitas requisições de pagamento. Aguarde um momento.',
  }),
  upload: buildLimiter({
    windowMs: 60 * 1000,
    max: 5,
    message: 'Muitos uploads. Aguarde um momento.',
  }),
  youtube: buildLimiter({
    windowMs: 60 * 1000,
    max: 10,
    message: 'Muitas buscas. Aguarde um momento.',
  }),
  general: buildLimiter({
    windowMs: 60 * 1000,
    max: 100,
    message: 'Muitas requisições. Tente novamente em breve.',
  }),
  referralPublic: buildLimiter({
    windowMs: 60 * 1000,
    max: 30,
    message: 'Muitas consultas ao link de indicação. Aguarde um momento.',
  }),
}

const BOT_USER_AGENTS = [
  'gptbot',
  'claudebot',
  'anthropic-ai',
  'ccbot',
  'chatgpt-user',
  'google-extended',
  'manus',
  'python-requests',
  'axios/',
  'curl/',
  'wget/',
  'scrapy',
  'selenium',
  'puppeteer',
  'playwright',
  'headlesschrome',
  'phantomjs',
  'ia_archiver',
]

const HONEYPOT_PATHS = [
  '/wp-admin',
  '/wp-login.php',
  '/.env',
  '/admin.php',
  '/phpmyadmin',
  '/config.php',
  '/.git',
  '/xmlrpc.php',
  '/rastreio-bot',
  '/backup.sql',
  '/database.sql',
]

export function botDetector(req, res, next) {
  if (req.path.startsWith('/api/acervo/motor')) {
    return next()
  }

  const userAgent = (req.headers['user-agent'] || '').toLowerCase()
  const isBot = BOT_USER_AGENTS.some((b) => userAgent.includes(b))

  if (isBot && req.path.startsWith('/api')) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress
    console.warn(`[SEGURANÇA] Bot bloqueado: ${userAgent} | IP: ${ip} | ${req.path}`)
    return res.status(403).json({ error: 'Acesso negado.' })
  }
  next()
}

export function honeypot(req, res, next) {
  if (HONEYPOT_PATHS.some((p) => req.path.startsWith(p))) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress
    console.warn(`[HONEYPOT] Acesso suspeito | IP: ${ip} | ${req.path}`)
    return res.status(404).send('Not Found')
  }
  next()
}

export function requestId(req, res, next) {
  req.id = uuidv4()
  res.setHeader('X-Request-ID', req.id)
  res.setHeader('X-Timestamp', new Date().toISOString())
  next()
}

export function removeFingerprint(_req, res, next) {
  res.removeHeader('X-Powered-By')
  next()
}

export const jsonParser = express.json({
  limit: '1mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf?.length ? buf.toString('utf8') : ''
  },
})
export const urlencodedParser = express.urlencoded({ extended: true, limit: '1mb' })
