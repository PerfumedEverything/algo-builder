# Codebase Structure

**Analysis Date:** 2026-03-23

## Directory Layout

```
algo-builder/
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── (auth)/             # Auth route group (no sidebar layout)
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/
│   │   ├── (dashboard)/        # Protected dashboard route group
│   │   │   ├── layout.tsx      # Sidebar + header layout
│   │   │   ├── dashboard/      # Overview page
│   │   │   ├── strategies/     # Strategy list + [id] detail
│   │   │   ├── signals/        # Signal monitoring
│   │   │   ├── portfolio/      # Broker portfolio
│   │   │   ├── broker/         # Broker connection settings
│   │   │   ├── settings/       # User account settings
│   │   │   ├── admin/          # Admin panel (role-guarded)
│   │   │   ├── pricing/        # Pricing page
│   │   │   └── faq/            # FAQ page
│   │   ├── api/                # API route handlers (minimal — mostly cron/webhooks)
│   │   │   ├── auth/callback/  # Supabase OAuth callback
│   │   │   ├── signals/check/  # Cron endpoint: run all checkers
│   │   │   ├── signals/check-instrument/  # Per-instrument check
│   │   │   ├── broker/         # Broker passthrough endpoints
│   │   │   ├── ai/             # AI streaming endpoints
│   │   │   └── webhooks/       # Incoming webhooks
│   │   ├── layout.tsx          # Root layout (ThemeProvider, Toaster)
│   │   └── globals.css         # Global styles
│   ├── core/                   # Framework-agnostic domain layer
│   │   ├── types/              # TypeScript domain types (index.ts barrel)
│   │   ├── schemas/            # Zod schemas (index.ts barrel)
│   │   ├── errors/             # AppError class
│   │   └── config/             # Static constants (instruments, timeframes, etc.)
│   ├── server/                 # All server-only code
│   │   ├── actions/            # Next.js Server Actions ("use server")
│   │   ├── services/           # Business logic classes
│   │   ├── repositories/       # Supabase data access classes
│   │   └── providers/          # External API providers (ai/, broker/, notification/)
│   ├── components/             # React components
│   │   ├── ui/                 # shadcn/ui primitives
│   │   ├── layout/             # Header, Sidebar, SupportBanner
│   │   ├── shared/             # Cross-domain shared components
│   │   ├── strategy/           # Strategy-specific components
│   │   ├── signal/             # Signal-specific components
│   │   ├── broker/             # Broker-specific components
│   │   ├── dashboard/          # Dashboard widgets
│   │   ├── admin/              # Admin panel components
│   │   ├── forms/              # Reusable form components
│   │   └── pricing/            # Pricing components
│   ├── hooks/                  # Zustand stores + custom hooks
│   ├── lib/                    # Infrastructure clients
│   │   ├── supabase/           # server.ts, client.ts, admin.ts, middleware.ts
│   │   ├── prisma.ts           # Prisma client (schema reference)
│   │   ├── redis.ts            # ioredis client
│   │   └── utils.ts            # cn() and misc helpers
│   ├── styles/                 # Additional CSS (if any)
│   ├── __tests__/              # Unit tests
│   └── middleware.ts           # Next.js middleware (session refresh)
├── scripts/
│   ├── price-stream-worker.ts  # Tinkoff gRPC price stream → Redis
│   └── telegram-bot.mjs        # grammy Telegram bot
├── prisma/
│   ├── schema.prisma           # DB schema declaration
│   └── migrations/             # Prisma migration files
├── nginx/                      # nginx config for self-hosted reverse proxy
├── public/                     # Static assets
├── Dockerfile                  # Main Next.js app image
├── Dockerfile.bot              # Telegram bot image
├── Dockerfile.worker           # Price stream worker image
├── docker-compose.yml          # Full stack compose
├── next.config.ts
├── tsconfig.json
├── vitest.config.ts
└── components.json             # shadcn/ui config
```

## Directory Purposes

**`src/core/`:**
- Purpose: Zero-dependency domain foundation — types, schemas, errors, config
- Contains: TypeScript interfaces/types, Zod schemas, `AppError`, instrument/timeframe constants
- Key files: `src/core/types/strategy.ts` (StrategyConfig domain model), `src/core/types/api.ts` (ApiResponse<T>), `src/core/errors/app-error.ts`

**`src/server/actions/`:**
- Purpose: The only client-callable server interface for mutations and data fetching
- Contains: One file per feature domain, all marked `"use server"`
- Key files: `src/server/actions/strategy-actions.ts`, `src/server/actions/signal-actions.ts`, `src/server/actions/helpers.ts` (auth session helpers)

**`src/server/services/`:**
- Purpose: Business logic — orchestrates repositories and providers
- Contains: Domain service classes, checker classes, calculators, cache wrappers
- Key files: `src/server/services/strategy-service.ts`, `src/server/services/signal-checker.ts`, `src/server/services/indicator-calculator.ts`, `src/server/services/fifo-calculator.ts`, `src/server/services/price-cache.ts`

**`src/server/repositories/`:**
- Purpose: All Supabase data access, one class per entity
- Contains: Repository classes with typed row types co-located
- Key files: `src/server/repositories/strategy-repository.ts`, `src/server/repositories/signal-repository.ts`, `src/server/repositories/user-repository.ts`

**`src/server/providers/`:**
- Purpose: External API adapters behind interfaces
- Contains: Interface file (`types.ts`), live implementation, mock implementation per provider
- Key files: `src/server/providers/broker/tinkoff-provider.ts`, `src/server/providers/broker/types.ts`, `src/server/providers/ai/deepseek-provider.ts`, `src/server/providers/notification/telegram-provider.ts`

