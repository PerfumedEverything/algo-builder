---
phase: 11-root-cause-bug-fixes
plan: 02
subsystem: terminal, notifications
tags: [chart-period, session-stats, telegram, notifications, strategy-triggers]

# Dependency graph
requires:
  - phase: 09-data-pipeline
    provides: aggregateSessionStats, getDailySessionStatsAction, terminal PriceBar
  - phase: 08-ai-assistant
    provides: StrategyTriggerHandler, notification-templates

provides:
  - Period-aware % change in terminal PriceBar (RCBF-02)
  - Telegram strategy notifications with trade quantity and total P&L (RCBF-04)

affects: [terminal-stats, telegram-notifications, strategy-checker]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "periodOpen field in DailySessionStats separates session open from period-range open"
    - "capture recordOperation return value to thread trade details into notifications"

key-files:
  created: []
  modified:
    - src/server/services/session-stats.ts
    - src/server/actions/chart-actions.ts
    - src/app/(dashboard)/terminal/page.tsx
    - src/server/services/strategy-trigger-handler.ts
    - src/server/services/notification-templates.ts

key-decisions:
  - "periodOpen defaults to sessionOpen for intraday periods — no extra API call needed"
  - "For 1d/1w periods: fetch single 1d candle from period start to get periodOpen"
  - "Append trade details directly to result.message instead of re-calling formatStrategyNotification"
  - "Exit P&L uses recordedQuantity from current operation; fallback to 1 if recordOperation failed"

patterns-established:
  - "DailySessionStats.periodOpen — always present, equals sessionOpen for intraday periods"
  - "TradeDetails optional param in formatStrategyNotification for entry/exit enrichment"

requirements-completed: [RCBF-02, RCBF-04]

# Metrics
duration: 10min
completed: 2026-03-28
---

# Phase 11 Plan 02: Root Cause Bug Fixes (Terminal % + Telegram Notifications) Summary

**Period-aware terminal % change via DailySessionStats.periodOpen and enriched Telegram notifications with lot counts and total P&L**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-28T07:51:00Z
- **Completed:** 2026-03-28T08:01:41Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Terminal PriceBar now shows % change relative to the selected chart period (daily for intraday, period-start open for 1d/1w)
- getDailySessionStatsAction accepts optional period parameter and fetches day candles to compute period open
- handlePeriodChange re-fetches daily stats so % updates immediately on period switch
- Entry Telegram notifications now include "Куплено: N лот(ов) на X₽"
- Exit Telegram notifications now include "Продано: N лот(ов) на X₽" plus total P&L (price_delta × quantity)

## Task Commits

1. **Task 1: Period-aware terminal % change** - `0362906` (feat)
2. **Task 2: Enrich Telegram notifications with trade quantities and total P&L** - `ac66eb9` (feat)

## Files Created/Modified

- `src/server/services/session-stats.ts` - Added `periodOpen` field to DailySessionStats type
- `src/server/actions/chart-actions.ts` - Added optional `period` parameter; fetches 1d candles for period open on 1d/1w
- `src/app/(dashboard)/terminal/page.tsx` - fetchDailyStats accepts period, handlePeriodChange re-fetches, change uses periodOpen
- `src/server/services/strategy-trigger-handler.ts` - Captures recordOperation result for quantity/amount; enriches entry and exit messages; total P&L = price_delta × quantity
- `src/server/services/notification-templates.ts` - Added TradeDetails type and optional trade param to formatStrategyNotification

## Decisions Made

- `periodOpen` equals `sessionOpen` for intraday periods (1m/5m/15m/1h) — no extra API call, daily session stats are the right baseline for intraday
- For 1d/1w periods, fetch the first day candle in the period range (same `PERIOD_DAYS` map as terminal PERIOD_CONFIG)
- Trade details appended directly to `result.message` in strategy-trigger-handler rather than re-calling formatStrategyNotification — avoids re-constructing the full template and maintains the existing enrichment pattern
- Exit P&L fallback to quantity=1 if recordOperation failed (preserves original per-share behavior as safe fallback)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in `__tests__/` files (operation-service.test.ts, fifo-calculator.test.ts). These are unrelated to changes made in this plan — zero errors in production code.

## Next Phase Readiness

- RCBF-02 and RCBF-04 complete
- Terminal % is now period-aware; no further changes needed for basic period % feature
- Telegram notifications enriched with trade details for both entry and exit

---
*Phase: 11-root-cause-bug-fixes*
*Completed: 2026-03-28*
