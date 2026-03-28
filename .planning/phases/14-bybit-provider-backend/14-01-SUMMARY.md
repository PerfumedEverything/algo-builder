---
phase: 14-bybit-provider-backend
plan: "01"
subsystem: broker-foundation
tags: [types, multi-broker, bybit, broker-service, factory-pattern]
dependency_graph:
  requires: []
  provides: [broker-types-extended, broker-provider-interface, async-broker-factory, broker-repository-extended]
  affects: [broker-service, backtest-service, signal-checker, strategy-checker]
tech_stack:
  added: []
  patterns: [async-factory-pattern, provider-pattern]
key_files:
  created:
    - src/server/providers/broker/bybit-provider.ts
    - prisma/migrations/20260328_add_bybit_credentials.sql
  modified:
    - src/core/types/broker.ts
    - src/core/types/strategy.ts
    - src/server/providers/broker/types.ts
    - src/server/providers/broker/tinkoff-provider.ts
    - src/server/providers/broker/mock-broker-provider.ts
    - src/server/providers/broker/index.ts
    - src/server/repositories/broker-repository.ts
    - src/server/services/broker-service.ts
    - src/server/services/backtest-service.ts
    - src/server/services/signal-checker.ts
    - src/server/services/strategy-checker.ts
    - src/components/strategy/strategy-form.tsx
    - src/core/schemas/strategy.ts
    - src/server/actions/strategy-actions.ts
    - src/server/services/strategy-service.ts
    - prisma/schema.prisma
decisions:
  - getBrokerProvider is now async and user-aware, reads brokerType from DB per call
  - backtest-service uses TinkoffProvider directly (backtest is MOEX-specific, no userId in static context)
  - BybitProvider is a stub that throws NotImplemented — full implementation in Plan 04
  - brokerType defaults to TINKOFF for backward compatibility
  - CRYPTO added to full type chain — broker.ts, strategy.ts, Zod schemas, actions, services
metrics:
  duration_minutes: 11
  completed_date: "2026-03-28"
  tasks_completed: 2
  files_changed: 16
---

# Phase 14 Plan 01: Extend Types, DB Schema, Factory, and BrokerService Summary

Multi-broker foundation: BYBIT/CRYPTO types, placeOrder/cancelOrder interface, async user-aware factory, DB credentials columns, and BrokerService refactored to create provider per method.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend types and BrokerProvider interface | bc08e60 | broker.ts, strategy.ts, types.ts, tinkoff-provider.ts, mock-broker-provider.ts, strategy-form.tsx, strategy-schema.ts, strategy-actions.ts, strategy-service.ts |
| 2 | DB migration + repository + factory + BrokerService refactor | ebc5edb | broker-repository.ts, index.ts, bybit-provider.ts, broker-service.ts, backtest-service.ts, signal-checker.ts, strategy-checker.ts, schema.prisma, migration.sql |

## What Was Built

**Type Extensions:**
- `BrokerAccount.type` extended with `"BYBIT"`
- `PortfolioPosition.instrumentType` and `BrokerInstrument.type` extended with `"CRYPTO"`
- New `PlaceOrderParams` type in `src/core/types/broker.ts`
- `AiGeneratedStrategy.instrumentType` extended with `"CRYPTO"` through the full type chain

**BrokerProvider Interface:**
- Added `placeOrder(params: PlaceOrderParams): Promise<string>` — returns orderId
- Added `cancelOrder(orderId: string, symbol: string): Promise<void>`
- Both methods have stubs in `TinkoffProvider` and `MockBrokerProvider` that throw NotImplemented

**DB Migration:**
- SQL migration adds `brokerType TEXT DEFAULT 'TINKOFF'`, `bybitApiKey TEXT`, `bybitApiSecret TEXT` to User table
- Prisma schema updated with same fields

**BrokerRepository:**
- `getSettings()` now reads `brokerType`, `bybitApiKey`, `bybitApiSecret` from DB (was hardcoded TINKOFF)
- New `getBrokerType(userId)` — reads only brokerType for factory routing
- New `saveBybitCredentials(userId, apiKey, apiSecret)` — saves Bybit creds and sets brokerType=BYBIT
- New `saveBrokerType(userId, brokerType)` — standalone type setter

**Async Factory:**
- `getBrokerProvider(userId: string): Promise<BrokerProvider>` — reads brokerType from DB, routes to TinkoffProvider or BybitProvider
- `BybitProvider` stub created — all methods throw `NotImplemented — Plan 04`

**BrokerService Refactor:**
- Removed `private provider = getBrokerProvider()` class-level field
- All 8 methods now create provider via `const provider = await getBrokerProvider(userId)` at method start

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] CRYPTO type propagation to full chain**
- **Found during:** Task 1 TypeScript check
- **Issue:** Adding `"CRYPTO"` to AiGeneratedStrategy caused TypeScript errors in strategy-form.tsx, strategy-schema.ts, strategy-actions.ts, strategy-service.ts — all had hardcoded 4-item enums
- **Fix:** Updated all downstream types, Zod schemas, and action signatures to include CRYPTO
- **Files modified:** strategy-form.tsx, src/core/schemas/strategy.ts, strategy-actions.ts, strategy-service.ts

**2. [Rule 1 - Bug] backtest-service used getBrokerProvider() in static context**
- **Found during:** Task 2 TypeScript check
- **Issue:** BacktestService.initialize() and runBacktest() called old sync `getBrokerProvider()` with no userId — static context has no userId
- **Fix:** Replaced with `new TinkoffProvider()` directly — backtest is MOEX-specific, TinkoffProvider is the correct provider regardless of user
- **Files modified:** src/server/services/backtest-service.ts

**3. [Rule 1 - Bug] signal-checker and strategy-checker had old getBrokerProvider() calls**
- **Found during:** Task 2 TypeScript check
- **Issue:** `connectBroker(userId)` methods in both services called old sync factory
- **Fix:** Updated to `await getBrokerProvider(userId)`
- **Files modified:** signal-checker.ts, strategy-checker.ts

## Known Stubs

- `src/server/providers/broker/bybit-provider.ts` — all methods throw "BybitProvider not implemented — Plan 04". This is intentional; Plan 04 implements the full Bybit SDK integration.

## Self-Check: PASSED
