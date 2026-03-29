---
phase: 15-grid-trading
plan: "03"
subsystem: grid-trading-service
tags: [grid-trading, service-layer, tdd, paper-trading, server-actions]
dependency_graph:
  requires: [15-01, 15-02]
  provides: [GridTradingService, createGridAction, stopGridAction, getGridStatusAction, processGridTickAction]
  affects: [src/server/services, src/server/actions]
tech_stack:
  added: []
  patterns: [TDD red-green-refactor, vi.hoisted mock pattern, service orchestration]
key_files:
  created:
    - src/server/services/grid-trading-service.ts
    - src/server/actions/grid-actions.ts
    - src/__tests__/grid-trading-service.test.ts
  modified:
    - src/server/services/index.ts
decisions:
  - vi.hoisted() used for mock instances shared in vi.mock factory — consistent with Phase 14 pattern
  - GridEngine import from @/lib/grid-engine (not @/server) per Phase 15-01 server/client boundary fix
  - processPriceTick passes pnlDelta per-fill (not per-order) — matches GridTickResult contract
metrics:
  duration_min: 3
  completed_date: "2026-03-29"
  tasks_completed: 2
  files_changed: 4
---

# Phase 15 Plan 03: GridTradingService + Server Actions Summary

**One-liner:** GridTradingService orchestrates grid lifecycle (create/tick/stop) using GridEngine + GridRepository with paper-trading simulation; 4 server actions expose this to the frontend with auth + Zod validation.

## Tasks Completed

| # | Name | Status | Commit |
|---|------|--------|--------|
| 1 | Implement GridTradingService (TDD) | Done | 1ed016e |
| 2 | Create server actions for grid operations | Done | 0a4bfdc |

## What Was Built

### GridTradingService (`src/server/services/grid-trading-service.ts`)

Orchestration layer between GridEngine (pure math) and GridRepository (persistence):

- `createGrid`: creates strategy row, calculates levels via `GridEngine.calculateLevels`, initializes orders via `GridEngine.initializeState`, persists via `GridRepository.createOrders`
- `processPriceTick`: fetches pending orders, runs `GridEngine.processTick`, fills orders atomically, places counter-orders, sends out-of-range notification via NotificationService
- `stopGrid`: cancels all pending orders, updates strategy to PAUSED, returns final stats
- `getGridStatus`: returns current orders + aggregated stats

Paper trading mode: fills are simulated by price comparison against pending order levels, no BrokerProvider calls.

### Server Actions (`src/server/actions/grid-actions.ts`)

4 actions with auth + Zod validation:

- `createGridAction`: validates config schema, checks price in range, delegates to service
- `stopGridAction`: stops grid, returns cancelled count and final P&L stats
- `getGridStatusAction`: returns orders and stats for display
- `processGridTickAction`: processes a price tick (used by price worker in Phase 15.04)

`gridConfigSchema` validates: `lowerPrice > 0`, `upperPrice > lowerPrice`, `gridLevels 3-100`, `amountPerOrder > 0`, `feeRate 0-0.01`.

### Tests (`src/__tests__/grid-trading-service.test.ts`)

7 tests, all passing. TDD Red-Green-Refactor cycle:
- Test 1: createGrid full flow
- Test 2: BUY fill triggers counter SELL
- Test 3: SELL fill triggers counter BUY
- Test 4: out of range triggers notification
- Test 5: stopGrid stats and cancellation
- Test 6: no-fill when price between levels
- Test 7: multiple fills in single tick (price gap)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Vitest arrow-function mock factories fail for class constructors**
- **Found during:** GREEN phase
- **Issue:** vi.mock factories using arrow functions (`() => ({...})`) can't be used as constructors with `new` — Vitest throws "is not a constructor"
- **Fix:** Used `vi.hoisted()` pattern to create shared mock instances, with regular function constructors in vi.mock factories returning the hoisted instances
- **Files modified:** `src/__tests__/grid-trading-service.test.ts`
- **Commit:** 1ed016e (included in GREEN commit)

This follows the established Phase 14 pattern: `vi.hoisted() required for mock instance shared in vi.mock factory`.

## Known Stubs

None — all methods fully implemented with real repository and engine calls.

## Self-Check

Files exist:
- [x] `src/server/services/grid-trading-service.ts` — FOUND
- [x] `src/server/actions/grid-actions.ts` — FOUND
- [x] `src/__tests__/grid-trading-service.test.ts` — FOUND
- [x] `src/server/services/index.ts` updated — FOUND

Commits exist:
- [x] `a25074d` — test(15-03): add failing grid trading service tests
- [x] `1ed016e` — feat(15-03): implement GridTradingService
- [x] `0a4bfdc` — feat(15-03): create server actions for grid operations

## Self-Check: PASSED
