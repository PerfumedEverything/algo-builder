# Phase 17: Smoke Monitor + Unit/Integration Test Coverage — Research

**Researched:** 2026-03-31
**Domain:** Testing (Vitest unit/integration) + Prod smoke monitoring (cron + Telegram alerts)
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SMOKE-01 | Smoke monitor runs on prod via cron, alerts to Telegram on failure | Cron endpoint pattern already exists (`/api/signals/check`); TelegramProvider already built; new `/api/smoke` endpoint needed |
| SMOKE-02 | Smoke covers all critical API endpoints (health, auth, signals check, prices stream) | All 5 API routes identified; smoke can call them as HTTP probes against `NEXT_PUBLIC_APP_URL` |
| SMOKE-03 | Smoke covers all worker processes (price-worker, bybit-worker, telegram-bot) | Redis `price:*` key staleness check + Docker health API = viable probe strategy |
| SMOKE-04 | Smoke covers broker connectivity (T-Invest + Bybit) | TinkoffProvider.getAccounts(), BybitProvider.getAccounts() probes already exist; need admin user smoke account |
| TEST-01 | BrokerService covered ≥80% unit tests | BrokerService is 99 lines, 8 methods; mock pattern for getBrokerProvider already established in existing tests |
| TEST-02 | StrategyService covered ≥80% unit tests | StrategyService is 103 lines, 9 methods; mock pattern for StrategyRepository already established |
| TEST-03 | PortfolioService (PortfolioAnalyticsService) covered ≥80% unit tests | Partial coverage exists in portfolio-analytics-service.test.ts; needs expansion |
| TEST-04 | IndicatorCalculator covered ≥80% unit tests | Good coverage in indicator-calculator.test.ts and indicator-accuracy.test.ts; needs edge cases |
| TEST-05 | Server actions covered ≥70% integration tests | Pattern established in operation-actions.test.ts; need broker-actions, strategy-actions, grid-actions |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

- OOP where applicable (services, providers — classes)
- Max 150 lines per file — split if needed
- No comments in code
- Naming: camelCase vars, PascalCase components, kebab-case files
- Early return instead of nested if
- One export per file where possible
- Barrel exports (index.ts) for each module
- Server Actions: always `await getCurrentUserId()` first
- Vitest for unit tests, Playwright for E2E
- Unit tests required for every new module
- Supabase Auth only; all data via Supabase JS SDK repositories
- No default exports except page.tsx, layout.tsx

---

## Summary

Phase 17 has two distinct workstreams: (1) a production smoke monitor that runs via cron and alerts via Telegram when prod is broken, and (2) expanding unit/integration test coverage for the four critical service classes identified in REQUIREMENTS.md. Both are well-supported by existing infrastructure.

The smoke monitor fits naturally into the existing cron pattern (`/api/signals/check` is already a Bearer-protected POST endpoint). The new `/api/smoke` endpoint will perform HTTP probes of critical routes, Redis liveness checks, worker heartbeat checks (via Redis key staleness), and broker connectivity checks, then send a Telegram alert if anything fails. The TelegramProvider and NotificationService are fully built — the smoke system just needs to call them directly with admin credentials.

Test coverage gaps are well-understood from running the suite: 555 passing, 25 failing. The 25 failures break into four root-cause categories: backtest-service mock mismatch, session-stats return shape mismatch, moex-provider fetch mock incompatibility, and two component-shape tests that rely on reading source files. These must be fixed as part of Wave 0 before new tests are layered on top.

**Primary recommendation:** Build smoke as a standalone script (`scripts/smoke-monitor.ts`) invoked by a new Docker service `smoke-runner` on a 5-minute cron, NOT as a Next.js cron endpoint — this avoids auth complexity and runs independently of the app server.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 4.1.0 | Unit/integration test runner | Already installed, configured, 555+ tests passing |
| grammy | 1.41.1 | Telegram bot for alerts | Already used in TelegramProvider and telegram-bot.mjs |
| ioredis | 5.10.0 | Redis client for smoke heartbeat checks | Already installed, used in PriceCache and workers |
| tsx | 4.21.0 | Run TypeScript scripts directly | Already used in bybit-stream-worker, price-stream-worker |
| dotenv | 17.3.1 | Load .env in standalone scripts | Already in package.json |
| @testing-library/react | 16.3.2 | React component testing | Already installed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vitejs/plugin-react | 6.0.1 | JSX transform in vitest | Already configured in vitest.config.ts |
| jsdom | 29.0.1 | DOM environment for component tests | Already installed |
| node-cron | (NOT needed) | Cron scheduling | Use Docker restart+sleep or separate cron container instead |

