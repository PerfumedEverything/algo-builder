---
phase: 09-data-pipeline-overhaul
plan: 07
subsystem: testing
tags: [vitest, indicator-calculator, trading-signals, rsi, sma, ema, accuracy]

# Dependency graph
requires:
  - phase: 09-data-pipeline-overhaul
    provides: IndicatorCalculator with RSI/SMA/EMA via trading-signals library
provides:
  - TRADINGVIEW_REFERENCE hardcoded constants replacing IIFE-computed expected values
  - TRADINGVIEW_VERIFIED flag for human manual verification tracking
  - Verification status test that warns when constants are unverified
affects: [indicator-accuracy tests, DPIPE-02, DPIPE-08]

# Tech tracking
tech-stack:
  added: []
  patterns: [hardcoded reference constants instead of self-computing IIFE expected values in tests]

key-files:
  created: []
  modified:
    - src/__tests__/indicator-accuracy.test.ts

key-decisions:
  - "TRADINGVIEW_REFERENCE values hardcoded as numeric constants computed by IndicatorCalculator — self-consistency test is valid until human verifies against TradingView chart"
  - "TRADINGVIEW_VERIFIED = false flag documents unverified state — test emits console.warn, does not fail"
  - "TradingView does not expose indicator values via API — manual chart reading required for true external validation"

patterns-established:
  - "Reference constants pattern: expected values are hardcoded numbers, not inline formulas — if algorithm changes, tests detect drift"

requirements-completed: [DPIPE-02, DPIPE-08]

# Metrics
duration: 5min
completed: 2026-03-27
---

# Phase 09 Plan 07: Indicator Accuracy Test Hardcoded Reference Constants Summary

**SBER fixture expected values replaced with hardcoded TRADINGVIEW_REFERENCE numeric constants and TRADINGVIEW_VERIFIED flag — tests now detect algorithm drift instead of self-validating via IIFE formulas**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-27T11:11:00Z
- **Completed:** 2026-03-27T11:13:30Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Removed all three IIFE-computed formula blocks (RSI/SMA/EMA) from SBER_FIXTURE.expected
- Added TRADINGVIEW_REFERENCE object with hardcoded numeric constants: rsi14=82.403, sma20=282.86, ema20=283.047
- Added TRADINGVIEW_VERIFIED=false flag with inline comment explaining manual verification steps
- Added verification status test that emits console.warn when unverified
- Renamed describe block from "real SBER data vs TradingView" to "SBER fixture vs TradingView reference values"
- Removed expected property from SBER_FIXTURE — fixture now contains only candles

## Task Commits

Each task was committed atomically:

1. **Task 1: Hardcode TRADINGVIEW_REFERENCE constants and add verification flag** - `e8e6104` (test)

## Files Created/Modified

- `src/__tests__/indicator-accuracy.test.ts` - Replaced IIFE formulas with TRADINGVIEW_REFERENCE hardcoded constants, added TRADINGVIEW_VERIFIED flag and verification status test, renamed describe block

## Decisions Made

- TRADINGVIEW_VERIFIED is set to false — values are computed from IndicatorCalculator itself, not manually read from TradingView. This is honest: tests verify internal consistency and will catch algorithm drift. A human must open TradingView MOEX:SBER 1h at 2024-10-17 09:00 to get true external validation values and set the flag to true.
- Values captured by running trading-signals RSI/SMA/EMA on the exact SBER_FIXTURE candles array: RSI(14)=82.40329261632846, SMA(20)=282.86, EMA(20)=283.0468055179628.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 15 indicator accuracy tests pass
- TRADINGVIEW_REFERENCE constants are stable — any future change to IndicatorCalculator algorithm will cause failures, enabling drift detection
- To complete true external validation: open TradingView MOEX:SBER 1h at 2024-10-17 09:00, compare RSI(14)/SMA(20)/EMA(20) with constants, update values if needed, set TRADINGVIEW_VERIFIED = true

---
*Phase: 09-data-pipeline-overhaul*
*Completed: 2026-03-27*
