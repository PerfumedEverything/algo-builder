---
phase: 15-grid-trading
plan: "02"
subsystem: grid-trading
tags: [repository, database, grid-trading, supabase, rls]
dependency_graph:
  requires: []
  provides: [grid_orders table DDL, GridRepository CRUD]
  affects: [GridTradingService (Plan 03)]
tech_stack:
  added: []
  patterns: [Repository Pattern, Supabase JS SDK, Row Level Security, atomic WHERE guard]
key_files:
  created:
    - prisma/migrations/20260329_grid_orders.sql
    - src/server/repositories/grid-repository.ts
  modified:
    - src/server/repositories/index.ts
decisions:
  - grid_orders uses snake_case columns (not camelCase) to align with Supabase convention; mapRow() converts to camelCase GridOrderRow
  - user_id references "User"(id) as TEXT — matches existing project FK pattern
  - activateCounterOrder takes price+userId params (not in plan spec) — needed for upsert to set correct price/ownership
  - Service role RLS policy added alongside user policy — matches StrategyOperation pattern for worker access
metrics:
  duration: 104s
  completed: "2026-03-29"
  tasks_completed: 1
  files_changed: 3
---

# Phase 15 Plan 02: grid_orders Migration and GridRepository Summary

**One-liner:** SQL migration for grid_orders table with RLS + GridRepository class with atomic fillOrder race-condition guard via `eq('status', 'PENDING')`.

## What Was Built

### 1. Migration: `prisma/migrations/20260329_grid_orders.sql`

Creates `grid_orders` table with:
- UUID primary key, FK to `"Strategy"(id)` ON DELETE CASCADE
- FK to `"User"(id)` ON DELETE CASCADE
- `UNIQUE(grid_id, level_index, side)` constraint for upsert idempotency
- `status CHECK` constraint: PENDING / FILLED / CANCELLED
- Two indexes: by `grid_id` and by `(grid_id, status)` for fast pending-order lookups
- Row Level Security enabled with user policy + service role policy

### 2. Repository: `src/server/repositories/grid-repository.ts`

`GridRepository` class following the existing `StrategyRepository` pattern:

| Method | Purpose |
|--------|---------|
| `createOrders` | Bulk insert all grid levels as PENDING orders |
| `getOrdersByGridId` | All orders for a grid (for monitoring UI) |
| `getPendingOrders` | Only PENDING orders (for price tick processing) |
| `fillOrder` | Atomic update with `.eq('status', 'PENDING')` — returns `false` if already filled (race condition guard per GRID-02) |
| `activateCounterOrder` | Upsert a counter-side PENDING order after fill |
| `cancelAllPending` | Cancel all PENDING, return count (for stop button feedback per GRID-09) |
| `getGridStats` | Aggregate totalBuys, totalSells, realizedPnl from FILLED orders |
| `deleteByGridId` | Cleanup on grid deletion |

### 3. Barrel export: `src/server/repositories/index.ts`

Added `GridRepository`, `GridOrderRow`, `GridOrderSide`, `GridOrderStatus` exports.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 7bd520a | feat(15-02): grid_orders migration and GridRepository |

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

**Minor additions (Rule 2 - completeness):**

1. `activateCounterOrder` received `price` and `userId` params in addition to what the plan signature showed — these are required for correct upsert behavior (setting correct price and ownership).
2. Added service role RLS policy (`auth.role() = 'service_role'`) to allow the grid worker process to update order status — matches `StrategyOperation` migration pattern.
3. Exported `GridOrderSide` and `GridOrderStatus` types in addition to `GridOrderRow` — Plan 03 will need these in the service layer.

## Known Stubs

None — this plan is purely persistence layer with no UI stubs.

## Self-Check: PASSED
