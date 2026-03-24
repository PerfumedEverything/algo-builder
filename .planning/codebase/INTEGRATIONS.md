# External Integrations

**Analysis Date:** 2026-03-23

## APIs & External Services

**AI Provider:**
- DeepSeek V3 - Strategy generation (function calling) and AI chat about strategies
  - SDK/Client: `openai` ^6.31.0 with custom `baseURL: "https://api.deepseek.com"`
  - Model: `deepseek-chat`
  - Auth: `DEEPSEEK_API_KEY`
  - Implementation: `src/server/providers/ai/deepseek-provider.ts`
  - Factory: `src/server/providers/ai/index.ts` — falls back to `MockAiProvider` if key absent

**Broker:**
- T-Invest (Tinkoff Invest API) - Real-time market data, portfolio data, account info, candles, instruments
  - SDK/Client: `tinkoff-invest-api` ^7.0.1 (gRPC-based)
  - Supports both production and sandbox modes (auto-detected by token type)
  - Auth: `TINKOFF_INVEST_TOKEN` (per-user, stored in `User.brokerToken`), `TINKOFF_SYSTEM_TOKEN` (system-level)
  - Sandbox flag: `TINKOFF_SANDBOX=true`
  - Implementation: `src/server/providers/broker/tinkoff-provider.ts`
  - Factory: `src/server/providers/broker/index.ts`
  - Note: gRPC packages excluded from Next.js bundling (see `next.config.ts` `serverExternalPackages`)

**Messaging:**
- Telegram Bot - Signal notifications sent to user Telegram chat
  - SDK/Client: `grammy` ^1.41.1
  - Auth: `TELEGRAM_BOT_TOKEN`
  - Chat ID stored per-user in `User.telegramChatId`
  - Messages sent with Markdown parse mode
  - Implementation: `src/server/providers/notification/telegram-provider.ts`
  - Secondary bot token: `MAX_BOT_TOKEN` (optional, purpose: additional bot instance)

## Data Storage

**Databases:**
- PostgreSQL (via Supabase self-hosted or direct connection)
  - Connection: `DATABASE_URL` (standard PostgreSQL DSN)
  - Client: Prisma ORM (`@prisma/client` ^7.5.0); global singleton at `src/lib/prisma.ts`
  - Schema: `prisma/schema.prisma`
  - Migrations: `prisma/migrations/`
  - Models: `User`, `Strategy`, `Signal`, `StrategyOperation` (and related enums)
  - Note: Supabase is auth-only; ALL application data goes through Prisma

**File Storage:**
- Not detected (no S3, Supabase Storage, or file upload integrations found)

**Caching / Queue:**
- Redis via `ioredis` ^5.10.0
  - Connection: `REDIS_URL` (default `redis://localhost:6379`)
  - Config: `maxRetriesPerRequest: 3`, `lazyConnect: true`
  - Use: cache layer and signal check queue for strategy monitoring
  - Singleton at `src/lib/redis.ts`

## Authentication & Identity

**Auth Provider:**
- Supabase (self-hosted) - Authentication ONLY; no application data stored in Supabase
  - Public URL: `NEXT_PUBLIC_SUPABASE_URL`
  - Anon Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Service Role Key: `SUPABASE_SERVICE_ROLE_KEY` (server-side admin operations)
  - Browser client: `src/lib/supabase/client.ts` (uses `createBrowserClient` from `@supabase/ssr`)
  - Server client: `src/lib/supabase/server.ts`
  - Admin client: `src/lib/supabase/admin.ts`
  - Session management in middleware: `src/lib/supabase/middleware.ts` → `src/middleware.ts`
  - Auth callback route: `src/app/api/auth/callback/route.ts`
  - Auth pages: `src/app/(auth)/login/`, `register/`, `forgot-password/`, `reset-password/`
  - User identity linked: `User.supabaseId` (cuid in Prisma ↔ Supabase UUID)

## Monitoring & Observability

**Error Tracking:**
- Not detected (no Sentry, Datadog, or similar)

**Logs:**
- `console.error` for environment validation failures (`src/core/config/env.ts`)
- No structured logging library detected

## CI/CD & Deployment

**Hosting:**
- Self-hosted VPS/Dedicated (Docker-based)
- Three Docker images: `Dockerfile` (Next.js app), `Dockerfile.bot` (Telegram bot process), `Dockerfile.worker` (signal checker worker)
- Orchestration: `docker-compose.yml`

**CI Pipeline:**
- Not detected (no GitHub Actions, CircleCI, or similar configuration found)

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase instance URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server only)
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string (default: `redis://localhost:6379`)
- `NEXT_PUBLIC_APP_URL` - Public app URL (default: `http://localhost:3000`)

**Optional env vars:**
- `AI_PROVIDER` - `"claude"` or `"deepseek"` (default: `"claude"`)
- `DEEPSEEK_API_KEY` - DeepSeek API key (activates AI features)
- `DEEPSEEK_BASE_URL` - DeepSeek base URL (default: `https://api.deepseek.com`)
- `ANTHROPIC_API_KEY` - Reserved; Anthropic provider not yet implemented
- `TINKOFF_INVEST_TOKEN` - T-Invest user token
- `TINKOFF_SYSTEM_TOKEN` - T-Invest system token
- `TINKOFF_SANDBOX` - Enable sandbox mode (default: `"true"`)
- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `MAX_BOT_TOKEN` - Secondary Telegram bot token

**Secrets location:**
- `.env` (local development, gitignored)
- `.env.example` and `.env.production.example` committed as templates (no values)
- Docker build-time ARGs for `NEXT_PUBLIC_*` vars in `Dockerfile`

## Webhooks & Callbacks

**Incoming:**
- `src/app/api/auth/callback/route.ts` - Supabase OAuth callback
- `src/app/api/signals/check/` - Signal check endpoint (triggered by scheduler/worker)
- `src/app/api/signals/check-instrument/` - Per-instrument signal check endpoint
- `src/app/api/broker/` - Broker-related API routes
- `src/app/api/ai/` - AI generation API routes
- `src/app/api/webhooks/` directory exists but contains no routes currently

**Outgoing:**
- Telegram Bot API - Signal notifications sent via `grammy` to user chat IDs
- T-Invest gRPC API - Market data and account operations
- DeepSeek API - Strategy generation and chat responses

---

*Integration audit: 2026-03-23*
