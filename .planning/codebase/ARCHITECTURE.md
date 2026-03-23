# Architecture

**Analysis Date:** 2026-03-23

## Pattern Overview

**Overall:** Layered server-side architecture with Provider Pattern for external integrations

**Key Characteristics:**
- Next.js App Router with Server Actions as the primary mutation interface (no REST API for business logic)
- Repository Pattern over Supabase JS SDK (not Prisma at runtime — Prisma schema is declaration only)
- Provider Pattern behind TypeScript interfaces for all external services (AI, broker, notifications)
- `ApiResponse<T>` as a discriminated union wraps every Server Action response
- Zustand stores manage complex form state client-side; server state is fetched fresh per render

## Layers

**Core (`src/core/`):**
- Purpose: Shared types, Zod schemas, error class, config constants — no business logic, no I/O
- Location: `src/core/`
- Contains: domain types (`types/`), Zod validation schemas (`schemas/`), `AppError` class (`errors/app-error.ts`), static config (`config/`)
- Depends on: nothing internal
- Used by: every other layer

**Server Actions (`src/server/actions/`):**
- Purpose: Next.js `"use server"` mutations; the only surface the client touches for writes/reads
- Location: `src/server/actions/`
- Contains: one file per domain (`strategy-actions.ts`, `signal-actions.ts`, `broker-actions.ts`, `settings-actions.ts`, `portfolio-actions.ts`, `operation-actions.ts`, `admin-actions.ts`)
- Depends on: Services, Schemas, `getCurrentUserId()` helper in `helpers.ts`
- Used by: Client components/pages exclusively

**Services (`src/server/services/`):**
- Purpose: Business logic orchestration — validates, calls repositories and providers
- Location: `src/server/services/`
- Contains: `StrategyService`, `BrokerService`, `SignalService`, `OperationService`, `NotificationService`, `SignalChecker`, `StrategyChecker`, `IndicatorCalculator`, `FifoCalculator`, `PriceCache`, `notification-templates.ts`
- Depends on: Repositories, Providers, Core types
- Used by: Server Actions, API route handlers

**Repositories (`src/server/repositories/`):**
- Purpose: Supabase JS SDK data access; all queries isolated here
- Location: `src/server/repositories/`
- Contains: `StrategyRepository`, `SignalRepository`, `BrokerRepository`, `UserRepository`, `OperationRepository`, `SignalLogRepository`, `BrokerCatalogRepository`
- Depends on: `@/lib/supabase/server` (authenticated) or `@/lib/supabase/admin` (service role)
- Used by: Services

**Providers (`src/server/providers/`):**
- Purpose: Abstract interface for every external API; swap implementations without changing consumers
- Location: `src/server/providers/`
- Sub-directories:
  - `ai/` — `AiProvider` interface, `DeepSeekProvider` (live), `MockAiProvider`
  - `broker/` — `BrokerProvider` interface, `TinkoffProvider` (live), `MockBrokerProvider`
  - `notification/` — `NotificationProvider` interface (implicit), `TelegramProvider`, `MaxProvider`, `MockNotificationProvider`
- Depends on: Core types, external SDKs (`openai`, `tinkoff-invest-api`, `grammy`)
- Used by: Services, API route handlers

**App Layer (`src/app/`):**
- Purpose: Next.js routing — page components, API routes, layouts, auth callback
- Location: `src/app/`
- Contains: Route groups `(auth)` and `(dashboard)`, `api/` routes, root layout
- Depends on: Server Actions, Components, Hooks
- Used by: Next.js router

**Components (`src/components/`):**
- Purpose: React UI — domain-specific, shared, and shadcn/ui primitives
- Location: `src/components/`
- Contains: `ui/` (shadcn primitives), `layout/`, `shared/`, `strategy/`, `signal/`, `broker/`, `dashboard/`, `admin/`, `forms/`, `pricing/`
- Depends on: Server Actions (called from event handlers), Zustand hooks, Core types
- Used by: App pages

**Hooks/Stores (`src/hooks/`):**
- Purpose: Zustand stores and custom React hooks
- Location: `src/hooks/`
- Contains: `use-strategy-store.ts`, `use-signal-store.ts`, `use-plan-store.ts`, `use-sidebar-store.ts`, `use-keyboard-shortcuts.ts`
- Depends on: Core types
- Used by: Client components

**Lib (`src/lib/`):**
- Purpose: Infrastructure clients and utilities
- Location: `src/lib/`
- Contains: `supabase/` (server, client, admin, middleware clients), `prisma.ts`, `redis.ts`, `utils.ts`
- Depends on: External SDKs
- Used by: Repositories, Services, Server Actions helper, Middleware

## Data Flow

**Strategy CRUD (user-triggered write):**

1. Client component calls Server Action (e.g. `createStrategyAction`)
2. Action calls `getCurrentUserId()` → Supabase auth session lookup
3. Action validates input with Zod schema from `@/core/schemas`
4. Action instantiates `StrategyService` and calls business method
5. Service validates, calls `StrategyRepository.create()`
6. Repository calls Supabase JS SDK, returns typed `StrategyRow`
7. Action wraps result in `successResponse(data)` or `errorResponse(message)` → `ApiResponse<T>`
8. Client receives discriminated union and renders or shows toast

**Signal/Strategy Check (cron-triggered):**

1. External cron hits `POST /api/signals/check` with `Authorization: Bearer CRON_SECRET`
2. Route handler calls `SignalChecker.checkAll()` and `StrategyChecker.checkAll()` in parallel
3. Checker fetches active signals/strategies from Supabase admin client
4. For each: reads price from Redis cache (`PriceCache`) or fetches from `BrokerProvider`
5. `IndicatorCalculator` computes indicator values from candle data
6. Conditions evaluated with AND/OR logic operator
7. On trigger: writes `SignalLog` record, updates signal state, sends Telegram notification via `TelegramProvider`

