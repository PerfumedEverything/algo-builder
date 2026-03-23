# Technology Stack

**Analysis Date:** 2026-03-23

## Languages

**Primary:**
- TypeScript 5 (strict mode) - All source code in `src/`

**Secondary:**
- Not applicable

## Runtime

**Environment:**
- Node.js 20 (Alpine Linux in Docker, confirmed in `Dockerfile` and local `node --version`)

**Package Manager:**
- npm (lockfile: `package-lock.json` present)

## Frameworks

**Core:**
- Next.js 15.5.12 - App Router, Server Components, Server Actions; `src/app/`
- React 19.1.0 - UI rendering
- Tailwind CSS 4 - Utility-first styling; configured via `postcss.config.mjs`

**UI Components:**
- shadcn/ui (via radix-ui ^1.4.3 + class-variance-authority) - Component primitives; `src/components/ui/`
- framer-motion ^12.36.0 / motion ^12.36.0 - Animations
- next-themes ^0.4.6 - Dark/light mode

**Forms & Validation:**
- react-hook-form ^7.71.2 + @hookform/resolvers ^5.2.2 - Form state management
- zod ^4.3.6 - Schema validation (shared front+back)

**State Management:**
- zustand ^5.0.11 - Client state; `src/hooks/`

**Testing:**
- vitest ^4.1.0 - Unit test runner; config at `vitest.config.ts`
- @testing-library/react ^16.3.2 - Component testing

**Build/Dev:**
- Next.js Turbopack - Development and production builds (`--turbopack` flag in scripts)
- tsx ^4.21.0 - TypeScript execution for scripts

## Key Dependencies

**Critical:**
- `tinkoff-invest-api` ^7.0.1 - T-Invest gRPC broker integration; `src/server/providers/broker/tinkoff-provider.ts`
- `openai` ^6.31.0 - OpenAI SDK used to call DeepSeek V3 with custom baseURL; `src/server/providers/ai/deepseek-provider.ts`
- `grammy` ^1.41.1 - Telegram Bot framework; `src/server/providers/notification/telegram-provider.ts`
- `ioredis` ^5.10.0 - Redis client for cache and signal queue; `src/lib/redis.ts`
- `@prisma/client` ^7.5.0 / `prisma` ^7.5.0 - ORM for all application data; `src/lib/prisma.ts`
- `@supabase/supabase-js` ^2.99.1 + `@supabase/ssr` ^0.9.0 - Auth only; `src/lib/supabase/`
- `technicalindicators` ^3.1.0 - Technical indicator calculations (RSI, SMA, EMA, MACD, Bollinger) for signal checking

**Infrastructure:**
- `@dnd-kit/core` ^6.3.1 + `@dnd-kit/sortable` + `@dnd-kit/utilities` - Drag-and-drop in strategy builder UI
- `canvas-confetti` ^1.9.4 - Celebration animation on strategy creation
- `react-markdown` ^10.1.0 - Markdown rendering for AI chat responses
- `sonner` ^2.0.7 - Toast notifications
- `lucide-react` ^0.577.0 - Icon library

## Configuration

**Environment:**
- Validated at runtime via Zod schema in `src/core/config/env.ts`
- `.env` (local), `.env.example`, `.env.production.example` (templates committed, secrets not)
- Required vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `REDIS_URL`
- Optional vars: `DEEPSEEK_API_KEY`, `ANTHROPIC_API_KEY`, `TINKOFF_INVEST_TOKEN`, `TINKOFF_SYSTEM_TOKEN`, `TELEGRAM_BOT_TOKEN`, `MAX_BOT_TOKEN`

**TypeScript:**
- Strict mode enabled; path alias `@/*` maps to `./src/*`; config at `tsconfig.json`

**Build:**
- `next.config.ts`: `output: "standalone"`, gRPC packages (`tinkoff-invest-api`, `@grpc/grpc-js`, `nice-grpc`, `protobufjs`) marked as `serverExternalPackages`
- `postcss.config.mjs`: Tailwind CSS 4 via `@tailwindcss/postcss`
- `prisma.config.ts`: Prisma configuration
- `eslint.config.mjs`: ESLint 9 flat config with `eslint-config-next`

## Platform Requirements

**Development:**
- Node.js 20
- PostgreSQL instance (Supabase self-hosted or direct)
- Redis instance
- Optional: T-Invest API token, DeepSeek API key, Telegram Bot token

**Production:**
- Docker (multi-stage Dockerfile; `Dockerfile`, `Dockerfile.bot`, `Dockerfile.worker`)
- `docker-compose.yml` for orchestration
- Self-hosted deployment (VPS/Dedicated per project rules)
- Port 3000 (Next.js), standalone output mode

---

*Stack analysis: 2026-03-23*
