# Deploy — CRASH Cifras

## Supabase

1. Execute as migrations em ordem:
   - `supabase/migrations/20250517100000_unified_schema_v2.sql`
   - `supabase/migrations/20260516150000_assinaturas_infinitpay.sql`
2. Copie a URL do projeto e as chaves `anon` e `service_role`.
3. Configure a URL de webhook da InfinitPay para:
   - `https://SEU_BACKEND_RAILWAY/api/assinaturas/webhook/infinitpay`

## Backend — Railway

1. Crie um serviço Railway apontando para este repositório.
2. Use o diretório raiz do monorepo.
3. O Railway usa `backend/railway.toml` e sobe com `npm run start`.
4. Configure as variáveis:
   - `NODE_ENV=production`
   - `PORT=3001`
   - `CLIENT_ORIGIN=https://SEU_FRONTEND.vercel.app`
   - `FRONTEND_URL=https://SEU_FRONTEND.vercel.app`
   - `SUPABASE_URL=...`
   - `SUPABASE_SERVICE_KEY=...`
   - `INFINITPAY_HANDLE=PREENCHER_DEPOIS`
   - `INFINITPAY_CHECKOUT_API_URL=https://api.infinitepay.io/invoices/public/checkout/links`
   - `INFINITPAY_WEBHOOK_SECRET=...` se configurar validação por segredo
   - `CRON_SECRET=...` para proteger rotinas automáticas
   - `RESEND_API_KEY=...` para envio do e-mail de fim de trial
   - `EMAIL_FROM=CRASH Cifras <noreply@seu-dominio.com>`
   - `ANTHROPIC_API_KEY=...` para versículos bíblicos (Claude Haiku)
   - `WORKER_ENABLED=false` ou `true` quando o worker real estiver pronto
5. Health check: `/health`.
6. Configure um cron diário no Railway chamando:
   - `POST https://SEU_BACKEND_RAILWAY/api/trial/enviar-lembretes`
   - Header: `Authorization: Bearer SEU_CRON_SECRET`

## Frontend — Vercel

1. Crie um projeto Vercel apontando para este repositório.
2. O `vercel.json` usa:
   - build: `npm run build -w frontend`
   - output: `frontend/dist`
3. Configure as variáveis:
   - `VITE_SUPABASE_URL=...`
   - `VITE_SUPABASE_ANON_KEY=...`
   - `VITE_API_URL=https://SEU_BACKEND_RAILWAY/api`
4. Faça deploy e teste:
   - Login
   - `/assinatura`
   - geração de checkout InfinitPay
   - webhook de pagamento
   - liberação do plano em `user_settings`

## Checklist Final

- `npm run build -w frontend`
- `npm run start -w backend`
- Railway `/health` respondendo `{ ok: true }`
- Vercel apontando `VITE_API_URL` para Railway
- Supabase RLS ativo nas tabelas de assinatura