**`src/components/ui/`:**
- Purpose: shadcn/ui primitive components — do not add business logic here
- Contains: Button, Card, Dialog, Form, Input, Select, Table, Badge, etc.

**`src/components/strategy/`:**
- Purpose: All UI related to strategy creation, editing, and display
- Contains: `StrategyCard`, `StrategyDialog`, `StrategyForm`, `ConditionBuilder`, `RiskForm`, `AiGenerator`, `AiChat`, `LaunchModeDialog`

**`src/hooks/`:**
- Purpose: Zustand stores and stateful custom hooks
- Contains: `use-strategy-store.ts` (strategy form state), `use-signal-store.ts`, `use-sidebar-store.ts`, `use-plan-store.ts`

**`src/lib/`:**
- Purpose: Singleton infrastructure clients — import these, never instantiate SDKs directly in features
- Key files: `src/lib/supabase/server.ts` (cookie-based auth client), `src/lib/supabase/admin.ts` (service role client), `src/lib/redis.ts` (ioredis singleton)

**`scripts/`:**
- Purpose: Long-running background processes deployed as separate Docker containers
- Generated: No
- Committed: Yes — built and run as `Dockerfile.worker` and `Dockerfile.bot`

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout, providers
- `src/app/(dashboard)/layout.tsx`: Dashboard shell (sidebar + header)
- `src/middleware.ts`: Session refresh middleware
- `src/app/api/signals/check/route.ts`: Cron trigger endpoint

**Configuration:**
- `src/core/config/env.ts`: Environment variable access
- `src/core/config/instruments.ts`: INSTRUMENT_TYPES, TIMEFRAMES constants
- `next.config.ts`: Next.js config
- `components.json`: shadcn/ui config

**Core Logic:**
- `src/core/types/strategy.ts`: StrategyConfig — central domain model
- `src/core/types/api.ts`: ApiResponse<T> and helper factories
- `src/core/errors/app-error.ts`: AppError class
- `src/server/services/signal-checker.ts`: Signal evaluation engine
- `src/server/services/indicator-calculator.ts`: Technical indicator math

**Provider Interfaces:**
- `src/server/providers/broker/types.ts`: BrokerProvider interface
- `src/server/providers/ai/types.ts`: AiProvider interface
- `src/server/providers/notification/types.ts`: NotificationProvider interface

**Testing:**
- `src/___tests__/`: Unit tests (vitest)
- `vitest.config.ts`: Test runner config

## Naming Conventions

**Files:**
- kebab-case for all files: `strategy-service.ts`, `broker-actions.ts`, `use-strategy-store.ts`
- Exception: Page and layout files use Next.js convention: `page.tsx`, `layout.tsx`, `error.tsx`
- Route group directories use parentheses: `(dashboard)`, `(auth)`
- Dynamic route directories use brackets: `[id]`

**Directories:**
- kebab-case: `broker-catalog`, `check-instrument`
- Grouped by domain under `components/`, `providers/`

**Exports:**
- Each module directory has `index.ts` barrel: `src/server/services/index.ts`, `src/server/repositories/index.ts`
- Pages and layouts are default exports (Next.js requirement)
- Everything else is named export

## Where to Add New Code

**New feature domain (e.g. "alerts"):**
- Types: `src/core/types/alert.ts` + re-export from `src/core/types/index.ts`
- Zod schema: `src/core/schemas/alert-schema.ts` + re-export from `src/core/schemas/index.ts`
- Repository: `src/server/repositories/alert-repository.ts` + re-export from `src/server/repositories/index.ts`
- Service: `src/server/services/alert-service.ts` + re-export from `src/server/services/index.ts`
- Actions: `src/server/actions/alert-actions.ts`
- Components: `src/components/alert/` with `index.ts` barrel
- Page: `src/app/(dashboard)/alerts/page.tsx`

**New UI component:**
- If shadcn/ui primitive: `npx shadcn@latest add <component>` → goes to `src/components/ui/`
- If domain-specific: `src/components/{domain}/component-name.tsx`
- If shared cross-domain: `src/components/shared/component-name.tsx`

**New external provider:**
- Define interface in `src/server/providers/{category}/types.ts`
- Implement in `src/server/providers/{category}/{provider-name}-provider.ts`
- Add mock in `src/server/providers/{category}/mock-{category}-provider.ts`
- Export factory function in `src/server/providers/{category}/index.ts`

**New Server Action:**
- Add to existing domain file in `src/server/actions/` or create new file
- Always add `"use server"` directive at top of file
- Always return `Promise<ApiResponse<T>>`
- Always wrap in try/catch → `errorResponse`

**New Zustand store:**
- Create `src/hooks/use-{domain}-store.ts`
- Export typed store hook directly (no barrel needed unless adding more hooks)

**Utilities:**
- Shared helpers: `src/lib/utils.ts`
- Domain-specific utils: co-locate with the service or create `src/lib/{domain}-utils.ts`

## Special Directories

**`.planning/codebase/`:**
- Purpose: GSD codebase analysis documents for Claude commands
- Generated: Yes (by `/gsd:map-codebase`)
- Committed: Yes

**`prisma/migrations/`:**
- Purpose: Prisma migration history
- Note: Schema is used as declaration; runtime data access is via Supabase JS SDK
- Committed: Yes

**`nginx/`:**
- Purpose: nginx reverse proxy config for self-hosted VPS deployment
- Committed: Yes

**`public/`:**
- Purpose: Static assets (images, logos, favicons)
- Generated: No
- Committed: Yes

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes
- Committed: No

---

*Structure analysis: 2026-03-23*