**No new packages needed.** All required dependencies are already installed.

**Installation:**
```bash
# No new installs needed
```

---

## Architecture Patterns

### Smoke Monitor Architecture

**Decision: Standalone script + Docker cron service, NOT Next.js API route**

Rationale: The smoke monitor must run even if Next.js is broken. A separate container using `scripts/smoke-monitor.ts` with a simple `while true; do tsx smoke-monitor.ts; sleep 300; done` shell loop is simpler and more reliable than an internal cron endpoint.

```
scripts/
├── smoke-monitor.ts          # Main smoke script (new)
├── price-stream-worker.ts    # Existing
├── bybit-stream-worker.ts    # Existing
└── telegram-bot.mjs          # Existing

Dockerfile.smoke              # New: FROM node:20-alpine, tsx smoke-monitor.ts
docker-compose.yml            # Add: smoke-runner service
```

### Smoke Monitor Probe Strategy

```
smoke-monitor.ts probes in order:
1. Health: GET /api/health (new simple endpoint) → expect 200
2. Redis: redis.ping() → expect PONG
3. Price worker heartbeat: redis.get("worker:heartbeat") → check staleness < 180s
4. Bybit worker heartbeat: redis.get("bybit-worker:heartbeat") → check staleness < 180s
5. Signals check: POST /api/signals/check (Bearer CRON_SECRET) → expect 200
6. Broker connectivity: probe via Supabase admin query for any user with brokerToken, call TinkoffProvider.getAccounts()
7. DB connectivity: Supabase admin .from("User").select("id").limit(1) → expect data

On ANY failure: send Telegram alert via grammy Bot.api.sendMessage(SMOKE_CHAT_ID, message)
```

### Pattern: vi.hoisted() for class mocks (established pattern across codebase)

```typescript
// Source: src/__tests__/grid-trading-service.test.ts (established pattern)
const mockRepo = vi.hoisted(() => ({
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}))

vi.mock('@/server/repositories/strategy-repository', () => {
  function StrategyRepository(this: unknown) { return mockRepo }
  return { StrategyRepository }
})
```

**Key rule:** Arrow functions cannot be used as constructors in vitest mocks. Always use `function` keyword for class mocks.

### Pattern: Supabase/Redis mock setup (established)

```typescript
// Source: src/__tests__/operation-actions.test.ts (established pattern)
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }))
vi.mock("@/lib/redis", () => ({
  redis: { get: vi.fn(), set: vi.fn(), del: vi.fn(), keys: vi.fn().mockResolvedValue([]), publish: vi.fn() },
}))
vi.mock("@/server/actions/helpers", () => ({
  getCurrentUserId: vi.fn().mockResolvedValue("user-1"),
}))
```

### Recommended Test File Structure

```
src/__tests__/
├── (existing 43 test files)
│
├── broker-service.test.ts          # TEST-01 (new)
├── strategy-service.test.ts        # TEST-02 (new)
├── grid-ai-service.test.ts         # new (covers GridAiService)
├── notification-service.test.ts    # new
│
├── actions/                        # TEST-05 (new dir)
│   ├── broker-actions.test.ts
│   ├── strategy-actions.test.ts
│   ├── grid-actions.test.ts
│   └── settings-actions.test.ts
│
└── smoke/
    └── smoke-monitor.test.ts       # unit tests for smoke probe logic
```

### Anti-Patterns to Avoid

- **Test file reads source code**: `portfolio-amounts.test.ts` reads `strategy-card.tsx` at runtime to assert it contains `stats.initialAmount`. This test will break on any refactor. Fix the failing test by checking component behavior, not source text.
- **Testing implementation, not behavior**: Don't assert on internal mock call counts unless the call IS the observable behavior.
- **Smoke pinging itself**: Smoke monitor must run in its own container, not as a Next.js server action calling its own routes via loopback — that defeats the purpose.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Telegram alerts | Custom HTTP fetch to Telegram API | `grammy` Bot.api.sendMessage() | Already installed, TelegramProvider exists |
| Cron scheduling in container | node-cron package | Shell `while true; sleep 300` in Dockerfile CMD | Simpler, no extra dependency, container restart handles failure |
| Redis connectivity check | Custom ping wrapper | `redis.ping()` from ioredis | Built-in, returns "PONG" |
| Test mocking | Manual dependency injection | `vi.mock()` + `vi.hoisted()` | Already established pattern in 8+ test files |
| HTTP probing | puppeteer/playwright | native `fetch()` with `NEXT_PUBLIC_APP_URL` | Lightweight, already available in Node 20 |

