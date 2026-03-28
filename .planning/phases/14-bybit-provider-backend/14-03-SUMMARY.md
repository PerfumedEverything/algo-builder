---
phase: 14-bybit-provider-backend
plan: 03
subsystem: api
tags: [indicators, crossover, trading-signals, ixjb94-indicators, signal-detection]

requires:
  - phase: 14-bybit-provider-backend
    provides: Phase 14 context and research

provides:
  - Stateless batch crossover detection via @ixjb94/indicators crossOverNumber/crossUnderNumber
  - IndicatorCalculator series methods (calculateRSISeries, calculateSMASeries, etc.) returning number[]
  - Async evaluateConditions/evaluateCondition functions

affects: [strategy-checker, signal-checker, crossing-detector, backtest]

tech-stack:
  added: ["@ixjb94/indicators@1.2.4"]
  patterns:
    - "Stateless batch crossover: collect full indicator series then call ta.crossOverNumber(series, target)"
    - "Series extraction in indicator-series.ts separate from scalar methods in indicator-calculator.ts"
    - "evaluateCrossing kept for backward compat (sync, legacy tests); evaluateCrossingBatch is the new async API"

key-files:
  created:
    - src/server/services/indicator-series.ts
  modified:
    - src/server/services/crossing-detector.ts
    - src/server/services/strategy-checker.ts
    - src/server/services/signal-checker.ts
    - src/__tests__/strategy-checker-conditions.test.ts
    - src/__tests__/signal-checker.test.ts

key-decisions:
  - "evaluateCrossing (sync, stateful) kept as backward-compat export — legacy tests call it directly with lastValues"
  - "evaluateCrossingBatch (async) uses @ixjb94/indicators for stateless batch detection — actual runtime path"
  - "indicator-series.ts extracted as separate file to keep indicator-calculator.ts under 150 lines"
  - "PRICE indicator falls through to false for CROSSES_ABOVE/BELOW since no series method (candles needed)"
  - "Tests updated to async/await for evaluateCondition calls"

requirements-completed: [BYBIT-06]

duration: 12min
completed: 2026-03-28
---

# Phase 14 Plan 03: Crossover Detection Upgrade Summary

**Stateless batch crossover detection via @ixjb94/indicators replacing fragile stateful lastValues pattern; indicator series methods added for full number[] output**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-28T12:45:00Z
- **Completed:** 2026-03-28T12:57:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Installed @ixjb94/indicators and wired crossOverNumber/crossUnderNumber into crossing-detector
- Created indicator-series.ts with calculateRSISeries, calculateSMASeries, calculateEMASeries, calculateMACDSeries, calculateStochasticSeries, calculateWilliamsRSeries
- Made evaluateCondition and evaluateConditions async; updated strategy-checker and signal-checker to await them
- Updated test files to use async/await for evaluateCondition

## Task Commits

1. **Task 1: Install @ixjb94/indicators and add series methods** - `297eb82` (feat)
2. **Task 2: Replace evaluateCrossing with @ixjb94/indicators batch** - `5320081` (feat)

## Files Created/Modified

- `src/server/services/indicator-series.ts` - Series methods returning number[] for RSI, SMA, EMA, MACD, Stochastic, WilliamsR
- `src/server/services/crossing-detector.ts` - New evaluateCrossingBatch (async, stateless), evaluateCondition/evaluateConditions now async, @ixjb94/indicators imported
- `src/server/services/strategy-checker.ts` - Added await to evaluateConditions call
- `src/server/services/signal-checker.ts` - Added await to evaluateConditions, evaluateCondition wrapper made async, getConditionProgress uses Promise.all
- `src/__tests__/strategy-checker-conditions.test.ts` - All checker.evaluateCondition calls updated to async
- `src/__tests__/signal-checker.test.ts` - All checker.evaluateCondition calls updated to async, CROSSES_ABOVE test updated to reflect batch behavior

## Decisions Made

- Kept `evaluateCrossing` (old sync stateful API) as a backward-compat export since existing tests import and call it directly. The actual runtime evaluation path now goes through `evaluateCrossingBatch`.
- `indicator-series.ts` extracted as separate file to keep indicator-calculator.ts under the 150-line limit.
- For CROSSES_ABOVE/BELOW on PRICE indicator: returns false when no candles (no series to compute). This is correct behavior — price crossovers need historical data.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Updated test files to use async/await**
- **Found during:** Task 2 (replace evaluateCrossing)
- **Issue:** Tests called `checker.evaluateCondition(...)` synchronously but the method became async — TypeScript would pass but runtime tests would compare Promise objects to booleans
- **Fix:** Updated all `it(...)` callbacks to `async`, added `await` before all `checker.evaluateCondition(...)` calls in both test files. Also updated the CROSSES_ABOVE/BELOW test case for the new batch behavior (no series from empty candles = false).
- **Files modified:** src/__tests__/signal-checker.test.ts, src/__tests__/strategy-checker-conditions.test.ts
- **Committed in:** 5320081 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing correctness for async test callers)
**Impact on plan:** Necessary for correct test behavior. No scope creep.

## Issues Encountered

None — plan executed cleanly. Pre-existing TypeScript errors in unrelated files (broker provider, risk-calculations) were out of scope and not touched.

## Next Phase Readiness

- Crossover detection is now stateless and batch-based
- evaluateConditions is async — callers must await it
- indicator-series.ts provides series methods for future batch indicator comparisons
- Ready for Phase 14 Plan 04

---
*Phase: 14-bybit-provider-backend*
*Completed: 2026-03-28*
