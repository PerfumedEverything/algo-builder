---
phase: 12-calculation-correctness
plan: 03
subsystem: testing
tags: [backtest, conditions, rsi, indicator-calculator, tdd]

requires:
  - phase: 12-02
    provides: filterValidCandles from candle-validator.ts

provides:
  - evaluateBacktestConditions utility in evaluate-conditions.ts
  - Real condition evaluation in BacktestService.getSignal (replaces stub)
  - inPosition state tracking for entry/exit logic in backtest
  - exitConditions parsing in BacktestService

affects:
  - backtest-service
  - strategy backtesting accuracy
  - 12-04

tech-stack:
  added: []
  patterns:
    - "computeIndicators: inline indicator computation per candle window from StrategyCondition[] — avoids IndicatorCalculator.calculate() which doesn't exist"
    - "inPosition state in getSignal closure: tracks whether currently in trade to switch between entry/exit logic"
    - "Pre-fetch allCandles once before backtest loop: avoids N*500 API calls"

key-files:
  created:
    - src/server/services/evaluate-conditions.ts
    - src/__tests__/evaluate-conditions.test.ts
  modified:
    - src/server/services/backtest-service.ts
    - src/__tests__/backtest-service.test.ts

key-decisions:
  - "computeIndicators() function built inline in backtest-service.ts (not a method on IndicatorCalculator) because IndicatorCalculator has no static calculate(candles, configs) batch method — using individual methods per indicator type"
  - "StrategyCondition.params.period replaces plan's cond.period — actual type uses params: Record<string, number> not period?: number"
  - "getSignal returns null when entryConditions.length === 0 (no conditions = no signal, not always-long)"

requirements-completed: [CALC-10, CALC-11, CALC-12, CALC-13]

duration: 8min
completed: 2026-03-28
---

# Phase 12 Plan 03: Backtest Condition Evaluation Summary

**Real condition evaluation in BacktestService.getSignal: replaces always-long stub with RSI/SMA/EMA indicator computation and AND/OR entry/exit logic per candle**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-28T13:39:09Z
- **Completed:** 2026-03-28T13:42:30Z
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files modified:** 4

## Accomplishments

- Created `evaluate-conditions.ts` with `evaluateBacktestConditions` and `evaluateBacktestCondition` exports — bridges StrategyCondition JSON to indicator value comparison
- Replaced `getSignal` stub (always-long) with real condition evaluation: pre-fetches candles once, computes indicators per window, evaluates entry/exit conditions with AND/OR logic
- Added `inPosition` state variable to switch between entry (AND logic) and exit (OR logic) evaluation per candle
- Added `exitConditions` JSON parsing (previously missing) and `filterValidCandles` for data quality
- 29 tests all pass: 14 evaluate-conditions unit tests + 15 backtest-service tests including 3 CALC-13 tests

## Task Commits

1. **Task 1 (RED): evaluate-conditions utility + CALC-13 failing tests** - `778e1ec` (test)
2. **Task 2 (GREEN): real getSignal implementation** - `9fb67e5` (feat)

## Files Created/Modified

- `src/server/services/evaluate-conditions.ts` - Condition evaluation utility: evaluateBacktestCondition, evaluateBacktestConditions
- `src/__tests__/evaluate-conditions.test.ts` - 14 unit tests for GREATER_THAN, LESS_THAN, BETWEEN, AND/OR logic, null handling
- `src/server/services/backtest-service.ts` - Real getSignal with indicator computation, inPosition state, exitConditions parsing, filterValidCandles
- `src/__tests__/backtest-service.test.ts` - Added CALC-13 describe with 3 tests: empty-conditions null, entry-met long, stub-gone null-for-unmet

## Decisions Made

- `IndicatorCalculator.calculate(candles, configs)` does not exist — plan's interface was incorrect. Implemented `computeIndicators()` helper inline in backtest-service.ts that switches on `cond.indicator` and calls individual static methods.
- `StrategyCondition` uses `params: Record<string, number>` not `period?: number` as the plan's interface showed. Updated `getIndicatorKey` to use `cond.params.period`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] IndicatorCalculator.calculate() method does not exist**
- **Found during:** Task 2 (Wire real condition evaluation)
- **Issue:** Plan specified `IndicatorCalculator.calculate(window, indicatorConfigs)` returning `Record<string, number | null>`, but `IndicatorCalculator` only has individual static methods (`calculateRSI`, `calculateSMA`, etc.). No batch `calculate()` method exists.
- **Fix:** Implemented `computeIndicators(candles, conditions)` function locally in backtest-service.ts that switches on `condition.indicator` and calls the appropriate static method.
- **Files modified:** `src/server/services/backtest-service.ts`
- **Verification:** All 29 tests pass including CALC-13 RSI condition tests
- **Committed in:** `9fb67e5` (Task 2 commit)

**2. [Rule 1 - Bug] StrategyCondition.params structure mismatch**
- **Found during:** Task 1 (evaluate-conditions.ts creation)
- **Issue:** Plan's interface used `period?: number` directly on `StrategyCondition`, but actual type is `params: Record<string, number>`. Also plan used `cond.value ?? 0` but actual type has `value?: number`.
- **Fix:** Updated `getIndicatorKey` in evaluate-conditions.ts to use `params.period` from `cond.params`. Updated `computeIndicators` to use `cond.params.period ?? 14`.
- **Files modified:** `src/server/services/evaluate-conditions.ts`, `src/server/services/backtest-service.ts`
- **Verification:** All tests pass
- **Committed in:** `778e1ec`, `9fb67e5`

---

**Total deviations:** 2 auto-fixed (both Rule 1 bugs — plan interface incorrect vs actual codebase)
**Impact on plan:** Both fixes essential for correctness. No scope creep.

## Issues Encountered

- Existing backtest-service tests broke after adding `getBrokerProvider().getCandles()` call to `runBacktest()` — old `beforeEach` didn't mock broker. Fixed by adding `mockBroker.getCandles.mockResolvedValue([])` to both `beforeEach` blocks.

## Known Stubs

None — evaluate-conditions.ts is fully implemented. BacktestService.getSignal evaluates real conditions.

## Next Phase Readiness

- BacktestService ready for real backtest runs with actual strategy conditions
- evaluate-conditions.ts available for import by any future service needing condition evaluation
- Plan 12-04 (strategy-card) can build on this foundation

---
*Phase: 12-calculation-correctness*
*Completed: 2026-03-28*

## Self-Check: PASSED

- FOUND: src/server/services/evaluate-conditions.ts
- FOUND: src/__tests__/evaluate-conditions.test.ts
- FOUND: src/server/services/backtest-service.ts
- FOUND: commit 778e1ec
- FOUND: commit 9fb67e5
