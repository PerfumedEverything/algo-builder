---
phase: 09-data-pipeline-overhaul
plan: 02
subsystem: data-pipeline
tags: [candle-normalization, redis-cache, moex-session, warmup, testing]
dependency_graph:
  requires: []
  provides: [candle-normalizer, appendCandles, CachedCandle-export]
  affects: [indicator-calculator, strategy-checker, price-cache consumers]
tech_stack:
  added: []
  patterns: [session-boundary-filter, incremental-cache-append, warmup-ttl]
key_files:
  created:
    - src/server/services/candle-normalizer.ts
    - src/__tests__/candle-normalizer.test.ts
  modified:
    - src/server/services/price-cache.ts
    - src/__tests__/price-cache.test.ts
decisions:
  - MSK_OFFSET_MS exported as named constant so consumers avoid hardcoding UTC+3
  - CANDLE_TTL_MAP 1m raised from 60s to 4h to support 500+ candle warmup without full API refetch
  - CachedCandle type exported for use by appendCandles callers and future indicator warmup service
metrics:
  duration_minutes: 2
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_changed: 4
---

# Phase 09 Plan 02: MOEX Candle Normalizer + Redis Warmup Cache Summary

MOEX session filtering utility (UTC->MSK, main/evening session boundaries, weekend filter) and incremental Redis candle cache with warmup-appropriate TTLs.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create candle-normalizer.ts with MOEX session filtering + tests | 8a54b7f | candle-normalizer.ts, candle-normalizer.test.ts |
| 2 | Extend PriceCache with appendCandles and warmup-appropriate TTLs | 5770a1c | price-cache.ts, price-cache.test.ts |

## What Was Built

### Task 1: candle-normalizer.ts

New utility `src/server/services/candle-normalizer.ts` providing:

- `MSK_OFFSET_MS = 10800000` — UTC+3 offset in ms, no DST since 2014
- `utcToMsk(date)` — converts UTC Date to MSK Date
- `moexSessionStartUtcHour()` — returns 7 (10:00 MSK = 07:00 UTC)
- `isInMoexSession(utcDate, opts)` — checks if timestamp falls within MOEX session boundaries: main session 10:00-18:40 MSK (minutes 600-1119), optional evening session 19:05-23:50 MSK (minutes 1145-1429); weekend filter by default
- `normalizeMoexCandles(candles, opts?)` — filters candle array using isInMoexSession; defaults to `{ filterWeekends: true, includeEveningSession: false }`

12 tests covering: Saturday/Sunday filter, main session boundary, pre-market, post-main-session, evening session opt-in, utcToMsk, MSK_OFFSET_MS constant, moexSessionStartUtcHour.

### Task 2: price-cache.ts extensions

Updated `src/server/services/price-cache.ts`:

- `CANDLE_TTL_MAP` extended TTLs: 1m=14400s (4h), 5m=43200s (12h), 15m=86400s (24h), 1h=172800s (48h); ensures 500+ candle warmup history stays cached between strategy checks
- `appendCandles(instrumentId, interval, newCandles)` — reads existing cached candles, filters new candles with `c.time > lastTime` (deduplication by string timestamp comparison), merges and writes back; no-op if nothing fresh
- `CachedCandle` type exported (`export type`) for external consumers

4 new tests: deduplication, create-on-empty, no-op when all cached, TTL verification.

## Deviations from Plan

None — plan executed exactly as written. The plan specified 10 test cases for Task 1; implementation includes 12 (2 extra boundary tests for `isInMoexSession` which add coverage depth).

## Known Stubs

None.

## Self-Check: PASSED

- `src/server/services/candle-normalizer.ts` — EXISTS
- `src/__tests__/candle-normalizer.test.ts` — EXISTS
- `src/server/services/price-cache.ts` — EXISTS (modified)
- `src/__tests__/price-cache.test.ts` — EXISTS (modified)
- Commit 8a54b7f — EXISTS
- Commit 5770a1c — EXISTS
- 20/20 tests passing
