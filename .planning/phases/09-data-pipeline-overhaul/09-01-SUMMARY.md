---
phase: 09-data-pipeline-overhaul
plan: 01
subsystem: indicator-calculator
tags: [indicators, trading-signals, migration, warmup, tests]
dependency_graph:
  requires: []
  provides: [trading-signals-indicators, warmup-candle-range]
  affects: [strategy-checker, crossing-detector, ai-analysis]
tech_stack:
  added: [trading-signals@7.4.3]
  removed: [technicalindicators]
  patterns: [streaming-indicator-api, isStable-guard, Big.js-to-Number-conversion]
key_files:
  created: []
  modified:
    - src/server/services/indicator-calculator.ts
    - src/server/services/strategy-checker.ts
    - src/__tests__/indicator-calculator.test.ts
    - package.json
    - package-lock.json
decisions:
  - BollingerBands requires period+1 candles for isStable (not period like old library)
  - MACD/BollingerBands/StochasticOscillator getResult() return type includes null — use ! assertion after isStable guard
  - getCandleRangeMs extended: 1m=7d, 5m=14d, 15m=30d, 1h=60d for 500+ warmup guarantee
metrics:
  duration_minutes: 8
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_modified: 5
---

# Phase 09 Plan 01: Migrate IndicatorCalculator to trading-signals Summary

**One-liner:** Replaced abandoned `technicalindicators` (2020) with `trading-signals` streaming API across all 9 indicators, extended strategy checker candle range for 500+ warmup accuracy.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Install trading-signals, remove technicalindicators, rewrite IndicatorCalculator | 8e837f7 | indicator-calculator.ts, package.json |
| 2 | Extend strategy checker warmup range + accuracy tests | c017bd1 | strategy-checker.ts, indicator-calculator.test.ts |
| fix | Add non-null assertions on getResult() for TypeScript strict mode | ef4f1fe | indicator-calculator.ts |

## What Was Built

**IndicatorCalculator (src/server/services/indicator-calculator.ts):**
- All 9 indicators migrated to `trading-signals` streaming API
- RSI, SMA, EMA: `new Indicator(period); candles.forEach(c => ind.add(c.close)); return ind.isStable ? Number(ind.getResult()) : null`
- MACD: `new MACD(new EMA(fast), new EMA(slow), new EMA(signal))` — all 3 constructor args are EMA instances
- BollingerBands: requires `period + 1` candles for `isStable` (one more than old library)
- ATR, Stochastic, VWAP, WilliamsR: streaming OHLCV objects fed to each indicator
- StochasticOscillator result uses `stochK` (not `k` from old library)
- All `getResult()` results wrapped in `Number()` to convert Big.js

**StrategyChecker (src/server/services/strategy-checker.ts):**
- `getCandleRangeMs`: 1m=7 days (2730 candles), 5m=14 days, 15m=30 days, 1h=60 days
- Ensures 500+ candles for all indicator warmup periods

**Tests (src/__tests__/indicator-calculator.test.ts):**
- Added `describe("500+ candle warmup accuracy")` with 9 tests using 600 candles
- All 42 tests pass across both test files

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] BollingerBands needs period+1 for isStable**
- **Found during:** Task 1 (test failure)
- **Issue:** `trading-signals` BollingerBands requires `period + 1` candles (not `period`) to compute standard deviation for the first time
- **Fix:** Updated early return to `candles.length < period + 1` in `calculateBollinger`; updated test from `makeCandles(20)` to `makeCandles(21)` with updated description
- **Files modified:** indicator-calculator.ts, indicator-calculator.test.ts
- **Commit:** 8e837f7 (part of Task 1)

**2. [Rule 3 - Blocking] TypeScript strict mode null errors on getResult()**
- **Found during:** Build verification after Task 2
- **Issue:** `MACD.getResult()`, `BollingerBands.getResult()`, `StochasticOscillator.getResult()` return types include `null` per TypeScript types even though `isStable` guarantees non-null at runtime
- **Fix:** Added `!` non-null assertion on `getResult()!` calls after `isStable` check
- **Files modified:** indicator-calculator.ts
- **Commit:** ef4f1fe

## Acceptance Criteria Verification

- [x] indicator-calculator.ts contains `from "trading-signals"`
- [x] package.json does NOT contain `"technicalindicators"`
- [x] package.json contains `"trading-signals"`
- [x] indicator-calculator.ts contains `new MACD(new EMA(` (MACD uses EMA instances)
- [x] indicator-calculator.ts contains `StochasticOscillator` (not `Stochastic`)
- [x] indicator-calculator.ts contains `.stochK` (not `.k`)
- [x] indicator-calculator.ts contains `Number(` (Big.js conversion)
- [x] indicator-calculator.ts contains `.isStable` (stability guard)
- [x] strategy-checker.ts contains `7 * DAY` for "1m"
- [x] strategy-checker.ts contains `14 * DAY` for "5m"
- [x] strategy-checker.ts contains `30 * DAY` for "15m"
- [x] strategy-checker.ts contains `60 * DAY` for "1h"
- [x] indicator-calculator.test.ts contains describe block `500+ candle warmup accuracy`
- [x] All 42 indicator tests pass
- [x] Build succeeds without errors

## Self-Check: PASSED