---

## Current Test Infrastructure Audit

### Passing Tests (555/580)
- `src/__tests__/grid-*.test.ts` — ~108 tests, Grid Trading module
- `src/__tests__/indicator-*.test.ts` — IndicatorCalculator, accuracy, series
- `src/__tests__/signal-checker.test.ts`, `strategy-checker-conditions.test.ts` — checker logic
- `src/__tests__/operation-service.test.ts`, `operation-actions.test.ts` — operation layer
- `src/__tests__/portfolio-analytics-service.test.ts`, `portfolio-health.test.ts` — portfolio analytics
- `src/__tests__/price-cache.test.ts` — Redis cache layer
- `src/__tests__/ticker-utils.test.ts` — cleanTicker() incl. TGLD@ fix
- `src/__tests__/candle-*.test.ts` — candle normalizer + validator
- `src/__tests__/terminal/` — market hours (partial), order book, top movers

### Failing Tests (25/580) — MUST FIX IN WAVE 0

#### Category 1: backtest-service.test.ts (10 failures)
**Root cause:** `addStrategySchema` mock not matching actual import shape from `backtest-kit`. The test mocks `addStrategySchema` as `vi.fn()` but `BacktestService` imports it differently after refactor.
**Fix:** Re-align mock to current `backtest-service.ts` import pattern.

#### Category 2: daily-session-stats.test.ts (2 failures)
**Root cause:** `aggregateSessionStats` now returns `{ sessionOpen, periodOpen, high, low, volume }` (5 fields) but tests expect `{ sessionOpen: 0, high: 0, low: 0, volume: 0 }` (4 fields, no `periodOpen`).
**Fix:** Update test expectations to include `periodOpen` field. Tests: "empty candles returns zeros" and "single candle returns its own values".

#### Category 3: moex-provider.test.ts (5 failures)
**Root cause:** `global.fetch` mock pattern is incompatible with how the MOEXProvider internally calls fetch (likely via a different module or fetch wrapper).
**Fix:** Verify MOEXProvider's actual fetch call path; adjust mock approach (may need `vi.stubGlobal('fetch', mockFn)` instead of direct assignment).

#### Category 4: operation-actions.test.ts (4 failures)
**Root cause:** `getPaperPortfolioAction` mock for `StrategyService` doesn't match the actual function signature used in the action. Tests mock `getStrategies` but the action may be calling a different method.
**Fix:** Re-read `paper-portfolio-actions.ts` and align mock to actual method called.

#### Category 5: portfolio-amounts.test.ts (1 failure)
**Root cause:** Test reads `strategy-card.tsx` source file and asserts `initialAmount` is used on "Позиция:" line. But the component uses `stats.currentAmount > 0 ? stats.currentAmount : stats.initialAmount`. The assertion fails because `currentAmount` IS in the "Позиция:" line.
**Fix:** Change the test to accept the fallback pattern OR fix the component to always show `initialAmount` on Позиция (depending on product intent).

#### Category 6: lib/market-hours.test.ts (2 failures)
**Root cause:** `isMarketOpen` now includes evening session (18:40–23:50 MSK), so 18:50 MSK is INSIDE the evening session. The test expects `false` at 18:50 MSK but the implementation returns `true` (correct behavior after Phase 14.2 evening session fix).
**Fix:** Update test expectations to match the new MOEX evening session boundary: 18:50 MSK IS trading time now.

---

## Coverage Gaps (Services Without Tests)

| Service | File | Test File Exists | Priority |
|---------|------|-----------------|----------|
| BrokerService | `broker-service.ts` (99 lines) | No | HIGH (TEST-01) |
| StrategyService | `strategy-service.ts` (103 lines) | No | HIGH (TEST-02) |
| GridAiService | `grid-ai-service.ts` | No | MEDIUM |
| NotificationService | `notification-service.ts` | No | MEDIUM |
| CorrelationService | `correlation-service.ts` | No | LOW |
| RiskService | `risk-service.ts` | No | LOW |

