import { config } from 'dotenv'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

config({ path: resolve(__dirname, '../.env') })

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3001,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceKey:
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '',
  supabaseAnonKey:
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  infinitPayHandle: (process.env.INFINITPAY_HANDLE || '').trim(),
  infinitPayCheckoutApiUrl:
    process.env.INFINITPAY_CHECKOUT_API_URL ||
    'https://api.checkout.infinitepay.io/links',
  infinitPayWebhookSecret: process.env.INFINITPAY_WEBHOOK_SECRET || '',
  cronSecret: process.env.CRON_SECRET || '',
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'CRASH Cifras <noreply@crashcifras.com>',
  publicSiteUrl:
    process.env.FRONTEND_URL ||
    process.env.CLIENT_ORIGIN ||
    'https://crashcifras.com.br',
  corsOrigins: [
    clientOrigin,
    'http://localhost:4173',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  workerEnabled: process.env.WORKER_ENABLED === 'true',
  acervoMotorSecret: process.env.ACERVO_MOTOR_SECRET || process.env.CRON_SECRET || '',
}
