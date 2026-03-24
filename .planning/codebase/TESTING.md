# Testing Patterns

**Analysis Date:** 2026-03-23

## Test Framework

**Runner:**
- Vitest — config: `vitest.config.ts`
- Environment: `node`
- Globals: `true` (though imports are explicit in test files)

**Assertion Library:**
- Vitest built-in (`expect`)

**Mocking:**
- `vi` from Vitest

**Run Commands:**
```bash
npm test            # Run all tests once (vitest run)
npm run test:watch  # Watch mode (vitest)
```

No coverage command defined in `package.json`. No coverage threshold configured.

## Test File Organization

**Location:**
- All tests co-located in `src/__tests__/` — centralized, not co-located with source

**Naming:**
- Pattern: `{module-name}.test.ts` matching the source module name
- Examples: `fifo-calculator.test.ts`, `signal-checker.test.ts`, `broker-catalog.test.ts`

**Current test files:**
```
src/__tests__/
├── schemas.test.ts                   # Zod schema validation
├── mock-broker-provider.test.ts      # MockBrokerProvider class
├── operation-service.test.ts         # OperationService class
├── signal-checker.test.ts            # SignalChecker.evaluateCondition
├── fifo-calculator.test.ts           # FifoCalculator static methods
├── broker-catalog.test.ts            # BrokerCatalogRepository with mocked Supabase
└── mock-notification-provider.test.ts # MockNotificationProvider
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest"

describe("ClassName", () => {
  let instance: ClassName

  beforeEach(() => {
    instance = new ClassName()
  })

  it("does something specific", () => {
    // arrange
    // act
    // assert
  })
})

// Nested describe for method grouping:
describe("ClassName.methodName", () => {
  it("scenario description", () => { ... })
})
```

**Patterns:**
- `beforeEach` for fresh instance creation
- Factory helpers (`makeOp`, `makeBroker`, `makeCtx`) for test data
- Descriptive it-strings: behavior-focused ("returns zero stats for no operations")
- Multiple assertions per test when testing related properties

## Mocking

**Framework:** `vi` from Vitest

**Module-level mocking** (must be before imports):
```typescript
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}))

// Then import module under test:
import { OperationService } from "@/server/services/operation-service"
```

**Dynamic import for mocked modules** (broker-catalog pattern):
```typescript
// When module reads mocks at import time, use dynamic import AFTER vi.mock:
const { BrokerCatalogRepository } = await import("@/server/repositories/broker-catalog-repository")
```

**Spy on private repo accessor:**
```typescript
vi.spyOn(service as never, "repo", "get").mockReturnValue({
  getStatsByStrategyId: vi.fn().mockResolvedValue(mockData),
} as never)
```

**Supabase fluent chain mocking** (broker-catalog.test.ts):
```typescript
const mockSelect = vi.fn()
const mockOrder = vi.fn()
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  order: mockOrder,
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}))

// Per-test setup:
mockOrder.mockResolvedValue({ data: brokers, error: null })
mockSelect.mockReturnValue({ order: mockOrder })
```

**What is mocked:**
- Supabase client (`@/lib/supabase/server` and `@/lib/supabase/admin`)
- Repository `repo` accessor when testing service layer
- `vi.clearAllMocks()` in `beforeEach` to reset state between tests

**What is NOT mocked:**
- Pure classes/static methods: `FifoCalculator`, `SignalChecker.evaluateCondition`
- Mock providers themselves: `MockBrokerProvider`, `MockNotificationProvider` tested directly
- Zod schemas: tested against real schema behavior

## Fixtures and Factories

**Test data factories** defined at file scope:
```typescript
const makeOp = (type: "BUY" | "SELL", quantity: number, price: number, date: string): PositionOperation => ({
  type,
  quantity,
  price,
  date,
  amount: price * quantity,
})

const makeBroker = (overrides: Partial<BrokerRow> = {}): BrokerRow => ({
  id: "test-id",
  name: "Test Broker",
  // ... defaults
  ...overrides,
})

const makeCtx = (price: number): EvalContext => ({
  price,
  candles: [],
})
```

**Static mock data** for complex objects:
```typescript
const mockOps: StrategyOperation[] = [
  { id: "op-1", strategyId: "s1", userId: "u1", type: "BUY", ... },
  { id: "op-2", strategyId: "s1", userId: "u1", type: "SELL", ... },
]
```

**Location:** Inline in test files, no shared fixtures directory.

## Coverage

**Requirements:** Not enforced — no coverage threshold in `vitest.config.ts`

**View Coverage:**
```bash
npx vitest run --coverage
```

## Test Types

**Unit Tests:**
- Scope: individual class methods, service logic, Zod schemas, static calculators
- All 7 test files are unit tests
- Location: `src/__tests__/`

**Integration Tests:** Not present

**E2E Tests:** Not present (Playwright not installed)

## Common Patterns

**Async Testing:**
```typescript
// Resolves assertion:
await expect(broker.getAccounts()).rejects.toThrow("Broker not connected")

// Async beforeEach setup:
beforeEach(() => {
  broker = new MockBrokerProvider()
})
// then:
await broker.connect("token")
```

**Error Testing:**
```typescript
// Reject with message:
await expect(broker.getAccounts()).rejects.toThrow("Broker not connected")

// Supabase error simulation:
mockOrder.mockResolvedValue({ data: null, error: { message: "DB error" } })
await expect(repo.findAll()).rejects.toThrow("DB error")
```

**Property Existence Testing:**
```typescript
expect(instruments[0]).toHaveProperty("figi")
expect(instruments[0]).toHaveProperty("ticker")
```

**Approximate numeric assertions:**
```typescript
expect(summary.avgPrice).toBeCloseTo(133.33, 1)
expect(stats.pnlPercent).toBeCloseTo(10, 0)
```

**Testing calls to mocked functions:**
```typescript
expect(mockCreate).toHaveBeenCalledWith(
  expect.objectContaining({
    quantity: 33,
    amount: 9900,
    type: "BUY",
  }),
)
```

## What Is Tested vs Not Tested

**Tested:**
- Zod schema validation (happy path + rejection cases) — `schemas.test.ts`
- `FifoCalculator` FIFO logic (edge cases, sorting, empty input) — `fifo-calculator.test.ts`
- `SignalChecker.evaluateCondition` for all condition types — `signal-checker.test.ts`
- `MockBrokerProvider` full lifecycle — `mock-broker-provider.test.ts`
- `OperationService.getStats` and `recordOperation` with mocked repo — `operation-service.test.ts`
- `BrokerCatalogRepository` CRUD with mocked Supabase client — `broker-catalog.test.ts`
- `MockNotificationProvider` basic contract — `mock-notification-provider.test.ts`

**Not tested (no test files exist for):**
- Server Actions (all files in `src/server/actions/`)
- `TinkoffProvider` (real broker integration)
- `DeepSeekProvider` (AI integration)
- `TelegramProvider` / notification providers
- Strategy, Signal, Operation, User repositories
- `StrategyService`, `SignalService`, `NotificationService`, `PriceCache`
- React components (no component tests)
- Next.js API routes (`src/app/api/`)
- Middleware (`src/middleware.ts`)

---

*Testing analysis: 2026-03-23*