### Server Actions Without Tests

| Action File | Functions | Test Exists | Priority |
|-------------|-----------|------------|----------|
| `broker-actions.ts` | connectBroker, disconnect, getStatus, getAccounts | No | HIGH (TEST-05) |
| `strategy-actions.ts` | getStrategies, createStrategy, updateStrategy, deleteStrategy | Partial (indirectly) | HIGH (TEST-05) |
| `grid-actions.ts` | createGrid, stopGrid, getGridStatus, getGridSuggestion | No | HIGH (TEST-05) |
| `settings-actions.ts` | saveSettings, testNotification | No | MEDIUM (TEST-05) |
| `analytics-actions.ts` | getCorrelationMatrix, getSectorAllocation | Partial | LOW |

---

## Common Pitfalls

### Pitfall 1: Class constructor mocking in Vitest
**What goes wrong:** `vi.mock('module', () => ({ ClassName: vi.fn() }))` — arrow function `vi.fn()` cannot be `new`-called.
**Why it happens:** JavaScript arrow functions don't have a prototype, so `new fn()` throws.
**How to avoid:** Always use `function ClassName(this: unknown) { return mockObj }` pattern, exactly as in `grid-trading-service.test.ts`.
**Warning signs:** `TypeError: ClassName is not a constructor`

### Pitfall 2: Supabase/Admin client initialization in tests
**What goes wrong:** Importing any server action or service that calls `createAdminClient()` or `createClient()` at module load time causes test failures because env vars aren't set.
**Why it happens:** Module-level initialization before mocks are applied.
**How to avoid:** Mock `@/lib/supabase/server` and `@/lib/supabase/admin` BEFORE importing the module under test. Use `vi.mock()` (hoisted automatically) then import after.
**Warning signs:** `Error: supabase URL is required`

### Pitfall 3: Redis mock not matching ioredis API surface
**What goes wrong:** Mocking `redis` as `{ get: vi.fn(), set: vi.fn() }` but the code also calls `redis.setex()`, `redis.expire()`, `redis.smembers()` — those calls throw `redis.X is not a function`.
**How to avoid:** Check all Redis method calls in the module under test, mock all of them.

### Pitfall 4: Smoke monitor calling itself via loopback
**What goes wrong:** Running smoke as a Next.js server action that calls `/api/health` via `fetch('http://localhost:3000/api/health')` — if Next.js is down, the smoke itself fails silently.
**How to avoid:** Smoke runs in its own Docker container, connects to Redis and Supabase directly, probes Next.js via external URL (from `NEXT_PUBLIC_APP_URL` env var).

### Pitfall 5: `vi.hoisted()` must wrap ALL mocks used in `vi.mock()` factory
**What goes wrong:** Declaring mock object OUTSIDE `vi.hoisted()` and using it inside `vi.mock()` factory — vitest hoists `vi.mock()` calls to the top of the file, so the variable isn't initialized yet.
**How to avoid:** Wrap every mock object in `vi.hoisted()` if it's referenced inside a `vi.mock()` factory. See pattern in `grid-trading-service.test.ts`.

### Pitfall 6: aggregateSessionStats return shape mismatch
**What goes wrong:** Tests written before `periodOpen` was added to `DailySessionStats` expect 4-field object; current implementation returns 5 fields. `toEqual()` on object with extra field will fail.
**How to avoid:** When expanding a return type, always update existing test expectations.

---

## Code Examples

### BrokerService test (pattern to follow)

```typescript
// Source: pattern from src/__tests__/grid-trading-service.test.ts
const mockProvider = vi.hoisted(() => ({
  connect: vi.fn(),
  getAccounts: vi.fn(),
  getPortfolio: vi.fn(),
  getCurrentPrice: vi.fn(),
  getCandles: vi.fn(),
  disconnect: vi.fn(),
}))

const mockBrokerRepo = vi.hoisted(() => ({
  saveToken: vi.fn(),
  saveAccountId: vi.fn(),
  getSettings: vi.fn(),
  disconnect: vi.fn(),
}))

vi.mock('@/server/providers/broker', () => ({
  getBrokerProvider: vi.fn().mockResolvedValue(mockProvider),
}))

vi.mock('@/server/repositories/broker-repository', () => {
  function BrokerRepository(this: unknown) { return mockBrokerRepo }
  return { BrokerRepository }
})

import { BrokerService } from '@/server/services/broker-service'
```

