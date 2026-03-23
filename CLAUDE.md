<!-- GSD:project-start source:PROJECT.md -->
## Project

**AculaTrade — Portfolio Analytics & Terminal**

Расширение платформы AculaTrade профессиональной аналитикой портфеля и встроенным терминалом. Раздел "Портфель" превращается в аналитический инструмент с риск-метриками, фундаментальным анализом, корреляциями и оптимизацией Марковица. Новая страница /terminal — свечной график с данными T-Invest. Skeleton loading по всему сайту для UX.

**Core Value:** Пользователь видит профессиональную аналитику своего портфеля (риски, фундаментал, корреляции, оптимизация) и может анализировать графики инструментов — всё в едином стиле платформы.

### Constraints

- **Stack**: Next.js 15, TypeScript, Tailwind, shadcn/ui, Supabase (auth only), Redis
- **Data**: T-Invest API (свечи, позиции, операции), MOEX ISS API (бенчмарк, фундаментал) — оба бесплатные
- **Packages**: lightweight-charts, simple-statistics, @nivo/heatmap
- **Style**: единая тёмная тема, CSS vars, никаких iframe/чужих виджетов
- **Deploy**: VPS 5.42.121.212, Docker, aculatrade.com
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5 (strict mode) - All source code in `src/`
- Not applicable
## Runtime
- Node.js 20 (Alpine Linux in Docker, confirmed in `Dockerfile` and local `node --version`)
- npm (lockfile: `package-lock.json` present)
## Frameworks
- Next.js 15.5.12 - App Router, Server Components, Server Actions; `src/app/`
- React 19.1.0 - UI rendering
- Tailwind CSS 4 - Utility-first styling; configured via `postcss.config.mjs`
- shadcn/ui (via radix-ui ^1.4.3 + class-variance-authority) - Component primitives; `src/components/ui/`
- framer-motion ^12.36.0 / motion ^12.36.0 - Animations
- next-themes ^0.4.6 - Dark/light mode
- react-hook-form ^7.71.2 + @hookform/resolvers ^5.2.2 - Form state management
- zod ^4.3.6 - Schema validation (shared front+back)
- zustand ^5.0.11 - Client state; `src/hooks/`
- vitest ^4.1.0 - Unit test runner; config at `vitest.config.ts`
- @testing-library/react ^16.3.2 - Component testing
- Next.js Turbopack - Development and production builds (`--turbopack` flag in scripts)
- tsx ^4.21.0 - TypeScript execution for scripts
## Key Dependencies
- `tinkoff-invest-api` ^7.0.1 - T-Invest gRPC broker integration; `src/server/providers/broker/tinkoff-provider.ts`
- `openai` ^6.31.0 - OpenAI SDK used to call DeepSeek V3 with custom baseURL; `src/server/providers/ai/deepseek-provider.ts`
- `grammy` ^1.41.1 - Telegram Bot framework; `src/server/providers/notification/telegram-provider.ts`
- `ioredis` ^5.10.0 - Redis client for cache and signal queue; `src/lib/redis.ts`
- `@prisma/client` ^7.5.0 / `prisma` ^7.5.0 - ORM for all application data; `src/lib/prisma.ts`
- `@supabase/supabase-js` ^2.99.1 + `@supabase/ssr` ^0.9.0 - Auth only; `src/lib/supabase/`
- `technicalindicators` ^3.1.0 - Technical indicator calculations (RSI, SMA, EMA, MACD, Bollinger) for signal checking
- `@dnd-kit/core` ^6.3.1 + `@dnd-kit/sortable` + `@dnd-kit/utilities` - Drag-and-drop in strategy builder UI
- `canvas-confetti` ^1.9.4 - Celebration animation on strategy creation
- `react-markdown` ^10.1.0 - Markdown rendering for AI chat responses
- `sonner` ^2.0.7 - Toast notifications
- `lucide-react` ^0.577.0 - Icon library
## Configuration
- Validated at runtime via Zod schema in `src/core/config/env.ts`
- `.env` (local), `.env.example`, `.env.production.example` (templates committed, secrets not)
- Required vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `REDIS_URL`
- Optional vars: `DEEPSEEK_API_KEY`, `ANTHROPIC_API_KEY`, `TINKOFF_INVEST_TOKEN`, `TINKOFF_SYSTEM_TOKEN`, `TELEGRAM_BOT_TOKEN`, `MAX_BOT_TOKEN`
- Strict mode enabled; path alias `@/*` maps to `./src/*`; config at `tsconfig.json`
- `next.config.ts`: `output: "standalone"`, gRPC packages (`tinkoff-invest-api`, `@grpc/grpc-js`, `nice-grpc`, `protobufjs`) marked as `serverExternalPackages`
- `postcss.config.mjs`: Tailwind CSS 4 via `@tailwindcss/postcss`
- `prisma.config.ts`: Prisma configuration
- `eslint.config.mjs`: ESLint 9 flat config with `eslint-config-next`
## Platform Requirements
- Node.js 20
- PostgreSQL instance (Supabase self-hosted or direct)
- Redis instance
- Optional: T-Invest API token, DeepSeek API key, Telegram Bot token
- Docker (multi-stage Dockerfile; `Dockerfile`, `Dockerfile.bot`, `Dockerfile.worker`)
- `docker-compose.yml` for orchestration
- Self-hosted deployment (VPS/Dedicated per project rules)
- Port 3000 (Next.js), standalone output mode
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- kebab-case for all files: `strategy-actions.ts`, `fifo-calculator.ts`, `broker-catalog-repository.ts`
- Exception: Next.js reserved names use lowercase: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- Test files: `kebab-case.test.ts` in `src/__tests__/`
- camelCase for functions and methods: `getStrategies`, `getCurrentUserId`, `evaluateCondition`
- Server Actions named with `Action` suffix: `getStrategiesAction`, `createStrategyAction`, `deleteStrategyAction`
- Hooks named with `use` prefix: `useSidebarStore`, `useStrategyStore`
- camelCase: `userId`, `mockOps`, `totalAmount`
- Enums/status literals: UPPER_SNAKE_CASE strings used as union literals: `"DRAFT"`, `"ACTIVE"`, `"GREATER_THAN"`, `"OPERATION_STATE_EXECUTED"`
- PascalCase: `StrategyConfig`, `BrokerAccount`, `ApiResponse<T>`, `StrategyRow`
- Props types inline as `type ComponentNameProps = { ... }` (not used in observed files — simple components destructure directly)
- Row types for DB shapes: `StrategyRow`, `BrokerRow`
- PascalCase: `TinkoffProvider`, `StrategyService`, `FifoCalculator`, `AppError`, `StrategyRepository`
- camelCase + `Schema` suffix: `createStrategySchema`, `strategyConfigSchema`, `indicatorTypeSchema`
## Code Style
- No Prettier config found — relies on ESLint `next/core-web-vitals` + `next/typescript`
- 2-space indentation observed throughout
- No trailing semicolons (semicolons are present — standard JS style)
- Double quotes for strings in source files
- ESLint flat config: `eslint.config.mjs`
- Extends `next/core-web-vitals` and `next/typescript`
- Ignores: `node_modules/**`, `.next/**`, `out/**`, `build/**`, `next-env.d.ts`
- No `any` — TypeScript strict mode enforced
- `strict: true` in `tsconfig.json`
- Module resolution: `bundler`
- Path alias: `@/*` maps to `./src/*`
- Explicit types on class properties and method signatures
- Avoid `as any` — use type assertions like `as unknown as Record<string, unknown>` when unavoidable
- Type imports use `import type { ... }` syntax
## Import Organization
- `@/` resolves to `src/`
- Examples: `@/core/types`, `@/server/services`, `@/components/ui/button`, `@/lib/supabase/server`
## Error Handling
## API Response Pattern
## Validation
- Schemas defined in `src/core/schemas/` shared across front and back
- Server Actions call `schema.safeParse(data)` before processing
- Services call `schema.safeParse(data.config)` for nested objects
- Failed parse returns `errorResponse(parsed.error.issues[0].message)`
## Logging
- No logging framework — `console` not observed in source files
- Errors surfaced through `ApiResponse<T>` pattern, not logged server-side
- Provider errors thrown and caught by actions
## Comments
- No inline code comments (enforced by CLAUDE.md rule)
- No JSDoc/TSDoc observed
- Self-documenting naming expected
## Function Design
## Class Design
## Component Design
## Module Structure
- Interface in `types.ts`
- Real implementation: `tinkoff-provider.ts`, `deepseek-provider.ts`
- Mock: `mock-broker-provider.ts`, `mock-ai-provider.ts`
- Factory in `index.ts`: `getBrokerProvider()`, `getAiProvider()`
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Next.js App Router with Server Actions as the primary mutation interface (no REST API for business logic)
- Repository Pattern over Supabase JS SDK (not Prisma at runtime — Prisma schema is declaration only)
- Provider Pattern behind TypeScript interfaces for all external services (AI, broker, notifications)
- `ApiResponse<T>` as a discriminated union wraps every Server Action response
- Zustand stores manage complex form state client-side; server state is fetched fresh per render
## Layers
- Purpose: Shared types, Zod schemas, error class, config constants — no business logic, no I/O
- Location: `src/core/`
- Contains: domain types (`types/`), Zod validation schemas (`schemas/`), `AppError` class (`errors/app-error.ts`), static config (`config/`)
- Depends on: nothing internal
- Used by: every other layer
- Purpose: Next.js `"use server"` mutations; the only surface the client touches for writes/reads
- Location: `src/server/actions/`
- Contains: one file per domain (`strategy-actions.ts`, `signal-actions.ts`, `broker-actions.ts`, `settings-actions.ts`, `portfolio-actions.ts`, `operation-actions.ts`, `admin-actions.ts`)
- Depends on: Services, Schemas, `getCurrentUserId()` helper in `helpers.ts`
- Used by: Client components/pages exclusively
- Purpose: Business logic orchestration — validates, calls repositories and providers
- Location: `src/server/services/`
- Contains: `StrategyService`, `BrokerService`, `SignalService`, `OperationService`, `NotificationService`, `SignalChecker`, `StrategyChecker`, `IndicatorCalculator`, `FifoCalculator`, `PriceCache`, `notification-templates.ts`
- Depends on: Repositories, Providers, Core types
- Used by: Server Actions, API route handlers
- Purpose: Supabase JS SDK data access; all queries isolated here
- Location: `src/server/repositories/`
- Contains: `StrategyRepository`, `SignalRepository`, `BrokerRepository`, `UserRepository`, `OperationRepository`, `SignalLogRepository`, `BrokerCatalogRepository`
- Depends on: `@/lib/supabase/server` (authenticated) or `@/lib/supabase/admin` (service role)
- Used by: Services
- Purpose: Abstract interface for every external API; swap implementations without changing consumers
- Location: `src/server/providers/`
- Sub-directories:
- Depends on: Core types, external SDKs (`openai`, `tinkoff-invest-api`, `grammy`)
- Used by: Services, API route handlers
- Purpose: Next.js routing — page components, API routes, layouts, auth callback
- Location: `src/app/`
- Contains: Route groups `(auth)` and `(dashboard)`, `api/` routes, root layout
- Depends on: Server Actions, Components, Hooks
- Used by: Next.js router
- Purpose: React UI — domain-specific, shared, and shadcn/ui primitives
- Location: `src/components/`
- Contains: `ui/` (shadcn primitives), `layout/`, `shared/`, `strategy/`, `signal/`, `broker/`, `dashboard/`, `admin/`, `forms/`, `pricing/`
- Depends on: Server Actions (called from event handlers), Zustand hooks, Core types
- Used by: App pages
- Purpose: Zustand stores and custom React hooks
- Location: `src/hooks/`
- Contains: `use-strategy-store.ts`, `use-signal-store.ts`, `use-plan-store.ts`, `use-sidebar-store.ts`, `use-keyboard-shortcuts.ts`
- Depends on: Core types
- Used by: Client components
- Purpose: Infrastructure clients and utilities
- Location: `src/lib/`
- Contains: `supabase/` (server, client, admin, middleware clients), `prisma.ts`, `redis.ts`, `utils.ts`
- Depends on: External SDKs
- Used by: Repositories, Services, Server Actions helper, Middleware
## Data Flow
- Server state: fetched on mount via Server Actions, re-fetched after mutations
- Strategy form state: `useStrategyStore` (Zustand) — complex multi-step form with AI-fill support
- Signal form state: `useSignalStore` (Zustand)
- UI state: `useSidebarStore`, `usePlanStore` (Zustand)
## Key Abstractions
- Purpose: Uniform success/error envelope for every Server Action
- Examples: `src/core/types/api.ts`
- Pattern: `{ success: true; data: T } | { success: false; error: string }` — callers check `result.success` before accessing data
- Purpose: Typed error with HTTP status code, static factories for common cases
- Examples: `src/core/errors/app-error.ts`
- Pattern: `throw AppError.notFound("Strategy")` in services; caught in actions with `e instanceof Error`
- Purpose: Central JSON domain object stored in DB, built by AI and form, evaluated by checkers
- Examples: `src/core/types/strategy.ts`
- Pattern: `{ entry: StrategyCondition[], exit: StrategyCondition[], entryLogic, exitLogic, risks }`
- Purpose: Allow swapping live (Tinkoff, DeepSeek, Telegram) with mock implementations
- Examples: `src/server/providers/broker/types.ts`, `src/server/providers/ai/types.ts`
- Pattern: `getBrokerProvider()` / `getAiProvider()` factory functions return interface type
- Purpose: Single source of truth for DB queries; typed row types defined alongside the class
- Examples: `src/server/repositories/strategy-repository.ts`
- Pattern: Class with `private async db()` returning Supabase client; methods return typed row types
## Entry Points
- Location: `src/app/layout.tsx`
- Triggers: Next.js App Router
- Responsibilities: Root HTML, ThemeProvider, TooltipProvider, Toaster
- Location: `src/app/(dashboard)/layout.tsx`
- Triggers: All authenticated dashboard routes
- Responsibilities: Sidebar, Header, auth guard
- Location: `src/middleware.ts`
- Triggers: Every request (excluding static assets)
- Responsibilities: Delegates to `updateSession` from `@/lib/supabase/middleware` to refresh Supabase session cookie
- Location: `src/app/api/signals/check/route.ts`
- Triggers: External cron with `Authorization: Bearer CRON_SECRET`
- Responsibilities: Runs `SignalChecker.checkAll()` and `StrategyChecker.checkAll()` in parallel
- Location: `src/app/api/auth/callback/route.ts`
- Triggers: Supabase OAuth/OTP redirect
- Responsibilities: Exchanges code for session, redirects user
- Location: `scripts/price-stream-worker.ts`
- Triggers: Docker container start (`Dockerfile.worker`)
- Responsibilities: Subscribes to Tinkoff gRPC stream, writes prices to Redis cache
- Location: `scripts/telegram-bot.mjs`
- Triggers: Docker container start (`Dockerfile.bot`)
- Responsibilities: grammy bot for OTP delivery and notifications
## Error Handling
- Services: `throw AppError.notFound(entity)` / `throw AppError.badRequest(message)`
- Actions: `try/catch → errorResponse(e instanceof Error ? e.message : "Unknown error")`
- Repositories: `if (error) throw new Error(error.message)` (re-throw Supabase errors)
- Providers: propagate exceptions up to service/action boundary
- Background workers: `console.error` + continue loop (non-fatal signal check failures)
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