**AI Strategy Generation:**

1. Client calls `generateStrategyAction(prompt)` or `chatStrategyAction(messages)`
2. Action calls `StrategyService.generateWithAI()` → `DeepSeekProvider.generateStrategy()`
3. DeepSeekProvider calls DeepSeek API (via OpenAI SDK) with `tool_choice: create_strategy`
4. Response parsed, validated, returned as `AiGeneratedStrategy`
5. Client populates `useStrategyStore` via `setFromAI(config)`

**Price Streaming (background worker):**

1. `scripts/price-stream-worker.ts` runs as separate Docker container
2. Queries active instruments from Supabase directly
3. Subscribes to Tinkoff gRPC market data stream
4. Writes prices to Redis with TTL (`price:{instrumentId}`)
5. `SignalChecker` and `StrategyChecker` read from this cache before calling broker API

**State Management:**
- Server state: fetched on mount via Server Actions, re-fetched after mutations
- Strategy form state: `useStrategyStore` (Zustand) — complex multi-step form with AI-fill support
- Signal form state: `useSignalStore` (Zustand)
- UI state: `useSidebarStore`, `usePlanStore` (Zustand)

## Key Abstractions

**ApiResponse<T>:**
- Purpose: Uniform success/error envelope for every Server Action
- Examples: `src/core/types/api.ts`
- Pattern: `{ success: true; data: T } | { success: false; error: string }` — callers check `result.success` before accessing data

**AppError:**
- Purpose: Typed error with HTTP status code, static factories for common cases
- Examples: `src/core/errors/app-error.ts`
- Pattern: `throw AppError.notFound("Strategy")` in services; caught in actions with `e instanceof Error`

**StrategyConfig:**
- Purpose: Central JSON domain object stored in DB, built by AI and form, evaluated by checkers
- Examples: `src/core/types/strategy.ts`
- Pattern: `{ entry: StrategyCondition[], exit: StrategyCondition[], entryLogic, exitLogic, risks }`

**Provider Interfaces:**
- Purpose: Allow swapping live (Tinkoff, DeepSeek, Telegram) with mock implementations
- Examples: `src/server/providers/broker/types.ts`, `src/server/providers/ai/types.ts`
- Pattern: `getBrokerProvider()` / `getAiProvider()` factory functions return interface type

**Repository Classes:**
- Purpose: Single source of truth for DB queries; typed row types defined alongside the class
- Examples: `src/server/repositories/strategy-repository.ts`
- Pattern: Class with `private async db()` returning Supabase client; methods return typed row types

## Entry Points

**Web Application:**
- Location: `src/app/layout.tsx`
- Triggers: Next.js App Router
- Responsibilities: Root HTML, ThemeProvider, TooltipProvider, Toaster

**Dashboard Layout:**
- Location: `src/app/(dashboard)/layout.tsx`
- Triggers: All authenticated dashboard routes
- Responsibilities: Sidebar, Header, auth guard

**Auth Middleware:**
- Location: `src/middleware.ts`
- Triggers: Every request (excluding static assets)
- Responsibilities: Delegates to `updateSession` from `@/lib/supabase/middleware` to refresh Supabase session cookie

**Cron / Signal Check API:**
- Location: `src/app/api/signals/check/route.ts`
- Triggers: External cron with `Authorization: Bearer CRON_SECRET`
- Responsibilities: Runs `SignalChecker.checkAll()` and `StrategyChecker.checkAll()` in parallel

**Auth Callback:**
- Location: `src/app/api/auth/callback/route.ts`
- Triggers: Supabase OAuth/OTP redirect
- Responsibilities: Exchanges code for session, redirects user

**Price Stream Worker:**
- Location: `scripts/price-stream-worker.ts`
- Triggers: Docker container start (`Dockerfile.worker`)
- Responsibilities: Subscribes to Tinkoff gRPC stream, writes prices to Redis cache

**Telegram Bot:**
- Location: `scripts/telegram-bot.mjs`
- Triggers: Docker container start (`Dockerfile.bot`)
- Responsibilities: grammy bot for OTP delivery and notifications

## Error Handling

**Strategy:** Server-side errors are caught at the Server Action boundary and returned as `ApiResponse<never>` with `success: false`. Clients show errors via sonner toast.

**Patterns:**
- Services: `throw AppError.notFound(entity)` / `throw AppError.badRequest(message)`
- Actions: `try/catch → errorResponse(e instanceof Error ? e.message : "Unknown error")`
- Repositories: `if (error) throw new Error(error.message)` (re-throw Supabase errors)
- Providers: propagate exceptions up to service/action boundary
- Background workers: `console.error` + continue loop (non-fatal signal check failures)

## Cross-Cutting Concerns

**Logging:** `console.error` for worker/provider errors. No structured logging library.

**Validation:** Zod at two levels — Server Action input (`createStrategySchema`, `updateStrategySchema`) and Service business validation. Schemas defined in `src/core/schemas/`.

**Authentication:** Supabase Auth session via cookie, refreshed by middleware. `getCurrentUserId()` and `getCurrentUser()` in `src/server/actions/helpers.ts` read auth state on every Server Action call. Admin operations use service-role client from `src/lib/supabase/admin.ts`.

**Authorization:** Role check via `getCurrentUser()` returning `UserRole`. Admin routes validate `role === "ADMIN"` in action helpers.

---

*Architecture analysis: 2026-03-23*