### Smoke monitor Telegram alert (pattern)

```typescript
// Source: src/server/providers/notification/telegram-provider.ts (existing)
import { Bot } from 'grammy'

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!)
const chatId = process.env.SMOKE_CHAT_ID! // dedicated smoke alerts chat or same as trading alerts

async function alert(message: string) {
  await bot.api.sendMessage(chatId, `🚨 *[Smoke] PROD ALERT*\n\n${message}`, { parse_mode: 'Markdown' })
}
```

### Worker heartbeat probe pattern

```typescript
// Check if price-worker posted a heartbeat within 3 minutes
const heartbeat = await redis.get('worker:heartbeat')
if (!heartbeat) return { ok: false, reason: 'price-worker: no heartbeat key' }
const age = Date.now() - Number(heartbeat)
if (age > 180_000) return { ok: false, reason: `price-worker: stale ${Math.round(age/1000)}s ago` }
```

Note: `worker:heartbeat` key needs to be written BY `price-stream-worker.ts` — this is a Wave 0 task.

### Action integration test pattern (established)

```typescript
// Source: src/__tests__/operation-actions.test.ts (established pattern)
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }))
vi.mock("@/lib/redis", () => ({
  redis: { get: vi.fn(), set: vi.fn(), del: vi.fn(), keys: vi.fn().mockResolvedValue([]), publish: vi.fn() },
}))
vi.mock("@/server/actions/helpers", () => ({
  getCurrentUserId: vi.fn().mockResolvedValue("user-1"),
}))
// Then import the action under test AFTER mocks
import { connectBrokerAction } from "@/server/actions/broker-actions"
```

---

## Runtime State Inventory

> Not a rename/refactor phase — section not applicable.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All tests + smoke | ✓ | v20.19.0 | — |
| Vitest | Unit/integration tests | ✓ | 4.1.0 | — |
| tsx | Smoke script runner | ✓ | 4.21.0 | — |
| Redis (local) | PriceCache tests | Not verified (tests mock redis) | — | vi.mock('@/lib/redis') |
| grammy | Telegram alerts | ✓ | 1.41.1 | — |
| Docker | Smoke container | ✓ (on VPS) | Not checked locally | — |
| TELEGRAM_BOT_TOKEN | Smoke alerts | On VPS via .env | — | Log-only mode if missing |
| SMOKE_CHAT_ID | Alert destination | Not yet in .env | — | Fallback to existing TELEGRAM_CHAT_ID or log |
| CRON_SECRET | Smoke API auth | On VPS via .env | — | — |

**Missing dependencies with no fallback:**
- `SMOKE_CHAT_ID` env var — needed for smoke alerts; can reuse existing `TELEGRAM_CHAT_ID` or admin's personal chat

**Missing dependencies with fallback:**
- Redis (local dev) — all tests mock it via `vi.mock('@/lib/redis')`

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run src/__tests__/broker-service.test.ts` |
| Full suite command | `npm test` (= `vitest run`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SMOKE-01 | Smoke sends Telegram on failure | unit | `npx vitest run src/__tests__/smoke/smoke-monitor.test.ts` | ❌ Wave 0 |
| SMOKE-02 | API endpoints return 200 | smoke/integration | Smoke script probe | ❌ Wave 0 |
| SMOKE-03 | Worker heartbeats are fresh | smoke | Smoke script probe | ❌ Wave 0 |
| SMOKE-04 | Broker connectivity probe passes | smoke | Smoke script probe | ❌ Wave 0 |
| TEST-01 | BrokerService all 8 methods | unit | `npx vitest run src/__tests__/broker-service.test.ts` | ❌ Wave 0 |
| TEST-02 | StrategyService all 9 methods | unit | `npx vitest run src/__tests__/strategy-service.test.ts` | ❌ Wave 0 |
| TEST-03 | PortfolioAnalyticsService | unit | `npx vitest run src/__tests__/portfolio-analytics-service.test.ts` | ✅ partial |
| TEST-04 | IndicatorCalculator edge cases | unit | `npx vitest run src/__tests__/indicator-calculator.test.ts` | ✅ partial |
| TEST-05 | Server actions integration | integration | `npx vitest run src/__tests__/actions/` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/__tests__/[changed-file].test.ts`
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green (0 failures) before `/gsd:verify-work`

