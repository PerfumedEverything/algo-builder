---
phase: 18-production-polish
plan: "01"
subsystem: workers, broker-providers, server-actions
tags: [redis-resilience, bybit, fire-and-forget, workers, env-config]
dependency_graph:
  requires: []
  provides: [resilient-workers, observable-errors, env-controlled-bybit]
  affects: [scripts/price-stream-worker.ts, scripts/bybit-stream-worker.ts, bybit-provider, terminal-actions, strategy-actions, signal-actions]
tech_stack:
  added: []
  patterns: [exponential-backoff, env-controlled-config, observable-fire-and-forget]
key_files:
  created: []
  modified:
    - scripts/price-stream-worker.ts
    - scripts/bybit-stream-worker.ts
    - src/server/providers/broker/bybit-provider.ts
    - src/server/actions/terminal-actions.ts
    - src/server/actions/strategy-actions.ts
    - src/server/actions/signal-actions.ts
decisions:
  - "BYBIT_TESTNET defaults to true (safe default) — only set BYBIT_TESTNET=false for production"
  - "reconnectOnError only triggers on READONLY errors — avoids reconnect storms on auth/logic errors"
  - "retryStrategy caps at 30s backoff — prevents crash-looping while allowing recovery"
metrics:
  duration_min: 5
  completed_date: "2026-04-01"
  tasks_completed: 2
  files_modified: 6
---

# Phase 18 Plan 01: Worker Hardening + Bybit Env Config Summary

**One-liner:** Redis exponential backoff + error handlers in workers, fire-and-forget error logging, Bybit testnet/prod via BYBIT_TESTNET env var.

## What Was Built

### Task 1: Worker Redis Resilience + Fire-and-Forget Logging

**price-stream-worker.ts:**
- Added `retryStrategy: (times) => Math.min(times * 500, 30000)` to both `redis` and `subscriberRedis` instances — exponential backoff capped at 30s
- Added `reconnectOnError: (err) => err.message.includes("READONLY") ? 2 : false` for cluster failover scenarios
- Added `redis.on("error", ...)` and `redis.on("reconnecting", ...)` event handlers for both instances

**bybit-stream-worker.ts:**
- Same `retryStrategy` and `reconnectOnError` options added to Redis instance
- Added `redis.on("error", ...)` and `redis.on("reconnecting", ...)` event handlers

**strategy-actions.ts:**
- Replaced `.catch(() => {})` with `.catch((e) => console.error("[StrategyAction] background check failed:", e))`

**signal-actions.ts:**
- Replaced both `.catch(() => {})` with `.catch((e) => console.error("[SignalAction] background check failed:", e))` (2 occurrences: createSignalAction + toggleSignalAction)

### Task 2: Bybit Testnet/Prod via BYBIT_TESTNET Env

**bybit-provider.ts:**
- Changed `testnet: true` → `testnet: process.env.BYBIT_TESTNET !== "false"` in `connect()`

**bybit-stream-worker.ts:**
- Changed `testnet: true` → `testnet: process.env.BYBIT_TESTNET !== "false"` in WebsocketClient constructor
- Updated console.log to show `testnet` or `mainnet` dynamically based on env

**terminal-actions.ts:**
- Changed `testnet: true` → `testnet: process.env.BYBIT_TESTNET !== "false"` in `getOrderBookBybit()`

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 62bb5d6 | feat(18-01): worker Redis resilience + fire-and-forget logging |
| Task 2 | d4a7e9e | feat(18-01): Bybit testnet/prod controlled by BYBIT_TESTNET env var |

## Deviations from Plan

None — plan executed exactly as written.

Note: `scripts/audit-bybit.ts` (untracked audit script) contains `testnet: true` but is out of scope per plan's `files_modified` list.

## Known Stubs

None.

## Self-Check: PASSED

- scripts/price-stream-worker.ts: modified, commit 62bb5d6 verified
- scripts/bybit-stream-worker.ts: modified, commits 62bb5d6 + d4a7e9e verified
- src/server/actions/strategy-actions.ts: modified, commit 62bb5d6 verified
- src/server/actions/signal-actions.ts: modified, commit 62bb5d6 verified
- src/server/providers/broker/bybit-provider.ts: modified, commit d4a7e9e verified
- src/server/actions/terminal-actions.ts: modified, commit d4a7e9e verified
- No `testnet: true` in plan scope files
- No `.catch(() => {})` in server actions
- All `retryStrategy` present in both worker files
