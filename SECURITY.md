# Segurança — CRASH Cifras v2

Stack: **React + Vite** (frontend/Vercel) · **Express** (API/Railway) · **Supabase**

## Implementado no código

| Camada | Arquivo / local |
|--------|------------------|
| Helmet, CORS, rate limit, bot, honeypot | `backend/middleware/security.js` |
| Servidor | `backend/server.js` |
| Validação YouTube (shared + API) | `shared/validateYoutubeUrl.js`, `POST /api/youtube/validate` |
| Upload seguro (Sharp + magic bytes) | `backend/lib/uploadSecure.js`, `POST /api/upload/foto-ministro` |
| Sanitização HTML | `frontend/src/lib/sanitize.js` (DOMPurify) |
| Proteção anti-IA | `frontend/src/components/security/AiProtection.jsx` |
| Headless guard | `frontend/src/hooks/useSecurityGuard.js` + `ProtectedRoute` |
| Headers dev / build | `frontend/vite.config.js` |
| Headers SPA (prod) | `vercel.json` |
| robots.txt | `frontend/public/robots.txt` |
| Meta copyright | `frontend/index.html` |
| noindex (só área logada) | `react-helmet-async` em `AuthenticatedNoIndex.jsx` |
| Indicação | `backend/lib/referrals.js`, `/api/referrals`, `/ref/:codigo` |

## Rate limits (express-rate-limit)

| Rota | Limite |
|------|--------|
| Geral | 100/min |
| `/api/importar`, `/api/youtube` | 10/min |
| `/api/upload` | 5/min |
| `/api/assinaturas/checkout` | 3/min |
| Webhook InfinitPay | sem limite de pagamento (evita falha em picos) |

## Variáveis de ambiente

- **Frontend (Vite):** apenas `VITE_*` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`)
- **Backend:** `SUPABASE_SERVICE_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `INFINITPAY_*` — nunca `VITE_`
- **`CLIENT_ORIGIN`:** URL pública do SPA (ex.: `https://crashcifras.com.br`). **Configurar no Vercel** (Environment Variables) e no Railway/backend antes do deploy — o CORS da API só aceita origens listadas em `backend/middleware/security.js` + `CLIENT_ORIGIN`.
- **`SUPABASE_SERVICE_KEY`:** deve ser a service role real (`eyJ…`, 100+ caracteres). Placeholder quebra upload admin e webhooks.
- `.env` e `.env.*` estão no `.gitignore`

## SEO vs. área privada

- **Indexáveis:** `/login` e demais rotas públicas (sem `noindex` no `index.html`).
- **noindex:** `/` (dashboard), `/playlist` e `/evento` (evento), `/historico`, `/configuracoes`, `/conta`, `/assinatura` — via `react-helmet-async`.

## Comandos

```bash
npm install
npm audit
npm run dev          # raiz: frontend + backend
```

## Testes externos

- https://securityheaders.com
- https://observatory.mozilla.org