### Wave 0 Gaps (must fix before any new tests)

- [ ] Fix 25 existing failing tests (6 root-cause categories above)
- [ ] `src/__tests__/broker-service.test.ts` — covers TEST-01
- [ ] `src/__tests__/strategy-service.test.ts` — covers TEST-02
- [ ] `src/__tests__/actions/broker-actions.test.ts` — covers TEST-05
- [ ] `src/__tests__/actions/strategy-actions.test.ts` — covers TEST-05
- [ ] `src/__tests__/actions/grid-actions.test.ts` — covers TEST-05
- [ ] `src/__tests__/smoke/smoke-monitor.test.ts` — unit tests for smoke probe logic
- [ ] `scripts/smoke-monitor.ts` — smoke script
- [ ] `Dockerfile.smoke` — smoke container
- [ ] `docker-compose.yml` update — add `smoke-runner` service
- [ ] Add `worker:heartbeat` write to `scripts/price-stream-worker.ts`
- [ ] Add `bybit-worker:heartbeat` write to `scripts/bybit-stream-worker.ts`
- [ ] Add `/api/health` route — simple 200 JSON response
- [ ] Add `SMOKE_CHAT_ID` to `.env` and VPS environment

---

## Key Implementation Details

### Smoke Monitor Probes — Complete List

For "максимально охватывающий все что можно" (cover everything possible):

1. **Next.js alive:** `GET /api/health` → 200
2. **Redis alive:** `redis.ping()` → "PONG"
3. **Supabase DB alive:** admin `.from("User").select("id").limit(1)` → no error
4. **Price worker heartbeat:** `redis.get("worker:heartbeat")` → < 180s stale
5. **Bybit worker heartbeat:** `redis.get("bybit-worker:heartbeat")` → < 180s stale (if BYBIT enabled)
6. **Telegram bot alive:** Check `redis.get("telegram-bot:heartbeat")` OR check bot.api.getMe()
7. **Signals check endpoint:** `POST /api/signals/check` → 200 (checks both SignalChecker + StrategyChecker)
8. **Prices stream endpoint:** `GET /api/prices/stream` auth check → 401 (proves endpoint is alive)
9. **Candle cache warm:** `redis.keys("candles:*")` → at least 1 key present (proves price worker ran)
10. **Strategy count sanity:** DB query for ACTIVE strategies > 0 (proves data layer is working)

### Failing Tests — Fix Strategy

| Test File | Failing Count | Fix Type |
|-----------|--------------|----------|
| `backtest-service.test.ts` | 10 | Update mock to match current `backtest-service.ts` import of `addStrategySchema` |
| `daily-session-stats.test.ts` | 2 | Add `periodOpen` to expected return object in "empty candles" and "single candle" tests |
| `moex-provider.test.ts` | 5 | Change `global.fetch = mockFetch` to `vi.stubGlobal('fetch', mockFetch)` in beforeEach |
| `operation-actions.test.ts` | 4 | Re-read `paper-portfolio-actions.ts` and align `StrategyService` mock method name |
| `portfolio-amounts.test.ts` | 1 | Update CALC-15 assertion: accept the `currentAmount > 0 ? currentAmount : initialAmount` pattern |
| `lib/market-hours.test.ts` | 2 | Update expected values: 18:50 MSK and 19:00 MSK are now INSIDE evening session (correct behavior) |

### BrokerService — Methods to Test (TEST-01)

All 8 public methods with `mockProvider` + `mockBrokerRepo`:
1. `connect()` — saves token, returns accounts
2. `disconnect()` — calls provider.disconnect + repo.disconnect
3. `getAccounts()` — returns [] when no token
4. `getPortfolio()` — returns null when no accountId
5. `getInstruments()` — delegates to provider
6. `getCurrentPrice()` — returns null when no token
7. `getInstrumentPrice()` — throws when no broker connected
8. `getCandles()` — pipes through filterValidCandles
9. `selectAccount()` — calls repo.saveAccountId
10. `sandboxPayIn()` — throws if provider lacks sandboxPayIn
11. `getConnectionStatus()` — returns correct shape

### StrategyService — Methods to Test (TEST-02)

