---
phase: 09-data-pipeline-overhaul
plan: 03
subsystem: terminal
tags: [terminal, price-bar, daily-session, unit-tests, candle-aggregation]
dependency_graph:
  requires: [09-02]
  provides: [getDailySessionStatsAction, aggregateSessionStats, daily-session-stats.test]
  affects: [terminal/page.tsx, chart-actions.ts]
tech_stack:
  added: []
  patterns: [server-action, pure-helper-for-testability, MSK_OFFSET_MS-reuse]
key_files:
  created:
    - src/__tests__/daily-session-stats.test.ts
  modified:
    - src/server/actions/chart-actions.ts
    - src/app/(dashboard)/terminal/page.tsx
decisions:
  - "aggregateSessionStats extracted as pure function separate from server action for clean unit testing without auth/broker mocks"
  - "MSK_OFFSET_MS reused from candle-normalizer to compute session start (07:00 UTC = 10:00 MSK) without hardcoding"
  - "dailyStats state replaces todayOpen in terminal page — single fetch covers open/high/low/volume"
metrics:
  duration: ~8 min
  completed_date: "2026-03-27T07:38:17Z"
  tasks: 3
  files_changed: 3
---

# Phase 09 Plan 03: Terminal Price Bar Daily Session Fix Summary

Daily session stats fetch using 1m candle aggregation replacing incorrect lastCandle-based H/L/Vol extraction in terminal price bar.

## What Was Built

- `getDailySessionStatsAction` — server action that fetches today's 1-minute candles from MOEX session start (07:00 UTC / 10:00 MSK) and aggregates session-level open/high/low/volume
- `aggregateSessionStats` — pure helper function that performs the aggregation logic, separated from server action for testability
- `DailySessionStats` type exported from chart-actions
- Terminal page refactored to use `dailyStats` state instead of `todayOpen`, wiring all price bar values (H/L/Vol/% change) to session-level data independent of selected chart period
- 7 unit tests for `aggregateSessionStats` covering all aggregation properties and edge cases

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create getDailySessionStatsAction | 165b1de | src/server/actions/chart-actions.ts |
| 2 | Update terminal page price bar | a21c383 | src/app/(dashboard)/terminal/page.tsx |
| 3 | Unit tests for aggregation logic | c1168e5 | src/__tests__/daily-session-stats.test.ts |

## Verification Results

- `npx vitest run src/__tests__/daily-session-stats.test.ts` — 7/7 tests passed
- `npx tsc --noEmit` — no errors in modified source files
- `grep "lastCandle.*high" terminal/page.tsx` — no matches (old pattern removed)
- `grep "getDailySessionStatsAction" terminal/page.tsx` — import + usage confirmed

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data wired from real API calls.

## Self-Check: PASSED