All 9 public methods with `mockRepository` + `mockAiProvider`:
1. `getStrategies()` — with and without filters
2. `getStrategy()` — throws AppError.notFound when not owned
3. `createStrategy()` — validates config via Zod; throws on invalid
4. `updateStrategy()` — calls getStrategy first (ownership check)
5. `deleteStrategy()` — PAUSES then deletes
6. `generateWithAI()` — throws when no aiProvider
7. `chatWithAI()` — delegates to aiProvider
8. `activateStrategy()` — updates status to ACTIVE
9. `deactivateStrategy()` — updates status to PAUSED
10. `getStats()` — delegates to repository

### GridActions to Test (TEST-05)

`grid-actions.ts` functions:
- `createGridAction` — requires userId, validates GridConfig
- `stopGridAction` — ownership check then stop
- `getGridStatusAction` — returns orders + stats
- `getGridSuggestionAction` — calls GridAiService, returns GridSuggestion
- `processPriceTickAction` — processes tick, updates DB

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| technicalindicators library | trading-signals library | Phase 9 | Tests in indicator-accuracy.test.ts use trading-signals |
| No smoke monitor | Smoke monitor (new) | Phase 17 | Catches prod regressions |
| 108 tests (Grid only) | 580 tests (full suite) | Phase 15.1 | Foundation for Phase 17 expansion |
| Manual prod check | Automated 5-min smoke | Phase 17 | Zero-downtime detection |

**Note on isMarketOpen:** The function now includes evening session (18:40–23:50 MSK) as of Phase 14.2. Tests written before Phase 14.2 that expect `false` at 18:50 MSK are wrong — the implementation is correct, the tests need updating.

---

## Open Questions

1. **SMOKE_CHAT_ID — dedicated or shared?**
   - What we know: TelegramProvider.send() takes chatId; existing users have telegramChatId in DB
   - What's unclear: Should smoke alerts go to Anton's personal chat or a dedicated admin chat?
   - Recommendation: Use `SMOKE_CHAT_ID` env var; default to `TELEGRAM_ADMIN_CHAT_ID` if not set; let Anton configure in .env

2. **Worker heartbeat key — exists already?**
   - What we know: `price-stream-worker.ts` has a `HEALTH_CHECK_INTERVAL = 30_000` and `lastPriceUpdate` variable but it doesn't write a Redis heartbeat key
   - What's unclear: Is the heartbeat key `worker:heartbeat` already being written somewhere?
   - Recommendation: Verify; if not, add `redis.set("worker:heartbeat", Date.now().toString(), "EX", 300)` inside the worker's health check interval

3. **backtest-service.test.ts root cause — needs code inspection**
   - What we know: 10 tests fail, all in BacktestService describe block
   - What's unclear: Whether `BacktestService` was refactored after tests were written
   - Recommendation: Read current `backtest-service.ts` import section vs. mock in test file before Wave 0

4. **`/api/health` — does it exist?**
   - What we know: No `/api/health` route found in `src/app/api/`
   - What's unclear: Is there an implicit health endpoint in nginx?
   - Recommendation: Create minimal `src/app/api/health/route.ts` returning `{ ok: true, timestamp: Date.now() }`

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all service files, test files, docker-compose.yml, package.json
- `src/__tests__/` — 43 test files, 580 total tests, 555 passing, 25 failing (run: 2026-03-31)
- `vitest.config.ts` — confirmed: Vitest 4.1.0, node environment, `@` alias to `./src`
- `docker-compose.yml` — confirmed: 6 services (nextjs, redis, telegram-bot, price-worker, bybit-worker, nginx)

### Secondary (MEDIUM confidence)
- Test failure analysis via `npx vitest run --reporter=verbose` output — root causes inferred from assertion errors and source code comparison
- Worker heartbeat gap — identified by reading `price-stream-worker.ts` HEALTH_CHECK_INTERVAL variable vs. absence of Redis write

### Tertiary (LOW confidence)
- `vi.stubGlobal` as fix for moex-provider.test.ts — inferred from Vitest docs patterns, needs verification against actual failure message

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json
- Architecture: HIGH — based on direct code reading of 30+ files
- Pitfalls: HIGH — based on actual test run output and source code analysis
- Test fixes: MEDIUM-HIGH — root causes inferred from assertions + source, exact fix needs verification per file
- Smoke design: HIGH — based on existing infrastructure patterns in codebase

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stack is stable, no fast-moving dependencies)
